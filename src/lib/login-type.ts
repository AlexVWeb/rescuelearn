import { hasRole, UserRole } from "@/lib/roles";

export const LOGIN_TYPE_HEADER = "x-login-type";

export type LoginType = "player" | "trainer";

const TRAINER_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN_ORGANISME,
  UserRole.FORMATEUR,
] as const;

/**
 * Vérifie que l'onglet de connexion choisi correspond au type de compte.
 * Retourne un message d'erreur, ou null si la connexion est autorisée.
 */
export function getLoginTypeError(
  loginType: string | null | undefined,
  roles: unknown,
  playerEnabled: boolean
): string | null {
  if (loginType === "player") {
    if (!hasRole(roles, UserRole.PLAYER)) {
      return "Ce compte n'est pas un compte élève. Utilisez l'onglet Formateur / Organisme.";
    }
    if (!playerEnabled) {
      return "L'espace élève est temporairement désactivé.";
    }
    return null;
  }

  if (loginType === "trainer") {
    if (!TRAINER_ROLES.some((role) => hasRole(roles, role))) {
      return "Ce compte est un compte élève. Utilisez l'onglet Élève / Joueur.";
    }
    return null;
  }

  return "Type de connexion invalide.";
}
