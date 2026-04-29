"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme, getUserContext } from "./_context";
import { TrainingSessionService } from "../services/session.service";
import type {
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
} from "../types";
import { SESSION_STATUS } from "../types";

export async function getUpcomingSessions() {
  const user = await requireOrganisme();

  return prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
      status: { in: [SESSION_STATUS.PLANIFIEE, SESSION_STATUS.EN_COURS] },
    },
    include: {
      slots: true,
      _count: { select: { inscriptions: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllSessions() {
  const user = await requireOrganisme();

  return prisma.trainingSession.findMany({
    where: { organismeId: user.organismeId },
    include: {
      slots: true,
      _count: { select: { inscriptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMonOrganisme() {
  const user = await requireOrganisme();

  return prisma.organisme.findUnique({
    where: { id: user.organismeId },
  });
}

export async function getSessionDetails(id: string) {
  const user = await requireOrganisme();
  return TrainingSessionService.getSessionById(id, user.organismeId);
}

export async function createTrainingSession(data: CreateTrainingSessionInput) {
  const user = await requireOrganisme();
  return TrainingSessionService.createSession(data, user.organismeId, user.id);
}

export async function updateTrainingSession(
  id: string,
  data: UpdateTrainingSessionInput
) {
  const user = await requireOrganisme();
  return TrainingSessionService.updateSession(id, data, user.organismeId);
}

export async function deleteTrainingSession(id: string) {
  const user = await requireOrganisme();
  return TrainingSessionService.deleteSession(id, user.organismeId);
}

export async function getFormateur() {
  const user = await getUserContext();
  return {
    lastName: user.lastName ?? null,
    firstName: user.firstName ?? null,
  };
}
