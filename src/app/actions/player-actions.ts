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

const onboardingSchema = z.object({
  experience: z.string().min(1, "Expérience requise"),
  objective: z.string().min(1, "Objectif requis"),
  expectation: z.string().min(1, "Attente requise"),
});

export async function savePlayerOnboardingAction(values: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const parsed = onboardingSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { experience, objective, expectation } = parsed.data;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
        onboardingExperience: experience,
        onboardingObjective: objective,
        onboardingExpectation: expectation,
      },
    });

    logger.info(`Onboarding complété pour l'utilisateur ${session.user.email}`);
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la sauvegarde de l'onboarding :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function getPlayerOnboardingStatusAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        onboardingCompleted: true,
        onboardingExperience: true,
        onboardingObjective: true,
        onboardingExpectation: true,
      },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable." };
    }

    return {
      success: true,
      data: {
        completed: user.onboardingCompleted,
        experience: user.onboardingExperience || "",
        objective: user.onboardingObjective || "",
        expectation: user.onboardingExpectation || "",
      },
    };
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération du statut d'onboarding :",
      error
    );
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function resetPlayerOnboardingAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: false,
        onboardingExperience: null,
        onboardingObjective: null,
        onboardingExpectation: null,
      },
    });

    logger.info(
      `Onboarding réinitialisé pour l'utilisateur ${session.user.email}`
    );
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la réinitialisation de l'onboarding :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}
