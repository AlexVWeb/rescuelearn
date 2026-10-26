import { prisma } from "@/lib/prisma";
import {
  parseChecklist,
  parseDateMap,
  preReadVisibleFrom,
  readiness,
} from "@/lib/welcome-kit";

// Serveur uniquement : charge le kit d'une session et ses pré-lectures.

export interface PreReadDocument {
  id: string;
  source: "kit" | "session";
  title: string;
  size: number;
  fileKey: string;
  mimeType: string;
  visibleFrom: Date | null;
  createdAt: Date;
}

interface SessionRef {
  id: string;
  type: string;
  organismeId: string;
  startDate: Date | null;
}

export async function loadWelcome(session: SessionRef) {
  const [kit, organisme, sessionDocs] = await Promise.all([
    prisma.welcomeKit.findUnique({
      where: {
        organismeId_type: {
          organismeId: session.organismeId,
          type: session.type,
        },
      },
      include: { documents: true },
    }),
    prisma.organisme.findUnique({
      where: { id: session.organismeId },
      select: { termsFileKey: true, termsVersion: true },
    }),
    prisma.sessionDocument.findMany({
      where: { trainingSessionId: session.id, kind: "preparation" },
    }),
  ]);

  const preReads: PreReadDocument[] = [
    ...(kit?.documents ?? []).map((doc) => ({
      id: doc.id,
      source: "kit" as const,
      title: doc.title,
      size: doc.size,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType,
      visibleFrom: preReadVisibleFrom(session.startDate, doc.visibleDaysBefore),
      createdAt: doc.createdAt,
    })),
    ...sessionDocs.map((doc) => ({
      id: doc.id,
      source: "session" as const,
      title: doc.title,
      size: doc.size,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType,
      visibleFrom: doc.visibleFrom,
      createdAt: doc.createdAt,
    })),
  ].sort(
    (a, b) =>
      (a.visibleFrom?.getTime() ?? 0) - (b.visibleFrom?.getTime() ?? 0) ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  return {
    toBring: kit?.toBring ?? null,
    checklist: parseChecklist(kit?.checklist),
    hasTerms: Boolean(organisme?.termsFileKey),
    terms: organisme?.termsFileKey
      ? { fileKey: organisme.termsFileKey, version: organisme.termsVersion }
      : null,
    preReads,
  };
}

/** Kit non vide, CGV ou pré-lecture de session : l'espace a de quoi préparer. */
export async function hasPreparation(
  session: SessionRef & { organisme: { termsFileKey: string | null } }
): Promise<boolean> {
  if (session.organisme.termsFileKey) return true;
  const [kit, preparationDocs] = await Promise.all([
    prisma.welcomeKit.findUnique({
      where: {
        organismeId_type: {
          organismeId: session.organismeId,
          type: session.type,
        },
      },
      include: { _count: { select: { documents: true } } },
    }),
    prisma.sessionDocument.count({
      where: { trainingSessionId: session.id, kind: "preparation" },
    }),
  ]);
  if (preparationDocs > 0) return true;
  return Boolean(
    kit &&
    (kit.toBring?.trim() ||
      parseChecklist(kit.checklist).length > 0 ||
      kit._count.documents > 0)
  );
}

export type WelcomeData = Awaited<ReturnType<typeof loadWelcome>>;

export function inscriptionReadiness(
  welcome: WelcomeData,
  inscription: {
    checklistDone: unknown;
    prereadOpenedAt: unknown;
    termsAcceptedAt: Date | null;
  }
) {
  return readiness({
    checklist: welcome.checklist,
    checklistDone: parseDateMap(inscription.checklistDone),
    hasTerms: welcome.hasTerms,
    termsAccepted: inscription.termsAcceptedAt !== null,
    preReads: welcome.preReads,
    prereadOpened: parseDateMap(inscription.prereadOpenedAt),
  });
}
