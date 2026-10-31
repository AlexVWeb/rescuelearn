"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme, getTenantPrisma } from "@/lib/context";
import { assertAttestationsNotSigned } from "@/lib/attestation-signature";
import { ATTESTATION_RESULT, SESSION_STATUS } from "../types";

function isSessionClosed(status: string) {
  return (
    status === SESSION_STATUS.TERMINEE || status === SESSION_STATUS.ANNULEE
  );
}

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

  if (isSessionClosed(session.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }
  await assertAttestationsNotSigned(sessionId);

  return tenant.inscription.create({
    data: { trainingSessionId: sessionId, traineeId },
  });
}

/**
 * Inscrit plusieurs stagiaires d'un coup. Ignore ceux déjà inscrits et
 * refuse si la capacité de la session serait dépassée.
 */
export async function addTraineesToSession(
  sessionId: string,
  traineeIds: string[]
) {
  const uniqueIds = [...new Set(traineeIds)];
  if (uniqueIds.length === 0) return { count: 0 };

  const tenant = await getTenantPrisma();

  const [session, trainees] = await Promise.all([
    tenant.trainingSession.findFirst({
      where: { id: sessionId },
      include: { inscriptions: { select: { traineeId: true } } },
    }),
    tenant.trainee.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    }),
  ]);

  if (!session || trainees.length !== uniqueIds.length)
    throw new Error("Entité introuvable ou non autorisée");

  if (isSessionClosed(session.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }
  await assertAttestationsNotSigned(sessionId);

  const alreadyInscribed = new Set(
    session.inscriptions.map((i) => i.traineeId)
  );
  const toAdd = uniqueIds.filter((id) => !alreadyInscribed.has(id));
  if (toAdd.length === 0) return { count: 0 };

  const remaining = session.maxTrainees - session.inscriptions.length;
  if (toAdd.length > remaining) {
    throw new Error(
      remaining <= 0
        ? "Session complète"
        : `Il ne reste que ${remaining} place${remaining > 1 ? "s" : ""} dans cette session`
    );
  }

  return tenant.inscription.createMany({
    data: toAdd.map((traineeId) => ({
      trainingSessionId: sessionId,
      traineeId,
    })),
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

  if (isSessionClosed(inscription.trainingSession.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }
  await assertAttestationsNotSigned(inscription.trainingSessionId);

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

  if (isSessionClosed(inscription.trainingSession.status)) {
    throw new Error("Impossible de modifier une session clôturée");
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

  if (isSessionClosed(inscription.trainingSession.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }
  await assertAttestationsNotSigned(inscription.trainingSessionId);

  return prisma.inscription.update({
    where: { id: inscriptionId },
    data: {
      attestationResult: result,
      attestationValidatedAt: new Date(),
    },
  });
}

export async function updateAttestationResults(
  sessionId: string,
  inscriptionIds: string[],
  result: (typeof ATTESTATION_RESULT)[keyof typeof ATTESTATION_RESULT]
) {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.organismeId !== user.organismeId) {
    throw new Error("Session introuvable ou non autorisée");
  }

  if (isSessionClosed(session.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }
  await assertAttestationsNotSigned(sessionId);

  if (inscriptionIds.length === 0) return { count: 0 };

  // Le filtre sur la session empêche de toucher aux inscriptions d'une autre session
  return prisma.inscription.updateMany({
    where: { id: { in: inscriptionIds }, trainingSessionId: sessionId },
    data: {
      attestationResult: result,
      attestationValidatedAt: new Date(),
    },
  });
}
