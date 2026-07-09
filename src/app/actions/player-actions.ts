"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { UserRole } from "@/lib/roles";
import { headers } from "next/headers";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit faire au moins 2 caractères."),
  email: z.email("Email invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export async function registerPlayerAction(values: unknown) {
  try {
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { email, password, name } = parsed.data;

    // Vérifie si l'adresse email existe déjà
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Cet email est déjà utilisé." };
    }

    // Appelle Better-Auth pour enregistrer l'utilisateur (envoie l'email de vérification)
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      headers: await headers(),
    });

    if (!result || !result.user) {
      return {
        success: false,
        error: "Erreur lors de la création de l'utilisateur.",
      };
    }

    // Assigne le rôle PLAYER à l'utilisateur
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        roles: [UserRole.PLAYER],
      },
    });

    logger.info(
      `Joueur inscrit avec succès (l'email est envoyé automatiquement par Better-Auth) : ${email}`
    );
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de l'inscription du joueur :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}
