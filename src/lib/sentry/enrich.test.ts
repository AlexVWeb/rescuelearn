import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { enrichServerEvent } from "./enrich";

const base = (): ErrorEvent => ({ type: undefined, tags: { feature: "quiz" } });

describe("enrichServerEvent", () => {
  it("tague et regroupe les erreurs Gemini par type", () => {
    const err = Object.assign(new Error('{"error":{"code":503}}'), {
      name: "ApiError",
      status: 503,
    });
    const event = enrichServerEvent(base(), err);
    expect(event.tags).toEqual({
      feature: "quiz",
      "gemini.kind": "unavailable",
    });
    expect(event.fingerprint).toEqual(["gemini", "unavailable"]);
  });

  it("ne confond pas une erreur HTTP non-Gemini avec Gemini", () => {
    const err = Object.assign(new Error("Unauthorized"), {
      name: "APIError",
      statusCode: 401,
    });
    expect(enrichServerEvent(base(), err)).toEqual(base());
  });

  it("tague le code et le modèle Prisma", () => {
    const err = Object.assign(new Error("Unique constraint failed"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { modelName: "Trainee", target: ["emailHash"] },
    });
    const event = enrichServerEvent(base(), err);
    expect(event.tags).toEqual({
      feature: "quiz",
      "prisma.code": "P2002",
      "prisma.model": "Trainee",
    });
    expect(event.fingerprint).toBeUndefined();
  });

  it("ne change rien pour une erreur quelconque", () => {
    expect(enrichServerEvent(base(), new Error("boom"))).toEqual(base());
    expect(enrichServerEvent(base(), "string")).toEqual(base());
  });
});
