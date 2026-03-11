"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getUserContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Non autorisé");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      organismeId: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) throw new Error("Utilisateur introuvable");
  return user as typeof user & { organismeId: string | null };
}

export async function getUpcomingSessions() {
  const user = await getUserContext();
  if (!user.organismeId) return [];

  return prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
      status: { in: ["planifiée", "en_cours"] },
    },
    include: {
      slots: true,
      _count: {
        select: { inscriptions: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllSessions() {
  const user = await getUserContext();
  if (!user.organismeId) return [];

  return prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
    },
    include: {
      slots: true,
      _count: {
        select: { inscriptions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMonOrganisme() {
  const user = await getUserContext();
  if (!user.organismeId) return null;

  return prisma.organisme.findUnique({
    where: { id: user.organismeId },
  });
}

export async function getAllTrainees() {
  const user = await getUserContext();
  if (!user.organismeId) return [];

  return prisma.trainee.findMany({
    where: {
      organismeId: user.organismeId,
    },
    include: {
      _count: {
        select: { inscriptions: true },
      },
    },
    orderBy: { lastName: "asc" },
  });
}

import { TrainingSessionService } from "./services/session.service";
import {
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
} from "./types";

export async function createTrainingSession(data: CreateTrainingSessionInput) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.createSession(data, user.organismeId, user.id);
}

export async function updateTrainingSession(
  id: string,
  data: UpdateTrainingSessionInput
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.updateSession(id, data, user.organismeId);
}

export async function deleteTrainingSession(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.deleteSession(id, user.organismeId);
}

export async function createTrainee(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
}) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return prisma.trainee.create({
    data: {
      ...data,
      organismeId: user.organismeId,
    },
  });
}

export async function updateTrainee(
  id: string,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
  }
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify ownership
  const trainee = await prisma.trainee.findFirst({
    where: { id, organismeId: user.organismeId },
  });
  if (!trainee) throw new Error("Stagiaire introuvable");

  return prisma.trainee.update({
    where: { id },
    data,
  });
}

export async function deleteTrainee(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const trainee = await prisma.trainee.findFirst({
    where: { id, organismeId: user.organismeId },
  });
  if (!trainee) throw new Error("Stagiaire introuvable");

  return prisma.trainee.delete({
    where: { id },
  });
}

export async function getSessionDetails(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.getSessionById(id, user.organismeId);
}

// ========================
// SLOTS
// ========================

export async function createSlot(
  sessionId: string,
  data: { label: string; date: Date; startTime: string; endTime: string }
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify session ownership
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  return prisma.slot.create({
    data: {
      ...data,
      trainingSessionId: sessionId,
    },
  });
}

export async function deleteSlot(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Ensure slot belongs to a session of this organisme
  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { trainingSession: true },
  });
  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  return prisma.slot.delete({ where: { id } });
}

// ========================
// INSCRIPTIONS
// ========================

export async function addTraineeToSession(
  sessionId: string,
  traineeId: string
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify ownership of both session and trainee
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  const trainee = await prisma.trainee.findFirst({
    where: { id: traineeId, organismeId: user.organismeId },
  });

  if (!session || !trainee)
    throw new Error("Entité introuvable ou non autorisée");

  return prisma.inscription.create({
    data: {
      trainingSessionId: sessionId,
      traineeId,
    },
  });
}

export async function removeTraineeFromSession(inscriptionId: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

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
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

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

// ========================
// EMARGEMENT
// ========================

export async function generateSlotPin(slotId: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  // Generate 6 digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  // We need to fetch all inscriptions for this session and create/update Emargement for this slot
  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  // Transaction for batch upsert
  await prisma.$transaction(
    inscriptions.map((inscription: { id: string }) =>
      prisma.emargement.upsert({
        where: {
          inscriptionId_slotId: {
            inscriptionId: inscription.id,
            slotId: slot.id,
          },
        },
        update: { validationCode: pin, codeSentAt: new Date() },
        create: {
          inscriptionId: inscription.id,
          slotId: slot.id,
          validationCode: pin,
          codeSentAt: new Date(),
        },
      })
    )
  );
  return pin;
}

export async function updateEmargementStatus(
  inscriptionId: string,
  slotId: string,
  status: string
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

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
    where: {
      inscriptionId_slotId: { inscriptionId, slotId },
    },
    update: { status },
    create: {
      inscriptionId,
      slotId,
      status,
    },
  });
}

// ========================
// PUBLIC VALIDATION
// ========================

export async function getTraineesByPin(pin: string) {
  const emargements = await prisma.emargement.findMany({
    where: { validationCode: pin },
    include: {
      slot: { include: { trainingSession: true } },
      inscription: { include: { trainee: true } },
    },
  });

  if (emargements.length === 0) {
    throw new Error("Code PIN invalide");
  }

  return emargements.map((e: any) => ({
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
      status: "validé",
      validatedAt: new Date(),
    },
  });
}
