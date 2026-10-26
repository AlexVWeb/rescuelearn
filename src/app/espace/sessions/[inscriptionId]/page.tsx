import dayjs from "dayjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
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
import { getTraineeInscription, requireTrainee } from "@/lib/trainee-session";
import { EspaceHeader } from "../../components/espace-header";
import {
  formatFileSize,
  formatSessionDates,
  formatSlotDay,
  formatTimeLabel,
} from "../../lib/format";
import { AttestationCard } from "./components/attestation-card";
import { DocumentsList } from "./components/documents-list";
import { EvaluationsCard } from "./components/evaluations-card";
import { SignSlotCard } from "./components/sign-slot-card";
import { SlotList } from "./components/slot-list";
import { SlotRefresh } from "./components/slot-refresh";
import type { DocumentView, SlotView } from "./types";
import { visibleEvaluations } from "./evaluations/view";

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
  ] = await Promise.all([
    prisma.slot.findMany({
      where: { trainingSessionId: session.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { emargements: { where: { inscriptionId: inscription.id } } },
    }),
    prisma.sessionDocument.findMany({
      where: {
        trainingSessionId: session.id,
        OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
    }),
    // Prochain document programmé : la page se rafraîchit à son heure
    prisma.sessionDocument.findFirst({
      where: { trainingSessionId: session.id, visibleFrom: { gt: now } },
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

  // Prochaine ouverture ou fermeture de créneau, ou prochain document programmé :
  // la page se rafraîchit à ce moment
  const nextChange = windows
    .flatMap(({ opensAt, closesAt }) => [opensAt, closesAt])
    .concat(nextDocument?.visibleFrom ? [nextDocument.visibleFrom] : [])
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

  return (
    <>
      <EspaceHeader organisme={session.organisme} />
      <SlotRefresh at={nextChange?.toISOString() ?? null} />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          {hasOtherSessions && (
            <Link
              href="/espace"
              className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-sm"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Mes formations
            </Link>
          )}
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <div className="text-muted-foreground space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatSessionDates(session.startDate, session.endDate)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {session.location}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start">
          <div className="space-y-6">
            {currentSlot && (
              <SignSlotCard
                key={currentSlot.id}
                inscriptionId={inscription.id}
                slot={currentSlot}
              />
            )}
            <SlotList slots={slotViews} />
          </div>

          <div className="space-y-6">
            {evaluations.length > 0 && (
              <EvaluationsCard
                inscriptionId={inscription.id}
                evaluations={evaluations}
                remindersEnabled={!inscription.evaluationRemindersOptOut}
              />
            )}
            {documentViews.length > 0 && (
              <DocumentsList
                inscriptionId={inscription.id}
                documents={documentViews}
              />
            )}
            <AttestationCard
              inscriptionId={inscription.id}
              state={attestationState}
            />
          </div>
        </div>
      </main>
    </>
  );
}
