"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { EMARGEMENT_STATUS, SESSION_STATUS } from "../types";

function isSessionClosed(status: string) {
  return (
    status === SESSION_STATUS.TERMINEE || status === SESSION_STATUS.ANNULEE
  );
}

export async function createSlot(
  sessionId: string,
  data: { label: string; date: Date; startTime: string; endTime: string }
) {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  if (isSessionClosed(session.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }

  return prisma.slot.create({
    data: { ...data, trainingSessionId: sessionId },
  });
}

export async function deleteSlot(id: string) {
  const user = await requireOrganisme();

  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { trainingSession: true },
  });
  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  if (isSessionClosed(slot.trainingSession.status)) {
    throw new Error("Impossible de modifier une session clôturée");
  }

  return prisma.slot.delete({ where: { id } });
}

export type ResetSlotsResult =
  { success: true; deleted: number } | { success: false; error: string };

/**
 * Supprime tous les créneaux d'une session pour repartir de zéro. Refusé dès
 * qu'un émargement est enregistré (signé ou absent) : la suppression en
 * cascade effacerait une preuve de présence.
 */
export async function resetSlots(sessionId: string): Promise<ResetSlotsResult> {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  if (isSessionClosed(session.status)) {
    return {
      success: false,
      error: "Impossible de modifier une session clôturée",
    };
  }

  return prisma.$transaction(async (tx) => {
    const recorded = await tx.emargement.count({
      where: {
        slot: { trainingSessionId: sessionId },
        status: { not: EMARGEMENT_STATUS.EN_ATTENTE },
      },
    });
    if (recorded > 0) {
      return {
        success: false as const,
        error: `${recorded} émargement${recorded > 1 ? "s sont déjà enregistrés" : " est déjà enregistré"} sur ces créneaux. Supprimez les créneaux un par un pour garder ceux qui ont été émargés.`,
      };
    }

    const { count } = await tx.slot.deleteMany({
      where: { trainingSessionId: sessionId },
    });
    return { success: true as const, deleted: count };
  });
}
