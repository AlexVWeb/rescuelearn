"use server";

import { prisma, withOrganisme } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { UserRole, hasRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function getUserContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Non autorisé");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      organismeId: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) throw new Error("Utilisateur introuvable");
  return user;
}

/** Throws if user is not a super admin, redirects to training dashboard otherwise. */
export async function requireSuperAdmin() {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    redirect("/admin/training/dashboard");
  }
  return user;
}

/** Throws if user has no organisme. Returns user with organismeId typed as string. */
export async function requireOrganisme() {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");
  return user as typeof user & { organismeId: string };
}

/** Returns a Prisma client restricted to the current user's organisme. */
export async function getTenantPrisma() {
  const user = await requireOrganisme();
  return withOrganisme(user.organismeId);
}
