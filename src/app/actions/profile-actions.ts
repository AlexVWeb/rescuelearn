"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { hashPassword, verifyPassword } from "better-auth/crypto";

import { EmailService } from "@/lib/email";

export async function updateProfileAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Non autorisé" };

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentEmail = session.user.email;
  const isEmailChanging =
    data.email.toLowerCase().trim() !== currentEmail.toLowerCase().trim();

  if (isEmailChanging) {
    if (!data.currentPassword) {
      return {
        success: false,
        error: "Mot de passe actuel requis pour modifier l'adresse e-mail.",
      };
    }

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "credential" },
    });

    if (!account?.password) {
      return {
        success: false,
        error: "Impossible de vérifier le mot de passe actuel.",
      };
    }

    const validPassword = await verifyPassword({
      password: data.currentPassword,
      hash: account.password,
    });

    if (!validPassword) {
      return {
        success: false,
        error: "Mot de passe actuel incorrect.",
      };
    }
  }

  try {
    const newEmail = data.email.toLowerCase().trim();
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        name: fullName,
        ...(isEmailChanging ? { email: newEmail, emailVerified: false } : {}),
      },
    });

    if (isEmailChanging) {
      logger.info(
        `User ${session.user.id} updated email from ${currentEmail} to ${newEmail}`
      );
      await EmailService.sendEmailChangedNotification({
        oldEmail: currentEmail,
        newEmail,
      });
    }

    revalidatePath("/admin/profile");
    return { success: true, emailChanged: isEmailChanging };
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

  logger.info(`Password updated for user ${session.user.id}`);
  await EmailService.sendPasswordChangedNotification({
    to: session.user.email,
  });

  return { success: true };
}

export async function requestPasswordResetFromProfileAction() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user?.email) {
    return { success: false, error: "Non autorisé" };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await auth.api.requestPasswordReset({
      body: {
        email: session.user.email,
        redirectTo: `${baseUrl}/reset-password`,
      },
      headers: reqHeaders,
    });

    logger.info(
      `Password reset requested from profile page for user ${session.user.id}`
    );
    return { success: true };
  } catch (error) {
    logger.error(
      "Erreur lors de la demande de réinitialisation du mot de passe depuis le profil:",
      error
    );
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'envoi de l'e-mail de réinitialisation.",
    };
  }
}
