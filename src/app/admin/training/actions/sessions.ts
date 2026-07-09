"use server";

import {
  requireOrganisme,
  getUserContext,
  getTenantPrisma,
} from "@/lib/context";
import { TrainingSessionService } from "../services/session.service";
import type {
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
} from "../types";
import { SESSION_STATUS } from "../types";

export async function getUpcomingSessions() {
  const tenant = await getTenantPrisma();

  return tenant.trainingSession.findMany({
    where: {
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
  const tenant = await getTenantPrisma();

  return tenant.trainingSession.findMany({
    include: {
      slots: true,
      _count: { select: { inscriptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMonOrganisme() {
  const tenant = await getTenantPrisma();

  return tenant.organisme.findUnique({
    where: { id: "current" }, // L'ID sera ignoré et remplacé par organismeId par l'extension
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
