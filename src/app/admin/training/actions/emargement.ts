"use server";

import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "./_context";

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateSlotPin(slotId: string) {
  const user = await requireOrganisme();

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  const pin = generatePin();
  const now = dayjs().toDate();

  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  await prisma.$transaction(
    inscriptions.map((inscription) =>
      prisma.emargement.upsert({
        where: {
          inscriptionId_slotId: { inscriptionId: inscription.id, slotId },
        },
        update: { validationCode: pin, codeSentAt: now },
        create: {
          inscriptionId: inscription.id,
          slotId,
          validationCode: pin,
          codeSentAt: now,
        },
      })
    )
  );

  return pin;
}

export async function generateSessionPin(sessionId: string) {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: { slots: true },
  });

  if (!session || session.organismeId !== user.organismeId) {
    throw new Error("Session introuvable ou non autorisée");
  }

  const pinBySlot = Object.fromEntries(
    session.slots.map((slot) => [slot.id, generatePin()])
  );

  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: sessionId },
  });

  const now = dayjs().toDate();

  await prisma.$transaction(
    inscriptions.flatMap((ins) =>
      session.slots.map((slot) =>
        prisma.emargement.upsert({
          where: {
            inscriptionId_slotId: { inscriptionId: ins.id, slotId: slot.id },
          },
          update: { validationCode: pinBySlot[slot.id], codeSentAt: now },
          create: {
            inscriptionId: ins.id,
            slotId: slot.id,
            validationCode: pinBySlot[slot.id],
            codeSentAt: now,
          },
        })
      )
    )
  );

  return pinBySlot;
}

export async function updateEmargementStatus(
  inscriptionId: string,
  slotId: string,
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

  return prisma.emargement.upsert({
    where: { inscriptionId_slotId: { inscriptionId, slotId } },
    update: { status },
    create: { inscriptionId, slotId, status },
  });
}

export async function bulkUpdateEmargementStatus(
  slotId: string,
  status: string
) {
  const user = await requireOrganisme();

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  return prisma.$transaction(
    inscriptions.map((ins) =>
      prisma.emargement.upsert({
        where: { inscriptionId_slotId: { inscriptionId: ins.id, slotId } },
        update: { status },
        create: { inscriptionId: ins.id, slotId, status },
      })
    )
  );
}
