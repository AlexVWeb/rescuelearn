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
  return Array.isArray(roles) && (roles as string[]).includes(role);
}
