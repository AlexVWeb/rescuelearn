import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";

export async function getAdminStatsAction() {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const [userCount, organismeCount, trainingSessionCount, traineeCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.organisme.count(),
        prisma.trainingSession.count(),
        prisma.trainee.count(),
      ]);

    return {
      success: true,
      data: {
        users: userCount,
        organismes: organismeCount,
        sessions: trainingSessionCount,
        trainees: traineeCount,
      },
    };
  } catch (error) {
    logger.error("Erreur lors de la récupération des statistiques :", error);
    return { success: false, error: "Erreur serveur" };
  }
}
