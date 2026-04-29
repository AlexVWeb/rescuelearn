"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UserRole } from "@/lib/roles";

export async function requestPasswordReset(email: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/forget-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      }),
    });
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
  }
  // On renvoie toujours success pour ne pas révéler si l'email existe
  return { success: true };
}

export async function validateInviteCode(inviteCode: string) {
  if (!inviteCode) {
    return { success: false, error: "Code d'invitation requis." };
  }

  const organisme = await prisma.organisme.findUnique({
    where: { inviteCode },
  });

  if (!organisme) {
    return { success: false, error: "Code d'invitation invalide ou expiré." };
  }

  return {
    success: true,
    organismeId: organisme.id,
    organismeName: organisme.name,
  };
}

export async function linkUserToOrganisme(inviteCode: string) {
  // Verifie l'authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Non authentifié" };
  }

  // Verifie le code d'invitation
  const organisme = await prisma.organisme.findUnique({
    where: { inviteCode },
  });

  if (!organisme) {
    return { success: false, error: "Code d'invitation invalide" };
  }

  // Met à jour l'utilisateur et lui donne le role FORMATEUR
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Si l'utilisateur n'a pas de roles, on initialise un tableau
    const currentRoles = Array.isArray(user?.roles) ? user.roles : [];
    const newRoles = [
      ...new Set([...(currentRoles as string[]), UserRole.FORMATEUR]),
    ];

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        organismeId: organisme.id,
        roles: newRoles,
      },
    });

    return { success: true };
  } catch (error) {
    console.error(
      "Erreur lors de la liaison de l'utilisateur à l'organisme:",
      error
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de l'association à l'organisme.",
    };
  }
}
