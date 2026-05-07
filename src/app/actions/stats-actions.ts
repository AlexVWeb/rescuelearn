import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getAdminStatsAction() {
  const session = await auth.api.getSession({ headers: await headers() });

  // On pourrait vérifier les rôles ici si nécessaire
  if (!session) {
    return { success: false, error: "Non autorisé" };
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
