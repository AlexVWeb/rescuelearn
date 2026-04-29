"use server";

import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import { EMARGEMENT_STATUS } from "../types";

export async function getTraineesByPin(pin: string) {
  const emargements = await prisma.emargement.findMany({
    where: { validationCode: pin },
    include: {
      slot: { include: { trainingSession: true } },
      inscription: { include: { trainee: true } },
    },
  });

  if (emargements.length === 0) throw new Error("Code PIN invalide");

  return emargements.map((e) => ({
    emargementId: e.id,
    slotLabel: e.slot.label,
    sessionTitle: e.slot.trainingSession.title,
    traineeId: e.inscription.trainee.id,
    firstName: e.inscription.trainee.firstName,
    lastName: e.inscription.trainee.lastName,
    status: e.status,
  }));
}

export async function validatePresencePublic(emargementId: string) {
  return prisma.emargement.update({
    where: { id: emargementId },
    data: {
      status: EMARGEMENT_STATUS.VALIDE,
      validatedAt: dayjs().toDate(),
    },
  });
}
