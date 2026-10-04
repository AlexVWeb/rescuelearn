import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole, UserRole } from "@/lib/roles";

export type AdminGuardError = "Unauthorized" | "Forbidden";

/**
 * Garde des server actions du back-office réservé aux SUPER_ADMIN.
 * Une server action reste appelable directement : le garde de la page ne
 * suffit pas. Le rôle est relu en base pour qu'un retrait prenne effet aussitôt.
 * Retourne null si l'accès est autorisé, sinon le code d'erreur.
 */
export async function checkSuperAdmin(): Promise<AdminGuardError | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return "Unauthorized";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });
  if (!user || !hasRole(user.roles, UserRole.SUPER_ADMIN)) return "Forbidden";
  return null;
}
