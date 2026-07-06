"use server";

import { randomInt } from "node:crypto";
import dayjs from "dayjs";
import { requireOrganisme, getTenantPrisma } from "@/lib/context";
import { Inscription, Slot } from "@prisma/client";

function generatePin() {
  return randomInt(100000, 1000000).toString();
}

export async function generateSlotPin(slotId: string) {
  const user = await requireOrganisme();
  const tenant = await getTenantPrisma();

  // On cherche le créneau. L'extension filtrera la session d'entraînement par organismeId
  const slot = await tenant.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  // Si l'extension fonctionne sur trainingSession via l'include,
  // slot.trainingSession sera null ou l'include échouera si l'organisme ne correspond pas.
  // Par sécurité et clarté, on garde la vérification explicite.
  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  const pin = generatePin();
  const now = dayjs().toDate();

  const inscriptions = await tenant.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  await tenant.$transaction(
    inscriptions.map((inscription: Inscription) =>
      tenant.emargement.upsert({
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
  const tenant = await getTenantPrisma();

  const session = await tenant.trainingSession.findUnique({
    where: { id: sessionId },
    include: { slots: true },
  });

  if (!session || session.organismeId !== user.organismeId) {
    throw new Error("Session introuvable ou non autorisée");
  }

  const pinBySlot = Object.fromEntries(
    session.slots.map((slot: Slot) => [slot.id, generatePin()])
  );

  const inscriptions = await tenant.inscription.findMany({
    where: { trainingSessionId: sessionId },
  });

  const now = dayjs().toDate();

  await tenant.$transaction(
    inscriptions.flatMap((ins: Inscription) =>
      session.slots.map((slot: Slot) =>
        tenant.emargement.upsert({
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
  const tenant = await getTenantPrisma();

  const inscription = await tenant.inscription.findUnique({
    where: { id: inscriptionId },
    include: { trainingSession: true },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return tenant.emargement.upsert({
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
  const tenant = await getTenantPrisma();

  const slot = await tenant.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  const inscriptions = await tenant.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  return tenant.$transaction(
    inscriptions.map((ins: Inscription) =>
      tenant.emargement.upsert({
        where: { inscriptionId_slotId: { inscriptionId: ins.id, slotId } },
        update: { status },
        create: { inscriptionId: ins.id, slotId, status },
      })
    )
  );
}
