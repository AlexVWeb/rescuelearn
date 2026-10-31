import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";

/** Horaires des crons, identiques à vercel.json (vérifié par cron.test.ts). */
export const CRON_SCHEDULES = {
  "/api/cron/keep-alive": "0 5 * * *",
  "/api/cron/cleanup-sessions": "0 * * * *",
  "/api/cron/daily-quiz": "0 7 * * *",
  "/api/cron/evaluation-reminders": "0 8 * * *",
} as const;

export type CronPath = keyof typeof CRON_SCHEDULES;

type CronHandler = (req: NextRequest) => Promise<Response>;

function isAuthorizedCronCall(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return (
    Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`
  );
}

/**
 * Sentry Cron Monitor : alerte si un cron ne s'exécute pas à l'heure, échoue
 * (exception ou HTTP 5xx) ou dépasse sa durée. Les appels non authentifiés
 * (tests manuels, scans) ne créent pas de check-in.
 */
export function withCronMonitor(
  path: CronPath,
  handler: CronHandler
): CronHandler {
  const monitorSlug = path.replace("/api/cron/", "cron-");

  return async (req) => {
    if (!isAuthorizedCronCall(req)) return handler(req);

    const checkInId = Sentry.captureCheckIn(
      { monitorSlug, status: "in_progress" },
      {
        schedule: { type: "crontab", value: CRON_SCHEDULES[path] },
        timezone: "Etc/UTC",
        checkinMargin: 5,
        maxRuntime: 10,
        failureIssueThreshold: 1,
        recoveryThreshold: 1,
      }
    );
    const startedAt = Date.now();
    const finish = (status: "ok" | "error") =>
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug,
        status,
        duration: (Date.now() - startedAt) / 1000,
      });

    try {
      const response = await handler(req);
      finish(response.status >= 500 ? "error" : "ok");
      return response;
    } catch (error) {
      finish("error");
      throw error;
    } finally {
      // La fonction peut être gelée juste après la réponse : on vide la file.
      await Sentry.flush(2000);
    }
  };
}
