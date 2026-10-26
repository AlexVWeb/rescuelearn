import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { runEvaluationReminders } from "@/lib/evaluation/reminders";

// Invitations et rappels des évaluations à chaud et à froid (quotidien)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  // En production, Vercel injecte CRON_SECRET et passe l'en-tête Authorization: Bearer <CRON_SECRET>
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    logger.warn("Tentative non autorisée d'accès au cron des évaluations");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await runEvaluationReminders();
    logger.info("Rappels d'évaluation traités", result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Le cron des rappels d'évaluation a échoué :", error);
    return NextResponse.json(
      { success: false, error: "Failed to send evaluation reminders" },
      { status: 500 }
    );
  }
}
