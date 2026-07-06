import { prisma } from "@/lib/prisma";
import {
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
} from "../types";

export class TrainingSessionService {
  static async createSession(
    data: CreateTrainingSessionInput,
    organismeId: string,
    formateurId: string
  ) {
    return prisma.trainingSession.create({
      data: {
        ...data,
        organismeId,
        formateurId,
      },
    });
  }

  static async updateSession(
    id: string,
    data: UpdateTrainingSessionInput,
    organismeId: string
  ) {
    const session = await prisma.trainingSession.findFirst({
      where: { id, organismeId },
    });
    if (!session) throw new Error("Session introuvable");

    return prisma.trainingSession.update({
      where: { id },
      data,
    });
  }

  static async deleteSession(id: string, organismeId: string) {
    const session = await prisma.trainingSession.findFirst({
      where: { id, organismeId },
    });
    if (!session) throw new Error("Session introuvable");

    return prisma.trainingSession.delete({
      where: { id },
    });
  }

  static async getSessionById(id: string, organismeId: string) {
    const session = await prisma.trainingSession.findFirst({
      where: { id, organismeId },
      include: {
        slots: {
          orderBy: { date: "asc" },
        },
        inscriptions: {
          include: {
            trainee: true,
            emargements: true,
          },
        },
      },
    });

    if (!session) throw new Error("Session introuvable");
    return session;
  }
}
