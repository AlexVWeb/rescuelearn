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
        formateurs: { create: { userId: formateurId } },
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

    const isClosed =
      session.status === "terminée" || session.status === "annulée";

    if (isClosed) {
      // Si la session est clôturée, on vérifie qu'aucun autre champ significatif n'a été modifié
      // Fonction helper pour comparer deux dates au niveau du jour (YYYY-MM-DD) ou nullité
      const areDatesEqual = (
        d1: Date | null | undefined,
        d2: Date | null | undefined
      ) => {
        if (!d1 && !d2) return true;
        if (!d1 || !d2) return false;
        return (
          new Date(d1).toISOString().substring(0, 10) ===
          new Date(d2).toISOString().substring(0, 10)
        );
      };

      const hasOtherChanges =
        (data.title !== undefined && data.title !== session.title) ||
        (data.type !== undefined && data.type !== session.type) ||
        (data.location !== undefined && data.location !== session.location) ||
        (data.maxTrainees !== undefined &&
          data.maxTrainees !== session.maxTrainees) ||
        (data.isFC !== undefined && data.isFC !== session.isFC) ||
        (data.startDate !== undefined &&
          !areDatesEqual(data.startDate, session.startDate)) ||
        (data.endDate !== undefined &&
          !areDatesEqual(data.endDate, session.endDate));

      if (hasOtherChanges) {
        throw new Error(
          "Seul le statut peut être modifié sur une session clôturée"
        );
      }
    }

    // Validation des transitions de statut
    if (data.status && data.status !== session.status) {
      if (session.status === "terminée" && data.status === "planifiée") {
        throw new Error(
          "Impossible de faire repasser une session terminée au statut planifiée"
        );
      }
    }

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

    if (session.status === "terminée") {
      throw new Error("Impossible de supprimer une session terminée");
    }

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
        formateurs: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) throw new Error("Session introuvable");
    return session;
  }

  static async setFormateurs(
    id: string,
    userIds: string[],
    organismeId: string
  ) {
    const session = await prisma.trainingSession.findFirst({
      where: { id, organismeId },
    });
    if (!session) throw new Error("Session introuvable");

    if (session.status === "terminée" || session.status === "annulée") {
      throw new Error(
        "Impossible de modifier les formateurs d'une session clôturée"
      );
    }

    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) {
      throw new Error("Au moins un formateur doit être affecté");
    }

    const members = await prisma.member.findMany({
      where: { organizationId: organismeId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    if (uniqueIds.some((userId) => !memberIds.has(userId))) {
      throw new Error("Formateur invalide pour cet organisme");
    }

    await prisma.$transaction([
      prisma.trainingSessionFormateur.deleteMany({
        where: { trainingSessionId: id },
      }),
      prisma.trainingSessionFormateur.createMany({
        data: uniqueIds.map((userId) => ({ trainingSessionId: id, userId })),
      }),
    ]);
  }

  static async listAssignableFormateurs(organismeId: string) {
    const members = await prisma.member.findMany({
      where: { organizationId: organismeId },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { user: { lastName: "asc" } },
    });
    return members.map((m) => m.user);
  }
}
