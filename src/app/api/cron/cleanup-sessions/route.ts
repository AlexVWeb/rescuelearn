import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  // En production, Vercel injecte CRON_SECRET et passe l'en-tête Authorization: Bearer <CRON_SECRET>
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    logger.warn(
      "Tentative non autorisée d'accès au cron de nettoyage des sessions"
    );
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const result = await prisma.quizSession.updateMany({
      where: {
        status: { in: ["LOBBY", "IN_PROGRESS"] },
        updatedAt: { lt: twoHoursAgo },
      },
      data: {
        status: "FINISHED",
        currentQuestionId: null,
        currentQuestionStartedAt: null,
      },
    });

    logger.info(
      `Nettoyage des sessions de quiz inactives terminé : ${result.count} sessions clôturées.`
    );
    return NextResponse.json({
      success: true,
      closedSessionsCount: result.count,
    });
  } catch (error) {
    logger.error("Le cron de nettoyage des sessions de quiz a échoué :", error);
    return NextResponse.json(
      { success: false, error: "Failed to cleanup stale sessions" },
      { status: 500 }
    );
  }
}
