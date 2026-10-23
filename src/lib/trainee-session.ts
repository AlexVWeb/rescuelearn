import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkInscriptionAccess } from "@/lib/trainee-access";

// Session de l'espace stagiaire : un JWT signé dans un cookie httpOnly limité
// à /espace. Le JWT porte l'empreinte du hash du lien, recomparée à chaque
// requête : régénérer ou révoquer le lien coupe la session immédiatement.

export const TRAINEE_COOKIE = "rl_trainee";
const SESSION_DAYS = 30;

export interface TraineeTokenPayload {
  inscriptionId: string;
  fp: string;
}

// Clé dérivée : un JWT de l'espace stagiaire n'est jamais valide ailleurs
function getSigningKey(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant");
  return createHash("sha256").update(`rl_trainee:${secret}`).digest();
}

export async function signTraineeToken(
  payload: TraineeTokenPayload
): Promise<string> {
  return new SignJWT({ fp: payload.fp })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.inscriptionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSigningKey());
}

export async function verifyTraineeToken(
  jwt: string
): Promise<TraineeTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, getSigningKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.fp !== "string") {
      return null;
    }
    return { inscriptionId: payload.sub, fp: payload.fp };
  } catch {
    return null;
  }
}

export async function setTraineeCookie(payload: TraineeTokenPayload) {
  const cookieStore = await cookies();
  cookieStore.set(TRAINEE_COOKIE, await signTraineeToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/espace",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearTraineeCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: TRAINEE_COOKIE, path: "/espace" });
}

const ACCESS_INCLUDE = {
  trainee: true,
  trainingSession: {
    include: {
      organisme: {
        select: { id: true, name: true, logo: true, email: true, phone: true },
      },
    },
  },
} as const;

export async function getTraineeAccess() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(TRAINEE_COOKIE)?.value;
  if (!jwt) return null;

  const payload = await verifyTraineeToken(jwt);
  if (!payload) return null;

  const inscription = await prisma.inscription.findUnique({
    where: { id: payload.inscriptionId },
    include: ACCESS_INCLUDE,
  });
  if (!inscription) return null;
  if (checkInscriptionAccess(inscription, payload.fp)) return null;

  return inscription;
}

export type TraineeAccess = NonNullable<
  Awaited<ReturnType<typeof getTraineeAccess>>
>;

/** Pour les pages et actions de /espace : jamais d'identifiant venant du client. */
export async function requireTrainee(): Promise<TraineeAccess> {
  const access = await getTraineeAccess();
  if (!access) redirect("/espace/lien-invalide");
  return access;
}

/**
 * Une autre inscription du même stagiaire, si son lien est encore valide.
 * Le cookie ouvre toutes les formations pour lesquelles il a reçu un lien.
 */
export async function getTraineeInscription(
  access: TraineeAccess,
  inscriptionId: string
): Promise<TraineeAccess | null> {
  if (inscriptionId === access.id) return access;

  const inscription = await prisma.inscription.findFirst({
    where: { id: inscriptionId, traineeId: access.traineeId },
    include: ACCESS_INCLUDE,
  });
  if (!inscription || checkInscriptionAccess(inscription, null)) return null;
  return inscription;
}
