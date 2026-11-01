"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { hasRole, UserRole } from "@/lib/roles";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { getBaseUrl } from "@/lib/utils";
import {
  assertNotRateLimited,
  getClientIp,
  RateLimitError,
  registerFailure,
  type RateLimitRule,
} from "@/lib/rate-limit";

export async function requestPasswordReset(email: string) {
  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      },
      headers: await headers(),
    });
  } catch (error) {
    logger.error("Erreur lors de la demande de réinitialisation", error);
  }
  // On renvoie toujours success pour ne pas révéler si l'email existe
  return { success: true };
}

const trainerSignupSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères."),
  email: z.email("Email invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères."),
  inviteCode: z.string().trim().min(1, "Code d'invitation requis."),
});

/** Seuls les codes invalides comptent : une salle derrière une même IP peut s'inscrire. */
async function inviteCodeRateLimitRule(): Promise<RateLimitRule> {
  return {
    key: `invite-code:${await getClientIp()}`,
    max: 10,
    windowSeconds: 15 * 60,
  };
}

/**
 * Inscription formateur via le code d'invitation d'un organisme.
 *
 * Tout se fait côté serveur : avec requireEmailVerification, Better-Auth ne
 * crée pas de session au sign-up, le rattachement ne peut donc pas dépendre
 * d'une session. On rattache par l'id renvoyé (jamais par email) : pour un
 * email déjà inscrit, Better-Auth renvoie un utilisateur fictif, l'update ne
 * touche aucune ligne et la réponse reste générique (pas d'énumération).
 */
export async function registerTrainerAction(values: unknown) {
  const parsed = trainerSignupSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { name, email, password, inviteCode } = parsed.data;

  const rule = await inviteCodeRateLimitRule();
  try {
    await assertNotRateLimited(rule);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: err.message };
    }
    throw err;
  }

  const organisme = await prisma.organisme.findUnique({
    where: { inviteCode },
    select: { id: true },
  });
  if (!organisme) {
    await registerFailure(rule);
    return { success: false, error: "Code d'invitation invalide ou expiré." };
  }

  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name, callbackURL: `${getBaseUrl()}/admin` },
      headers: await headers(),
    });

    await prisma.user.updateMany({
      where: { id: result.user.id, organismeId: null },
      data: { organismeId: organisme.id, roles: [UserRole.FORMATEUR] },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, error: error.message };
    }
    logger.error("Erreur lors de l'inscription formateur :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

/**
 * Destination après une connexion par passkey : la passkey identifie le
 * compte sans passer par l'onglet élève/formateur, on route selon les rôles.
 */
export async function getPostLoginPath(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return "/login";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });

  const isTrainer = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_ORGANISME,
    UserRole.FORMATEUR,
  ].some((role) => hasRole(user?.roles, role));

  return isTrainer ? "/admin" : "/player";
}
