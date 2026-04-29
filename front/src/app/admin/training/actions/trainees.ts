"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "./_context";
import {
  computeValidCompetences,
  computeNextExpiry,
} from "../lib/trainee-validity";
import type {
  TraineeListItem,
  TraineeWithHistory,
  SessionType,
  SessionStatus,
} from "../types";

const VALID_SESSION_TYPES = [
  "PSC",
  "PSE1",
  "PSE2",
  "SST",
  "IPS",
  "FF",
  "FPS",
] as const;
const VALID_SESSION_STATUSES = [
  "planifiée",
  "en_cours",
  "terminée",
  "annulée",
] as const;

function asSessionType(value: string): SessionType {
  if (!VALID_SESSION_TYPES.includes(value as SessionType))
    throw new Error(`Unexpected session type: "${value}"`);
  return value as SessionType;
}

function asSessionStatus(value: string): SessionStatus {
  if (!VALID_SESSION_STATUSES.includes(value as SessionStatus))
    throw new Error(`Unexpected session status: "${value}"`);
  return value as SessionStatus;
}

export type TraineeInput = {
  civility?: string | null;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  birthPlace?: string | null;
  address?: string;
};

export async function getAllTrainees(): Promise<TraineeListItem[]> {
  const user = await requireOrganisme();

  const trainees = await prisma.trainee.findMany({
    where: { organismeId: user.organismeId },
    include: {
      _count: { select: { inscriptions: true } },
      inscriptions: {
        where: { status: "présent" },
        include: {
          trainingSession: {
            select: { type: true, startDate: true, isFC: true },
          },
        },
      },
      externalTrainings: {
        select: { type: true, obtainedAt: true, isFC: true },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return trainees.map(({ inscriptions, externalTrainings, ...trainee }) => {
    const validCompetences = computeValidCompetences(
      inscriptions,
      externalTrainings
    );
    const nextExpiryResult = computeNextExpiry(inscriptions, externalTrainings);
    return {
      ...trainee,
      validCompetences,
      nextExpiry: nextExpiryResult?.expiryDate.toISOString() ?? null,
      nextExpiryType: nextExpiryResult?.type ?? null,
    };
  }) as TraineeListItem[];
}

export async function getTraineeWithHistory(
  id: string
): Promise<TraineeWithHistory | null> {
  const user = await requireOrganisme();

  const raw = await prisma.trainee.findUnique({
    where: { id, organismeId: user.organismeId },
    include: {
      inscriptions: {
        include: { trainingSession: true },
        orderBy: { trainingSession: { startDate: "desc" } },
      },
      externalTrainings: { orderBy: { obtainedAt: "desc" } },
    },
  });

  if (!raw) return null;

  return {
    ...raw,
    inscriptions: raw.inscriptions.map((inscription) => ({
      ...inscription,
      trainingSession: {
        ...inscription.trainingSession,
        type: asSessionType(inscription.trainingSession.type),
        status: asSessionStatus(inscription.trainingSession.status),
      },
    })),
  };
}

export async function createTrainee(data: TraineeInput) {
  const user = await requireOrganisme();
  return prisma.trainee.create({
    data: { ...data, organismeId: user.organismeId },
  });
}

export async function updateTrainee(id: string, data: TraineeInput) {
  const user = await requireOrganisme();

  const trainee = await prisma.trainee.findFirst({
    where: { id, organismeId: user.organismeId },
  });
  if (!trainee) throw new Error("Stagiaire introuvable");

  return prisma.trainee.update({ where: { id }, data });
}

export async function deleteTrainee(id: string) {
  const user = await requireOrganisme();

  const trainee = await prisma.trainee.findFirst({
    where: { id, organismeId: user.organismeId },
  });
  if (!trainee) throw new Error("Stagiaire introuvable");

  return prisma.trainee.delete({ where: { id } });
}

export async function importAndEnrollTrainees(
  sessionId: string,
  data: TraineeInput[]
): Promise<{
  created: number;
  enrolled: number;
  skipped: number;
  errors: string[];
}> {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  let created = 0,
    enrolled = 0,
    skipped = 0;
  const errors: string[] = [];

  for (const traineeData of data) {
    try {
      let trainee;
      if (traineeData.email) {
        trainee = await prisma.trainee.findFirst({
          where: { email: traineeData.email, organismeId: user.organismeId },
        });
      }

      if (!trainee) {
        trainee = await prisma.trainee.create({
          data: { ...traineeData, organismeId: user.organismeId },
        });
        created++;
      }

      const existingInscription = await prisma.inscription.findUnique({
        where: {
          traineeId_trainingSessionId: {
            traineeId: trainee.id,
            trainingSessionId: sessionId,
          },
        },
      });

      if (existingInscription) {
        skipped++;
      } else {
        await prisma.inscription.create({
          data: { traineeId: trainee.id, trainingSessionId: sessionId },
        });
        enrolled++;
      }
    } catch {
      errors.push(`${traineeData.firstName} ${traineeData.lastName}`);
    }
  }

  return { created, enrolled, skipped, errors };
}
