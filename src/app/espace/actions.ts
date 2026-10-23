"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EMARGEMENT_STATUS, SESSION_STATUS } from "@/app/admin/training/types";
import { markEmargementSigned } from "@/lib/emargement-sign";
import { prisma } from "@/lib/prisma";
import {
  assertNotRateLimited,
  getClientIp,
  RateLimitError,
  registerFailure,
} from "@/lib/rate-limit";
import {
  accessFingerprint,
  checkInscriptionAccess,
  hashAccessToken,
  type AccessDenial,
} from "@/lib/trainee-access";
import {
  formatParisTime,
  getSlotState,
  getSlotWindow,
} from "@/lib/slot-window";
import {
  clearTraineeCookie,
  getTraineeInscription,
  requireTrainee,
  setTraineeCookie,
} from "@/lib/trainee-session";

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: AccessDenial | "invalid" | "rate_limited" };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function redeemAccessToken(token: string): Promise<RedeemResult> {
  const rule = {
    key: `espace:token:${await getClientIp()}`,
    max: 20,
    windowSeconds: 15 * 60,
  };
  try {
    await assertNotRateLimited(rule);
  } catch (err) {
    if (err instanceof RateLimitError)
      return { ok: false, reason: "rate_limited" };
    throw err;
  }

  const hash = TOKEN_PATTERN.test(token) ? hashAccessToken(token) : null;
  const inscription = hash
    ? await prisma.inscription.findUnique({
        where: { accessTokenHash: hash },
        include: { trainee: true, trainingSession: true },
      })
    : null;

  if (!hash || !inscription) {
    await registerFailure(rule);
    return { ok: false, reason: "invalid" };
  }

  const denial = checkInscriptionAccess(inscription, null);
  if (denial) return { ok: false, reason: denial };

  await prisma.inscription.update({
    where: { id: inscription.id },
    data: { accessLastUsedAt: new Date() },
  });
  await setTraineeCookie({
    inscriptionId: inscription.id,
    fp: accessFingerprint(hash),
  });

  return { ok: true };
}

export async function signOutTrainee() {
  await clearTraineeCookie();
  redirect("/espace/lien-invalide?raison=deconnecte");
}

// --- Émargement depuis l'espace stagiaire ---

export type SignResult = { ok: true } | { ok: false; error: string };

const PIN_PATTERN = /^\d{6}$/;
const MAX_PIN_FAILURES = 5;
const PIN_LOCK_MINUTES = 10;

function samePin(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function lockedError(until: Date): SignResult {
  return {
    ok: false,
    error: `Trop d'essais. Réessayez à ${formatParisTime(until)} ou demandez le code à votre formateur.`,
  };
}

/**
 * Le lien identifie le stagiaire ; le PIN affiché en salle prouve sa présence.
 * Verrou par inscription (pas par IP : toute la salle partage souvent la même).
 */
export async function signEmargementFromPortal(
  inscriptionId: string,
  slotId: string,
  pin: string
): Promise<SignResult> {
  const access = await requireTrainee();
  const inscription = await getTraineeInscription(access, inscriptionId);
  if (!inscription) return { ok: false, error: "Formation introuvable." };

  const emargement = await prisma.emargement.findUnique({
    where: { inscriptionId_slotId: { inscriptionId: inscription.id, slotId } },
    include: { slot: true },
  });
  if (!emargement?.validationCode) {
    return {
      ok: false,
      error:
        "L'émargement de ce créneau n'est pas encore ouvert. Attendez que votre formateur affiche le code.",
    };
  }

  // Idempotent : un double envoi sur réseau faible n'est pas une erreur
  if (emargement.status === EMARGEMENT_STATUS.VALIDE) return { ok: true };

  const sessionStatus = inscription.trainingSession.status;
  if (
    sessionStatus === SESSION_STATUS.TERMINEE ||
    sessionStatus === SESSION_STATUS.ANNULEE
  ) {
    return { ok: false, error: "Cette session est clôturée." };
  }

  const state = getSlotState(emargement.slot, emargement.status);
  if (state === "upcoming") {
    const { opensAt } = getSlotWindow(emargement.slot);
    return {
      ok: false,
      error: `L'émargement ouvre à ${formatParisTime(opensAt)}.`,
    };
  }
  if (state === "missed") {
    return {
      ok: false,
      error:
        "Ce créneau est terminé. Si vous étiez présent, signalez-le à votre formateur.",
    };
  }
  if (state === "absent") {
    return {
      ok: false,
      error:
        "Votre formateur vous a indiqué absent sur ce créneau. Adressez-vous à lui s'il s'agit d'une erreur.",
    };
  }

  const now = new Date();
  if (inscription.pinLockedUntil && inscription.pinLockedUntil > now) {
    return lockedError(inscription.pinLockedUntil);
  }

  // Faute de frappe sur le format : pas compté comme un essai
  if (!PIN_PATTERN.test(pin)) {
    return {
      ok: false,
      error: "Saisissez le code à 6 chiffres affiché en salle.",
    };
  }

  if (!samePin(emargement.validationCode, pin)) {
    const { pinFailedCount } = await prisma.inscription.update({
      where: { id: inscription.id },
      data: { pinFailedCount: { increment: 1 } },
      select: { pinFailedCount: true },
    });

    if (pinFailedCount >= MAX_PIN_FAILURES) {
      const until = new Date(now.getTime() + PIN_LOCK_MINUTES * 60 * 1000);
      await prisma.inscription.update({
        where: { id: inscription.id },
        data: { pinFailedCount: 0, pinLockedUntil: until },
      });
      return lockedError(until);
    }

    const remaining = MAX_PIN_FAILURES - pinFailedCount;
    return {
      ok: false,
      error: `Code incorrect. Il vous reste ${remaining} essai${remaining > 1 ? "s" : ""}.`,
    };
  }

  if (inscription.pinFailedCount > 0 || inscription.pinLockedUntil) {
    await prisma.inscription.update({
      where: { id: inscription.id },
      data: { pinFailedCount: 0, pinLockedUntil: null },
    });
  }

  await markEmargementSigned(emargement, "portail");
  revalidatePath(`/espace/sessions/${inscription.id}`);

  return { ok: true };
}

// --- Supports de formation ---

export async function getDocumentDownloadUrl(
  inscriptionId: string,
  documentId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const access = await requireTrainee();
  const inscription = await getTraineeInscription(access, inscriptionId);
  if (!inscription) return { ok: false, error: "Formation introuvable." };

  const document = await prisma.sessionDocument.findFirst({
    where: {
      id: documentId,
      trainingSessionId: inscription.trainingSessionId,
      OR: [{ visibleFrom: null }, { visibleFrom: { lte: new Date() } }],
    },
  });
  if (!document) return { ok: false, error: "Document introuvable." };

  const extension = document.fileKey.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  const { getPresignedUrl } = await import("@/lib/r2");
  const url = await getPresignedUrl(
    document.fileKey,
    5 * 60,
    `${document.title}${extension}`
  );

  return { ok: true, url };
}
