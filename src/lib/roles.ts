import { z } from "zod";

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN_ORGANISME: "ADMIN_ORGANISME",
  FORMATEUR: "FORMATEUR",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN_ORGANISME,
  UserRole.FORMATEUR,
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
