import type { ErrorEvent } from "@sentry/nextjs";
import { classifyGeminiError } from "@/lib/gemini/errors";

/**
 * Ajoute du contexte de diagnostic (sans donnée personnelle) aux erreurs serveur :
 * type d'erreur Gemini, code et modèle Prisma. Sert aussi au regroupement des issues.
 */
export function enrichServerEvent(
  event: ErrorEvent,
  error: unknown
): ErrorEvent {
  if (!error || typeof error !== "object") return event;
  const tags = { ...event.tags };

  // Le classifieur se base sur un code HTTP : on le réserve aux erreurs du SDK
  // Google (`ApiError`) pour ne pas taguer une APIError better-auth en 401.
  const isGeminiError =
    (error as { name?: unknown }).name === "ApiError" ||
    (error instanceof Error && error.message.includes("GEMINI_API_KEY"));
  const geminiKind = isGeminiError ? classifyGeminiError(error) : undefined;
  if (geminiKind) {
    tags["gemini.kind"] = geminiKind;
    event.fingerprint = ["gemini", geminiKind];
  }

  const err = error as {
    name?: unknown;
    code?: unknown;
    clientVersion?: unknown;
    meta?: { modelName?: unknown };
  };
  if (typeof err.name === "string" && err.name.startsWith("PrismaClient")) {
    if (typeof err.code === "string") tags["prisma.code"] = err.code;
    if (typeof err.meta?.modelName === "string")
      tags["prisma.model"] = err.meta.modelName;
  }

  event.tags = tags;
  return event;
}
