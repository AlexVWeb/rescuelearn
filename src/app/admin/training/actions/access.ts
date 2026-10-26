"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import {
  createAccessLink,
  deliverAccess,
  deliverAccessToAll,
} from "@/lib/trainee-access-delivery";
import { hasPreparation } from "@/lib/welcome-kit-service";

async function findOwnInscription(inscriptionId: string) {
  const user = await requireOrganisme();

  // Inscription n'a pas d'organismeId : contrôle via la session
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      trainingSession: { include: { organisme: true } },
      trainee: true,
    },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return inscription;
}

/**
 * Crée un nouveau lien d'accès à l'espace stagiaire. Le token n'est pas
 * stocké : chaque appel régénère le lien et invalide le précédent.
 */
export async function generateAccessLink(inscriptionId: string) {
  const inscription = await findOwnInscription(inscriptionId);

  if (inscription.trainee.isAnonymized) {
    throw new Error("Ce stagiaire a été anonymisé");
  }

  return { url: await createAccessLink(inscription.id) };
}

export async function revokeAccessLink(inscriptionId: string) {
  const inscription = await findOwnInscription(inscriptionId);

  await prisma.inscription.update({
    where: { id: inscription.id },
    data: { accessTokenHash: null },
  });
}

export async function sendAccessLink(inscriptionId: string) {
  const inscription = await findOwnInscription(inscriptionId);
  const session = inscription.trainingSession;
  const outcome = await deliverAccess(inscription, {
    ...session,
    hasPreparation: await hasPreparation(session),
  });

  if (outcome === "missing_email") {
    throw new Error("Ce stagiaire n'a pas d'adresse email");
  }
  if (outcome === "failed") {
    throw new Error("L'email n'a pas pu être envoyé");
  }
}

/**
 * `pending` : stagiaires qui n'ont jamais reçu de lien, ou dont le lien a été
 * révoqué. `all` : tout le monde (les anciens liens ne fonctionnent plus).
 */
export async function sendAccessLinks(
  sessionId: string,
  scope: "pending" | "all"
) {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    include: { organisme: true, inscriptions: { include: { trainee: true } } },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");

  const targets = session.inscriptions.filter(
    (inscription) =>
      scope === "all" ||
      !inscription.accessSentAt ||
      !inscription.accessTokenHash
  );

  return deliverAccessToAll(targets, {
    ...session,
    hasPreparation: await hasPreparation(session),
  });
}
