"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { parseDateMap } from "@/lib/welcome-kit";
import { loadWelcome } from "@/lib/welcome-kit-service";
import { getTraineeInscription, requireTrainee } from "@/lib/trainee-session";

// Kit d'accueil depuis l'espace stagiaire : checklist, CGV, pré-lectures.

export type ActionResult = { ok: true } | { ok: false; error: string };
type UrlResult = { ok: true; url: string } | { ok: false; error: string };

const NOT_FOUND = { ok: false, error: "Formation introuvable." } as const;
const MAX_USER_AGENT = 512;

async function findInscription(inscriptionId: string) {
  const access = await requireTrainee();
  return getTraineeInscription(access, inscriptionId);
}

function sessionPath(inscriptionId: string) {
  return `/espace/sessions/${inscriptionId}`;
}

export async function toggleChecklistItem(
  inscriptionId: string,
  itemId: string,
  done: boolean
): Promise<ActionResult> {
  const inscription = await findInscription(inscriptionId);
  if (!inscription) return NOT_FOUND;

  const welcome = await loadWelcome(inscription.trainingSession);
  if (!welcome.checklist.some((item) => item.id === itemId)) {
    return { ok: false, error: "Élément introuvable." };
  }

  // Idempotent : recocher garde la première date, décocher un absent ne fait rien
  const checklistDone = parseDateMap(inscription.checklistDone);
  if (done && !checklistDone[itemId]) {
    checklistDone[itemId] = new Date().toISOString();
  } else if (!done) {
    delete checklistDone[itemId];
  }

  await prisma.inscription.update({
    where: { id: inscription.id },
    data: { checklistDone },
  });
  revalidatePath(sessionPath(inscription.id));
  return { ok: true };
}

export async function acceptTerms(
  inscriptionId: string
): Promise<{ ok: true; acceptedAt: string } | { ok: false; error: string }> {
  const inscription = await findInscription(inscriptionId);
  if (!inscription) return NOT_FOUND;

  if (inscription.termsAcceptedAt) {
    return { ok: true, acceptedAt: inscription.termsAcceptedAt.toISOString() };
  }

  const { terms } = await loadWelcome(inscription.trainingSession);
  if (!terms) return { ok: false, error: "Aucune condition à accepter." };

  const acceptedAt = new Date();
  const userAgent = (await headers()).get("user-agent") ?? "";
  // Garde sur termsAcceptedAt : deux clics simultanés ne remplacent pas la
  // première acceptation, qui fait foi
  const { count } = await prisma.inscription.updateMany({
    where: { id: inscription.id, termsAcceptedAt: null },
    data: {
      termsAcceptedAt: acceptedAt,
      termsVersion: terms.version,
      termsFileKey: terms.fileKey,
      termsAcceptedIp: await getClientIp(),
      termsAcceptedUa: userAgent.slice(0, MAX_USER_AGENT),
    },
  });

  if (count === 0) {
    const current = await prisma.inscription.findUnique({
      where: { id: inscription.id },
      select: { termsAcceptedAt: true },
    });
    if (current?.termsAcceptedAt) {
      return { ok: true, acceptedAt: current.termsAcceptedAt.toISOString() };
    }
    return { ok: false, error: "Acceptation impossible, réessayez." };
  }

  revalidatePath(sessionPath(inscription.id));
  return { ok: true, acceptedAt: acceptedAt.toISOString() };
}

/** Le PDF accepté fait foi ; à défaut, la version courante. */
export async function getTermsDownloadUrl(
  inscriptionId: string
): Promise<UrlResult> {
  const inscription = await findInscription(inscriptionId);
  if (!inscription) return NOT_FOUND;

  let fileKey = inscription.termsFileKey;
  if (!fileKey) {
    const { terms } = await loadWelcome(inscription.trainingSession);
    fileKey = terms?.fileKey ?? null;
  }
  if (!fileKey) return { ok: false, error: "Aucune condition à lire." };

  const { getPresignedUrl } = await import("@/lib/r2");
  const url = await getPresignedUrl(
    fileKey,
    5 * 60,
    "Conditions générales.pdf"
  );
  return { ok: true, url };
}

export async function getPreReadDownloadUrl(
  inscriptionId: string,
  source: "kit" | "session",
  documentId: string
): Promise<UrlResult> {
  const inscription = await findInscription(inscriptionId);
  if (!inscription) return NOT_FOUND;

  // Recherche dans les pré-lectures de CETTE session : garantit organisme et
  // type (kit) ou session et kind=preparation (session)
  const { preReads } = await loadWelcome(inscription.trainingSession);
  const document = preReads.find(
    (doc) => doc.source === source && doc.id === documentId
  );
  if (!document) return { ok: false, error: "Document introuvable." };
  if (document.visibleFrom && document.visibleFrom > new Date()) {
    return { ok: false, error: "Document pas encore disponible." };
  }

  const extension = document.fileKey.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  const { getPresignedUrl } = await import("@/lib/r2");
  const url = await getPresignedUrl(
    document.fileKey,
    5 * 60,
    `${document.title}${extension}`
  );

  const opened = parseDateMap(inscription.prereadOpenedAt);
  if (!opened[document.id]) {
    opened[document.id] = new Date().toISOString();
    await prisma.inscription.update({
      where: { id: inscription.id },
      data: { prereadOpenedAt: opened },
    });
    revalidatePath(sessionPath(inscription.id));
  }

  return { ok: true, url };
}
