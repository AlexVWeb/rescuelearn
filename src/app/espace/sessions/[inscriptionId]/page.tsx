import dayjs from "dayjs";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  formatParisTime,
  getSlotState,
  getSlotWindow,
  SLOT_TIMEZONE,
} from "@/lib/slot-window";
import { getEvaluationContexts } from "@/lib/evaluation/service";
import { getAttestationState } from "@/lib/trainee-attestation";
import { checkInscriptionAccess } from "@/lib/trainee-access";
import {
  isBeforeSession,
  parseDateMap,
  resolveToBring,
} from "@/lib/welcome-kit";
import { inscriptionReadiness, loadWelcome } from "@/lib/welcome-kit-service";
import { getTraineeInscription, requireTrainee } from "@/lib/trainee-session";
import { EspaceHeader } from "../../components/espace-header";
import {
  formatFileSize,
  formatParisDay,
  formatSessionDates,
  formatSlotDay,
  formatTimeLabel,
} from "../../lib/format";
import { AttestationCard } from "./components/attestation-card";
import { Attendance } from "./components/attendance";
import { ContactCard } from "./components/contact-card";
import { EvaluationsCard } from "./components/evaluations-card";
import { NextActionCard } from "./components/next-action-card";
import { PracticalInfo } from "./components/practical-info";
import { PrereadList } from "./components/preread-list";
import { Resources } from "./components/resources";
import { SessionHeading } from "./components/session-heading";
import { SlotRefresh } from "./components/slot-refresh";
import { TermsBlock } from "./components/terms-block";
import type {
  ContactView,
  DocumentView,
  PracticalInfoView,
  PreReadView,
  SlotView,
} from "./types";
import { visibleEvaluations } from "./evaluations/view";
import {
  getNextAction,
  getSessionPhase,
  getSessionStatus,
  shortLocation,
} from "./view-model";

export const dynamic = "force-dynamic";

// Jour calendaire à Paris (plugins utc/timezone chargés par slot-window)
const parisDay = (date: Date) =>
  dayjs(date).tz(SLOT_TIMEZONE).format("YYYY-MM-DD");

export default async function EspaceSessionPage({
  params,
}: {
  params: Promise<{ inscriptionId: string }>;
}) {
  const { inscriptionId } = await params;
  const access = await requireTrainee();
  const inscription = await getTraineeInscription(access, inscriptionId);
  if (!inscription) notFound();

  const session = inscription.trainingSession;
  const now = new Date();

  const [
    slots,
    documents,
    nextDocument,
    otherInscriptions,
    evaluationContexts,
    welcome,
    formateurs,
  ] = await Promise.all([
    prisma.slot.findMany({
      where: { trainingSessionId: session.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { emargements: { where: { inscriptionId: inscription.id } } },
    }),
    prisma.sessionDocument.findMany({
      where: {
        trainingSessionId: session.id,
        kind: "support",
        OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
    }),
    // Prochain document programmé : la page se rafraîchit à son heure
    prisma.sessionDocument.findFirst({
      where: {
        trainingSessionId: session.id,
        kind: "support",
        visibleFrom: { gt: now },
      },
      orderBy: { visibleFrom: "asc" },
      select: { visibleFrom: true },
    }),
    prisma.inscription.findMany({
      where: {
        traineeId: inscription.traineeId,
        accessTokenHash: { not: null },
        id: { not: inscription.id },
      },
      include: { trainee: true, trainingSession: true },
    }),
    getEvaluationContexts(inscription, now),
    loadWelcome(session),
    // Nom seul : pas d'exposition des coordonnées personnelles du formateur
    prisma.trainingSessionFormateur.findMany({
      where: { trainingSessionId: session.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  // Mêmes règles que /espace : sinon « Mes formations » redirigerait ici en boucle
  const hasOtherSessions = otherInscriptions.some(
    (other) => !checkInscriptionAccess(other, null)
  );

  const today = parisDay(now);
  const windows = slots.map((slot) => getSlotWindow(slot));
  const slotViews: SlotView[] = slots.map((slot, index) => {
    const emargement = slot.emargements[0];
    return {
      id: slot.id,
      label: slot.label,
      dayLabel: formatSlotDay(slot.date),
      timeRange: `${formatTimeLabel(slot.startTime)}–${formatTimeLabel(slot.endTime)}`,
      state: getSlotState(slot, emargement?.status, now),
      signedAtLabel: emargement?.validatedAt
        ? formatParisTime(emargement.validatedAt)
        : null,
      opensAtLabel: formatParisTime(windows[index].opensAt),
      isToday: parisDay(windows[index].startsAt) === today,
    };
  });

  // Créneau dont la fenêtre contient l'instant présent : l'action du moment
  const currentIndex = slotViews.findIndex(
    (slot, index) =>
      (slot.state === "open" || slot.state === "signed") &&
      now >= windows[index].opensAt &&
      now <= windows[index].closesAt
  );
  const currentSlot = currentIndex >= 0 ? slotViews[currentIndex] : null;
  const nextSlot = slotViews.find((slot) => slot.state === "upcoming") ?? null;

  // Prochaine ouverture ou fermeture de créneau, ou prochain document programmé :
  // la page se rafraîchit à ce moment
  const nextChange = windows
    .flatMap(({ opensAt, closesAt }) => [opensAt, closesAt])
    .concat(nextDocument?.visibleFrom ? [nextDocument.visibleFrom] : [])
    .concat(welcome.preReads.flatMap((doc) => doc.visibleFrom ?? []))
    .filter((date) => date > now)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const documentViews: DocumentView[] = documents.map((document) => ({
    id: document.id,
    title: document.title,
    sizeLabel: formatFileSize(document.size),
  }));

  const evaluations = visibleEvaluations(evaluationContexts);
  const attestationState = getAttestationState(
    session.attestationsPublishedAt,
    inscription
  );

  // --- Phase et action du moment ---
  const before = isBeforeSession(slots, session.startDate, now);
  const lastClosesAt =
    windows
      .map(({ closesAt }) => closesAt)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const phase = getSessionPhase({
    before,
    lastClosesAt,
    endDate: session.endDate ?? session.startDate,
    now,
  });
  const readiness = inscriptionReadiness(welcome, inscription);
  const action = getNextAction({
    phase,
    currentSlot,
    nextSlot,
    readiness,
    evaluations,
    attestation: attestationState,
  });
  const status = getSessionStatus({
    phase,
    days: [...new Set(windows.map(({ startsAt }) => parisDay(startsAt)))],
    today,
  });

  // --- Kit d'accueil ---
  const prereadOpened = parseDateMap(inscription.prereadOpenedAt);
  const preReadViews: PreReadView[] = welcome.preReads.map((doc) => ({
    id: doc.id,
    source: doc.source,
    title: doc.title,
    sizeLabel: formatFileSize(doc.size),
    availableLabel:
      doc.visibleFrom && doc.visibleFrom > now
        ? formatParisDay(doc.visibleFrom)
        : null,
    opened: doc.id in prereadOpened,
  }));

  const days = new Map<string, string[]>();
  for (const view of slotViews) {
    days.set(view.dayLabel, [
      ...(days.get(view.dayLabel) ?? []),
      view.timeRange,
    ]);
  }
  const practical: PracticalInfoView = {
    location: session.location,
    accessInfo: session.accessInfo,
    days: [...days].map(([dayLabel, ranges]) => ({ dayLabel, ranges })),
    toBring: resolveToBring(welcome.toBring, session.toBringExtra),
  };
  const contact: ContactView = {
    formateurs: formateurs
      .map(({ user }) =>
        [user.firstName, user.lastName].filter(Boolean).join(" ")
      )
      .filter(Boolean),
    organisme: {
      name: session.organisme.name,
      email: session.organisme.email,
      phone: session.organisme.phone,
    },
  };

  // --- Sections, dans l'ordre de lecture sur mobile ---
  const actionCard = action && (
    <NextActionCard
      action={action}
      phase={phase}
      inscriptionId={inscription.id}
      readiness={readiness}
      firstDayLabel={slotViews[0]?.dayLabel ?? null}
      remindersEnabled={!inscription.evaluationRemindersOptOut}
    />
  );
  // L'évaluation mise en avant n'est pas répétée plus bas
  const otherEvaluations = evaluations.filter(
    (view) =>
      action?.kind !== "evaluation" || view.type !== action.evaluation.type
  );
  const evaluationsCard = otherEvaluations.length > 0 && (
    <EvaluationsCard
      inscriptionId={inscription.id}
      evaluations={otherEvaluations}
      remindersEnabled={!inscription.evaluationRemindersOptOut}
      showReminders={action?.kind !== "evaluation"}
    />
  );
  const attestationCard = action?.kind !== "attestation" && (
    <AttestationCard inscriptionId={inscription.id} state={attestationState} />
  );
  const contactCard = <ContactCard contact={contact} />;

  const layout = {
    before: {
      main: (
        <>
          {actionCard}
          {welcome.hasTerms && (
            <TermsBlock
              inscriptionId={inscription.id}
              acceptedAtLabel={
                inscription.termsAcceptedAt
                  ? formatParisDay(inscription.termsAcceptedAt)
                  : null
              }
            />
          )}
          <PracticalInfo info={practical} />
        </>
      ),
      aside: (
        <>
          {preReadViews.length > 0 && (
            <PrereadList
              inscriptionId={inscription.id}
              documents={preReadViews}
            />
          )}
          <Attendance slots={slotViews} before defaultOpen={false} />
          {contactCard}
        </>
      ),
    },
    during: {
      main: (
        <>
          {actionCard}
          <Attendance slots={slotViews} before={false} defaultOpen />
        </>
      ),
      aside: (
        <>
          {evaluationsCard}
          <Resources
            inscriptionId={inscription.id}
            documents={documentViews}
            preReads={preReadViews}
          />
          <PracticalInfo info={practical} compact />
          {attestationCard}
          {contactCard}
        </>
      ),
    },
    after: {
      main: (
        <>
          {actionCard}
          {evaluationsCard}
          {attestationCard}
          <Attendance slots={slotViews} before={false} defaultOpen={false} />
        </>
      ),
      aside: (
        <>
          <Resources
            inscriptionId={inscription.id}
            documents={documentViews}
            preReads={preReadViews}
          />
          {contactCard}
        </>
      ),
    },
  }[phase];

  return (
    <>
      <EspaceHeader organisme={session.organisme} />
      <SlotRefresh at={nextChange?.toISOString() ?? null} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-4 pb-12 sm:space-y-8 sm:px-6 sm:pt-6">
        <SessionHeading
          title={session.title}
          status={status}
          datesLabel={formatSessionDates(session.startDate, session.endDate)}
          place={shortLocation(session.location)}
          showBackLink={hasOtherSessions}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8">
          <div className="space-y-6 lg:space-y-8">{layout.main}</div>
          <div className="space-y-6 lg:space-y-8">{layout.aside}</div>
        </div>
      </main>
    </>
  );
}
