import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import dayjs from "dayjs";

// Lien d'accès à l'espace stagiaire. Le token n'est jamais stocké : seul son
// SHA-256 l'est (Inscription.accessTokenHash). Le token voyage dans le fragment
// de l'URL, qui n'est envoyé ni au serveur ni dans le Referer.

export const ACCESS_PATH = "/espace/acces";
export const ACCESS_VALIDITY_DAYS_AFTER_END = 90;

export type AccessDenial = "revoked" | "anonymized" | "expired";

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAccessToken(token) };
}

/** Empreinte embarquée dans le cookie : change dès que le lien est régénéré. */
export function accessFingerprint(hash: string): string {
  return hash.slice(0, 16);
}

export function buildAccessUrl(baseUrl: string, token: string): string {
  return `${baseUrl}${ACCESS_PATH}#t=${token}`;
}

export function getAccessExpiry(session: {
  startDate: Date | null;
  endDate: Date | null;
}): Date | null {
  const end = session.endDate ?? session.startDate;
  if (!end) return null;
  return dayjs(end)
    .add(ACCESS_VALIDITY_DAYS_AFTER_END, "day")
    .endOf("day")
    .toDate();
}

function sameFingerprint(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * `fingerprint` vaut null lors de l'échange initial du token (le hash vient
 * d'être retrouvé en base), et l'empreinte du cookie ensuite.
 */
export function checkInscriptionAccess(
  inscription: {
    accessTokenHash: string | null;
    trainee: { isAnonymized: boolean };
    trainingSession: { startDate: Date | null; endDate: Date | null };
  },
  fingerprint: string | null,
  now: Date = new Date()
): AccessDenial | null {
  if (!inscription.accessTokenHash) return "revoked";
  if (
    fingerprint !== null &&
    !sameFingerprint(
      accessFingerprint(inscription.accessTokenHash),
      fingerprint
    )
  ) {
    return "revoked";
  }
  if (inscription.trainee.isAnonymized) return "anonymized";

  const expiry = getAccessExpiry(inscription.trainingSession);
  if (expiry && now > expiry) return "expired";

  return null;
}
