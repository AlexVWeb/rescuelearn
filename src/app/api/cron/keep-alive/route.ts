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
    logger.warn("Tentative non autorisée d'accès au cron de keep-alive");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Exécuter une requête simple pour réveiller la base de données
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database keep-alive cron job executed successfully");
    return NextResponse.json({ success: true, message: "Database is awake" });
  } catch (error) {
    logger.error("Database keep-alive cron job failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to ping database" },
      { status: 500 }
    );
  }
}
