"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "./_context";
import { ATTESTATION_RESULT } from "../types";

export async function addTraineeToSession(
  sessionId: string,
  traineeId: string
) {
  const user = await requireOrganisme();

  // Parallélisation des deux requêtes indépendantes
  const [session, trainee] = await Promise.all([
    prisma.trainingSession.findFirst({
      where: { id: sessionId, organismeId: user.organismeId },
    }),
    prisma.trainee.findFirst({
      where: { id: traineeId, organismeId: user.organismeId },
    }),
  ]);

  if (!session || !trainee)
    throw new Error("Entité introuvable ou non autorisée");

  return prisma.inscription.create({
    data: { trainingSessionId: sessionId, traineeId },
  });
}

export async function removeTraineeFromSession(inscriptionId: string) {
  const user = await requireOrganisme();

  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { trainingSession: true },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return prisma.inscription.delete({ where: { id: inscriptionId } });
}

export async function updateInscriptionStatus(
  inscriptionId: string,
  status: string
) {
  const user = await requireOrganisme();

  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { trainingSession: true },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return prisma.inscription.update({
    where: { id: inscriptionId },
    data: { status },
  });
}

export async function updateAttestationResult(
  inscriptionId: string,
  result: (typeof ATTESTATION_RESULT)[keyof typeof ATTESTATION_RESULT]
) {
  await requireOrganisme();
  return prisma.inscription.update({
    where: { id: inscriptionId },
    data: {
      attestationResult: result,
      attestationValidatedAt: new Date(),
    },
  });
}
