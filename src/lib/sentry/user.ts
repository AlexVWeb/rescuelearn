import * as Sentry from "@sentry/nextjs";

/**
 * Identifie l'utilisateur dans Sentry par son id technique uniquement (pseudonyme) :
 * pas d'email, de nom ni d'IP. Rôles et organisme en tags pour filtrer les issues.
 */
export function setSentryUser(user: {
  id: string;
  roles?: unknown;
  organismeId?: string | null;
}) {
  Sentry.setUser({ id: user.id });
  Sentry.setTags({
    "user.roles": normalizeRoles(user.roles).join(",") || "none",
    organismeId: user.organismeId ?? "none",
  });
}

/** Espace stagiaire : pas de compte, on rattache l'erreur à l'inscription. */
export function setSentryTrainee(access: {
  id: string;
  trainingSessionId: string;
  trainingSession: { organismeId: string };
}) {
  Sentry.setUser(null);
  Sentry.setTags({
    "user.roles": "trainee",
    inscriptionId: access.id,
    trainingSessionId: access.trainingSessionId,
    organismeId: access.trainingSession.organismeId,
  });
}

function normalizeRoles(roles: unknown): string[] {
  if (Array.isArray(roles)) return roles.filter((r) => typeof r === "string");
  if (typeof roles === "string") {
    try {
      return normalizeRoles(JSON.parse(roles));
    } catch {
      return [roles];
    }
  }
  return [];
}
