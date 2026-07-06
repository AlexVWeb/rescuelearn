"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme, getTenantPrisma } from "@/lib/context";
import { ATTESTATION_RESULT } from "../types";

export async function addTraineeToSession(
  sessionId: string,
  traineeId: string
) {
  const tenant = await getTenantPrisma();

  // Les findFirst ici sont automatiquement filtrés par organismeId via l'extension
  const [session, trainee] = await Promise.all([
    tenant.trainingSession.findFirst({ where: { id: sessionId } }),
    tenant.trainee.findFirst({ where: { id: traineeId } }),
  ]);

  if (!session || !trainee)
    throw new Error("Entité introuvable ou non autorisée");

  return tenant.inscription.create({
    data: { trainingSessionId: sessionId, traineeId },
  });
}

export async function removeTraineeFromSession(inscriptionId: string) {
  const user = await requireOrganisme();

  // Inscription n'est pas encore filtré automatiquement par l'extension car il n'a pas d'organismeId
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
    data: {
      attestationResult: result,
      attestationValidatedAt: new Date(),
    },
  });
}
