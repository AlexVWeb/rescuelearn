import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureCheckIn = vi.fn((..._args: unknown[]) => "check-in-id");
vi.mock("@sentry/nextjs", () => ({
  captureCheckIn: (...args: unknown[]) => captureCheckIn(...args),
  flush: vi.fn(async () => true),
}));

const { CRON_SCHEDULES, withCronMonitor } = await import("./cron");

const request = (auth?: string) =>
  new NextRequest("https://app.fr/api/cron/keep-alive", {
    headers: auth ? { authorization: auth } : {},
  });

describe("CRON_SCHEDULES", () => {
  it("correspond exactement à vercel.json", () => {
    const vercel = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../../vercel.json"), "utf8")
    ) as { crons: { path: string; schedule: string }[] };
    expect(
      Object.fromEntries(vercel.crons.map((c) => [c.path, c.schedule]))
    ).toEqual(CRON_SCHEDULES);
  });
});

describe("withCronMonitor", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
    captureCheckIn.mockClear();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("n'envoie pas de check-in pour un appel non authentifié", async () => {
    const handler = vi.fn(
      async () => new Response("Unauthorized", { status: 401 })
    );
    const res = await withCronMonitor(
      "/api/cron/keep-alive",
      handler
    )(request());
    expect(res.status).toBe(401);
    expect(captureCheckIn).not.toHaveBeenCalled();
  });

  it("envoie in_progress puis ok", async () => {
    const handler = vi.fn(async () => Response.json({ success: true }));
    await withCronMonitor(
      "/api/cron/keep-alive",
      handler
    )(request("Bearer s3cret"));
    expect(captureCheckIn).toHaveBeenNthCalledWith(
      1,
      { monitorSlug: "cron-keep-alive", status: "in_progress" },
      expect.objectContaining({
        schedule: { type: "crontab", value: "0 5 * * *" },
      })
    );
    expect(captureCheckIn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ checkInId: "check-in-id", status: "ok" })
    );
  });

  it("marque en erreur une réponse 5xx", async () => {
    const handler = vi.fn(async () => Response.json({}, { status: 500 }));
    await withCronMonitor(
      "/api/cron/keep-alive",
      handler
    )(request("Bearer s3cret"));
    expect(captureCheckIn).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "error" })
    );
  });

  it("marque en erreur et relance une exception", async () => {
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(
      withCronMonitor("/api/cron/keep-alive", handler)(request("Bearer s3cret"))
    ).rejects.toThrow("boom");
    expect(captureCheckIn).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "error" })
    );
  });
});
