"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { APIError } from "better-auth/api";

import { EmailService } from "@/lib/email";

const PROFILE_PATHS = ["/admin/profile", "/player/profil"] as const;
type ProfilePath = (typeof PROFILE_PATHS)[number];

export async function updateProfileAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword?: string;
  /** Page où ramener l'utilisateur après les liens de confirmation e-mail. */
  profilePath?: ProfilePath;
}) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return { success: false, error: "Non autorisé" };

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentEmail = session.user.email;
  const newEmail = data.email.toLowerCase().trim();
  const isEmailChanging = newEmail !== currentEmail.toLowerCase().trim();
  const profilePath: ProfilePath = PROFILE_PATHS.includes(
    data.profilePath as ProfilePath
  )
    ? (data.profilePath as ProfilePath)
    : "/admin/profile";

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
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        name: fullName,
      },
    });
  } catch (error) {
    logger.error("Failed to update profile:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  if (isEmailChanging) {
    // L'email n'est pas modifié ici : Better-Auth envoie un lien d'approbation
    // à l'ancienne adresse, puis un lien de vérification à la nouvelle.
    try {
      await auth.api.changeEmail({
        body: { newEmail, callbackURL: profilePath },
        headers: reqHeaders,
      });
      logger.info(
        `User ${session.user.id} requested email change from ${currentEmail} to ${newEmail}`
      );
    } catch (error) {
      if (
        error instanceof APIError &&
        error.status === "UNPROCESSABLE_ENTITY"
      ) {
        return { success: false, error: "Cet email est déjà utilisé" };
      }
      logger.error("Failed to request email change:", error);
      return {
        success: false,
        error: "Impossible d'envoyer l'e-mail de confirmation.",
      };
    }
  }

  revalidatePath(profilePath);
  return { success: true, emailChangePending: isEmailChanging };
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
