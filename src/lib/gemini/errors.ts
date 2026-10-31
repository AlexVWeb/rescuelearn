const DEFAULT_MESSAGE =
  "Une erreur est survenue lors de la génération par l'IA.";

type GeminiErrorKind =
  | "spending_cap"
  | "quota"
  | "invalid_key"
  | "permission"
  | "unsupported_location"
  | "invalid_request"
  | "not_found"
  | "internal"
  | "unavailable"
  | "timeout"
  | "missing_key";

const MESSAGES: Record<GeminiErrorKind, string> = {
  spending_cap:
    "Le plafond de dépenses mensuel du service IA est atteint. Contactez l'administrateur pour le relever.",
  quota:
    "Le quota de requêtes du service IA est temporairement dépassé. Réessayez dans quelques minutes.",
  invalid_key:
    "La clé d'accès au service IA est invalide ou expirée. Contactez l'administrateur.",
  permission:
    "Le service IA a refusé l'accès (permissions insuffisantes). Contactez l'administrateur.",
  unsupported_location:
    "Le service IA n'est pas disponible pour ce projet (facturation ou région non prise en charge). Contactez l'administrateur.",
  invalid_request:
    "Le service IA a rejeté la requête (document trop volumineux ou paramètres invalides).",
  not_found:
    "Le modèle IA configuré est introuvable. Contactez l'administrateur.",
  internal:
    "Le service IA a rencontré une erreur interne. Réessayez dans quelques instants.",
  unavailable:
    "Le service IA est momentanément surchargé ou indisponible. Réessayez dans quelques instants.",
  timeout:
    "Le service IA a mis trop de temps à répondre. Réessayez, éventuellement avec moins de contenu.",
  missing_key:
    "Le service IA n'est pas configuré sur ce serveur. Contactez l'administrateur.",
};

function extractStatus(error: unknown): number | undefined {
  const err = error as { status?: unknown; statusCode?: unknown } | null;
  if (typeof err?.status === "number") return err.status;
  if (typeof err?.statusCode === "number") return err.statusCode;
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : undefined;
}

export function classifyGeminiError(
  error: unknown
): GeminiErrorKind | undefined {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const status = extractStatus(error);

  if (message.includes("GEMINI_API_KEY is not configured"))
    return "missing_key";
  if (/spending cap|spend cap|billing/i.test(message) && status === 429)
    return "spending_cap";
  if (status === 429 || /RESOURCE_EXHAUSTED/.test(message)) return "quota";
  if (/API_KEY_INVALID|API key (not valid|expired)/i.test(message))
    return "invalid_key";
  if (/User location is not supported|FAILED_PRECONDITION/.test(message))
    return "unsupported_location";
  if (status === 401 || status === 403 || /PERMISSION_DENIED/.test(message))
    return "permission";
  if (status === 404) return "not_found";
  if (status === 504 || /DEADLINE_EXCEEDED/.test(message)) return "timeout";
  if (status === 503 || /UNAVAILABLE/.test(message)) return "unavailable";
  if (status === 500 || /"status"\s*:\s*"INTERNAL"/.test(message))
    return "internal";
  if (status === 400 || /INVALID_ARGUMENT/.test(message))
    return "invalid_request";
  return undefined;
}

/** Errors that will keep failing until someone acts (billing, key, config). */
export function isPermanentGeminiError(error: unknown): boolean {
  const kind = classifyGeminiError(error);
  return (
    kind === "spending_cap" ||
    kind === "invalid_key" ||
    kind === "permission" ||
    kind === "unsupported_location" ||
    kind === "missing_key"
  );
}

/**
 * User-facing French message for an error thrown during AI generation.
 * Google API errors are mapped to readable messages; our own errors keep
 * their message (they are already written for the user).
 */
export function getAiErrorMessage(
  error: unknown,
  fallback = DEFAULT_MESSAGE
): string {
  const kind = classifyGeminiError(error);
  if (kind) return MESSAGES[kind];
  if (error instanceof Error && error.name !== "ApiError" && error.message)
    return error.message;
  return fallback;
}
