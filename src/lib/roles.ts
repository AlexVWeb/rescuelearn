import { z } from "zod";

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN_ORGANISME: "ADMIN_ORGANISME",
  FORMATEUR: "FORMATEUR",
  PLAYER: "PLAYER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN_ORGANISME,
  UserRole.FORMATEUR,
  UserRole.PLAYER,
]);

export function hasRole(roles: unknown, role: UserRole): boolean {
  if (!roles) return false;

  let rolesArray: string[] = [];

  if (Array.isArray(roles)) {
    rolesArray = roles as string[];
  } else if (typeof roles === "string") {
    try {
      const parsed = JSON.parse(roles);
      if (Array.isArray(parsed)) {
        rolesArray = parsed;
      }
    } catch {
      // Not a JSON string, handle as a single role string if applicable
      rolesArray = [roles];
    }
  }

  return rolesArray.includes(role);
}

const ROLE_LABELS: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.ADMIN_ORGANISME]: "Admin Organisme",
  [UserRole.FORMATEUR]: "Formateur",
  [UserRole.PLAYER]: "Apprenant",
  // Rôles org Better-Auth stockés sur certaines invitations
  admin: "Admin Organisme",
  member: "Formateur",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
