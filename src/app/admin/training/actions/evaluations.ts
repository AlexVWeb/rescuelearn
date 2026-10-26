"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import {
  computeAggregates,
  type EvaluationAggregates,
} from "@/lib/evaluation/aggregates";
import { checkEvaluationEligibility } from "@/lib/evaluation/eligibility";
import {
  EVALUATION_TYPE_LABELS,
  EVALUATION_TYPES,
  getCurrentQuestionnaire,
  type EvaluationType,
} from "@/lib/evaluation/questionnaires";
import {
  buildEvaluationQuality,
  type EvaluationQuality,
} from "@/lib/evaluation/quality";
import { parseStoredAnswers } from "@/lib/evaluation/schemas";
import { RESPONSE_STATUS } from "@/lib/evaluation/service";
import {
  getEvaluationWindow,
  getSessionEnd,
  getWindowState,
  type EvaluationWindowState,
} from "@/lib/evaluation/window";

export interface SessionEvaluationSummary {
  type: EvaluationType;
  label: string;
  opensAt: Date;
  closesAt: Date;
  state: EvaluationWindowState;
  aggregates: EvaluationAggregates;
}

/**
 * Synthèse des évaluations d'une session : uniquement des agrégats, jamais
 * de réponse rattachée à un stagiaire. Null pour une session sans créneau.
 */
export async function getSessionEvaluations(
  sessionId: string
): Promise<SessionEvaluationSummary[] | null> {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    select: {
      status: true,
      slots: { select: { date: true, startTime: true, endTime: true } },
      inscriptions: {
        select: {
          trainee: { select: { isAnonymized: true } },
          emargements: { select: { status: true } },
          evaluationResponses: {
            where: { status: RESPONSE_STATUS.SOUMISE },
            select: { type: true, version: true, answers: true },
          },
        },
      },
    },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");

  const sessionEnd = getSessionEnd(session.slots);
  if (!sessionEnd) return null;

  const eligible = session.inscriptions.filter(
    (inscription) =>
      !checkEvaluationEligibility({
        sessionStatus: session.status,
        isAnonymized: inscription.trainee.isAnonymized,
        emargementStatuses: inscription.emargements.map((e) => e.status),
        sessionEnd,
      })
  );

  return EVALUATION_TYPES.map((type) => {
    const questionnaire = getCurrentQuestionnaire(type);
    const window = getEvaluationWindow(type, sessionEnd);
    // Une seule version publiée par type : les réponses d'une autre version
    // ne sont pas mélangées à la synthèse
    const submitted = eligible.flatMap((inscription) =>
      inscription.evaluationResponses
        .filter((r) => r.type === type && r.version === questionnaire.version)
        .map((r) => parseStoredAnswers(questionnaire, r.answers))
    );

    return {
      type,
      label: EVALUATION_TYPE_LABELS[type],
      opensAt: window.opensAt,
      closesAt: window.closesAt,
      state: getWindowState(window),
      aggregates: computeAggregates(questionnaire, submitted, eligible.length),
    };
  });
}

/** Satisfaction par session et synthèse 12 mois de l'organisme. */
export async function getEvaluationQuality(): Promise<EvaluationQuality> {
  const user = await requireOrganisme();
  const sessions = await prisma.trainingSession.findMany({
    where: { organismeId: user.organismeId },
    select: {
      id: true,
      title: true,
      status: true,
      slots: { select: { date: true, startTime: true, endTime: true } },
      inscriptions: {
        select: {
          trainee: { select: { isAnonymized: true } },
          emargements: { select: { status: true } },
          evaluationResponses: {
            where: { status: RESPONSE_STATUS.SOUMISE },
            select: { type: true, version: true, answers: true },
          },
        },
      },
    },
  });
  return buildEvaluationQuality(sessions);
}
