import { Prisma } from "@prisma/client";
import { SESSION_STATUS } from "@/app/admin/training/types";
import { formatParisDay, formatSessionDates } from "@/app/espace/lib/format";
import { EmailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { activeModuleWhere } from "@/lib/organisme-modules/service";
import { buildAccessUrl, generateAccessToken } from "@/lib/trainee-access";
import { getBaseUrl } from "@/lib/utils";
import { checkEvaluationEligibility } from "./eligibility";
import {
  EVALUATION_TYPES,
  getCurrentQuestionnaire,
  type EvaluationType,
} from "./questionnaires";
import { RESPONSE_STATUS } from "./service";
import {
  EVALUATION_SCHEDULE,
  getDueReminderKind,
  getEvaluationWindow,
  getSessionEnd,
  isReminderCovered,
  reminderKinds,
} from "./window";

// Invitations et rappels des évaluations, envoyés par le cron quotidien.
// Seuls les stagiaires dont le lien d'accès est actif sont relancés : un lien
// révoqué par le formateur, ou jamais créé, n'est pas recréé par un rappel.

const SEND_CONCURRENCY = 5;
// Fenêtre à froid la plus tardive, plus une marge pour les sessions sur plusieurs jours
const LOOKBACK_DAYS = EVALUATION_SCHEDULE.froid.closesAfterDays + 10;

export interface ReminderRunResult {
  sent: number;
  failed: number;
  skipped: number;
}

interface ReminderJob {
  inscriptionId: string;
  type: EvaluationType;
  kind: string;
  closesAt: Date;
  email: string;
  firstName: string | null;
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    endDate: Date | null;
    organisme: {
      name: string;
      smtpHost: string | null;
      smtpPort: number | null;
      smtpUser: string | null;
      smtpPassword: string | null;
      smtpFrom: string | null;
      smtpSecure: boolean;
    };
  };
}

async function findCandidateSessions(now: Date) {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return prisma.trainingSession.findMany({
    where: {
      status: { not: SESSION_STATUS.ANNULEE },
      slots: { some: { date: { gte: since } } },
      // Module désactivé : invitations et relances suspendues, reprise à la réactivation
      organisme: activeModuleWhere("evaluation"),
    },
    select: {
      status: true,
      title: true,
      location: true,
      startDate: true,
      endDate: true,
      organisme: {
        select: {
          name: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          smtpPassword: true,
          smtpFrom: true,
          smtpSecure: true,
        },
      },
      slots: { select: { date: true, startTime: true, endTime: true } },
      inscriptions: {
        where: {
          accessTokenHash: { not: null },
          evaluationRemindersOptOut: false,
        },
        select: {
          id: true,
          trainee: {
            select: { email: true, firstName: true, isAnonymized: true },
          },
          emargements: { select: { status: true } },
          evaluationResponses: { select: { type: true, status: true } },
          evaluationReminders: { select: { kind: true } },
        },
      },
    },
  });
}

type CandidateSession = Awaited<
  ReturnType<typeof findCandidateSessions>
>[number];

/** Envois dus pour une session, sans effet de bord : testable isolément. */
export function planReminders(
  session: CandidateSession,
  now: Date
): ReminderJob[] {
  const sessionEnd = getSessionEnd(session.slots);
  if (!sessionEnd) return [];

  const jobs: ReminderJob[] = [];
  for (const type of EVALUATION_TYPES) {
    const kind = getDueReminderKind(type, sessionEnd, now);
    if (!kind) continue;
    const { closesAt } = getEvaluationWindow(type, sessionEnd);

    for (const inscription of session.inscriptions) {
      const { trainee } = inscription;
      if (!trainee.email) continue;
      const denial = checkEvaluationEligibility({
        sessionStatus: session.status,
        isAnonymized: trainee.isAnonymized,
        emargementStatuses: inscription.emargements.map((e) => e.status),
        sessionEnd,
      });
      if (denial) continue;

      const submitted = inscription.evaluationResponses.some(
        (r) => r.type === type && r.status === RESPONSE_STATUS.SOUMISE
      );
      if (submitted) continue;

      const sentKinds = inscription.evaluationReminders.map((r) => r.kind);
      if (isReminderCovered(type, kind, sentKinds)) continue;

      jobs.push({
        inscriptionId: inscription.id,
        type,
        kind,
        closesAt,
        email: trainee.email,
        firstName: trainee.firstName,
        session,
      });
    }
  }
  return jobs;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * La ligne d'envoi est posée avant l'email : deux crons concurrents ne
 * doublent pas l'envoi. Si l'email échoue, elle est retirée pour réessayer
 * au prochain passage.
 */
async function sendReminder(
  job: ReminderJob
): Promise<"sent" | "failed" | "skipped"> {
  let reminderId: string;
  try {
    const reminder = await prisma.evaluationReminder.create({
      data: { inscriptionId: job.inscriptionId, kind: job.kind },
      select: { id: true },
    });
    reminderId = reminder.id;
  } catch (error) {
    if (isUniqueViolation(error)) return "skipped";
    throw error;
  }

  try {
    // Le token n'est pas stocké : un nouveau lien est nécessaire. Il ne
    // remplace l'ancien qu'une fois l'email accepté : un envoi en échec ne
    // laisse jamais le stagiaire sans lien valide.
    const { token, hash } = generateAccessToken();
    const accessUrl = buildAccessUrl(getBaseUrl(), token);
    const { organisme } = job.session;
    const result = await EmailService.sendEvaluationInvitation({
      to: job.email,
      firstName: job.firstName,
      organismeName: organisme.name,
      sessionTitle: job.session.title,
      sessionDates: formatSessionDates(
        job.session.startDate,
        job.session.endDate
      ),
      sessionLocation: job.session.location,
      accessUrl,
      evaluation: job.type,
      isReminder: job.kind !== reminderKinds(job.type)[0],
      closesAtLabel: formatParisDay(job.closesAt),
      estimatedMinutes: getCurrentQuestionnaire(job.type).estimatedMinutes,
      smtp: {
        host: organisme.smtpHost,
        port: organisme.smtpPort,
        user: organisme.smtpUser,
        pass: organisme.smtpPassword,
        from: organisme.smtpFrom,
        secure: organisme.smtpSecure,
      },
    });
    if (!result.success) throw new Error(result.error);

    // Condition sur le lien actif : une révocation par le formateur pendant
    // l'envoi n'est pas annulée par le rappel
    await prisma.inscription.updateMany({
      where: { id: job.inscriptionId, accessTokenHash: { not: null } },
      data: {
        accessTokenHash: hash,
        accessSentAt: new Date(),
        accessLastUsedAt: null,
      },
    });
    return "sent";
  } catch (error) {
    logger.error("Rappel d'évaluation non envoyé", error);
    await prisma.evaluationReminder
      .delete({ where: { id: reminderId } })
      .catch(() => undefined);
    return "failed";
  }
}

export async function runEvaluationReminders(
  now: Date = new Date()
): Promise<ReminderRunResult> {
  const sessions = await findCandidateSessions(now);
  const jobs = sessions.flatMap((session) => planReminders(session, now));

  const outcomes: ("sent" | "failed" | "skipped")[] = [];
  for (let i = 0; i < jobs.length; i += SEND_CONCURRENCY) {
    outcomes.push(
      ...(await Promise.all(
        jobs.slice(i, i + SEND_CONCURRENCY).map(sendReminder)
      ))
    );
  }

  return {
    sent: outcomes.filter((o) => o === "sent").length,
    failed: outcomes.filter((o) => o === "failed").length,
    skipped: outcomes.filter((o) => o === "skipped").length,
  };
}
