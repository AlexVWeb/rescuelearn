"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { hashPassword, verifyPassword } from "better-auth/crypto";

export async function updateProfileAction(data: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Non autorisé" };

  const fullName = `${data.firstName} ${data.lastName}`.trim();

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        name: fullName,
      },
    });
    revalidatePath("/admin/profile");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }
    logger.error("Failed to update profile:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function updatePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Non autorisé" };

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" },
  });

  if (!account?.password) {
    return { success: false, error: "Aucun mot de passe configuré" };
  }

  const valid = await verifyPassword({
    password: data.currentPassword,
    hash: account.password,
  });

  if (!valid) {
    return { success: false, error: "Mot de passe actuel incorrect" };
  }

  const hashed = await hashPassword(data.newPassword);
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });

  return { success: true };
}
