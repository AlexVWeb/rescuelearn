import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  createAccessControl,
  organization,
  haveIBeenPwned,
} from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { passkey } from "@better-auth/passkey";
import { randomUUID } from "crypto";

import { EmailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/utils";
import { isFeatureEnabled, FeatureKey } from "@/lib/features";
import { getLoginTypeError, LOGIN_TYPE_HEADER } from "@/lib/login-type";
import { getPasskeyRelyingParty } from "@/lib/passkey-config";
import { SITE_NAME } from "@/lib/site";

const ac = createAccessControl({
  organization: ["update", "delete"] as const,
  member: ["create", "update", "delete"] as const,
  invitation: ["create", "cancel"] as const,
  ac: ["create", "read", "update", "delete"] as const,
});

const relyingParty = getPasskeyRelyingParty(getBaseUrl());

/** Lit (sans vérifier) le payload du JWT de vérification émis par Better-Auth. */
function isChangeEmailVerificationToken(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString()
    );
    return payload.requestType === "change-email-verification";
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: getBaseUrl(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    "http://localhost:3000",
  ],

  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 5 }, // 5 tentatives / 15 min
      "/sign-up/email": { window: 60 * 60, max: 3 }, // 3 inscriptions / heure
      "/forgot-password": { window: 60 * 60, max: 3 }, // 3 demandes / heure
      "/reset-password": { window: 60 * 60, max: 5 }, // 5 resets / heure
      "/passkey/verify-authentication": { window: 15 * 60, max: 10 }, // 10 tentatives / 15 min
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // Renouvellement toutes les 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache cookie 5 minutes (évite DB lookup à chaque requête)
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Refuse la session si l'onglet de connexion ne correspond pas au compte
        // (formateur vs élève). Exécuté après la vérification du mot de passe.
        before: async (session, ctx) => {
          if (ctx?.path !== "/sign-in/email") return;

          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { roles: true },
          });
          const error = getLoginTypeError(
            ctx.headers?.get(LOGIN_TYPE_HEADER),
            user?.roles,
            await isFeatureEnabled(FeatureKey.PLAYER_SYSTEM)
          );
          if (error) {
            throw new APIError("FORBIDDEN", { message: error });
          }
        },
      },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "rescuelearn",
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60, // Token reset valide 1 heure
    revokeSessionsOnPasswordReset: true, // Invalide toutes les sessions après reset
    sendResetPassword: async ({ user, url }) => {
      await EmailService.sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({
      user,
      url,
      token,
    }: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      // Better-Auth réutilise ce hook pour la 2e étape d'un changement d'email
      // (après approbation par l'ancienne adresse) : user.email est alors la
      // nouvelle adresse, et le token signé porte ce type de demande.
      if (isChangeEmailVerificationToken(token)) {
        await EmailService.sendNewEmailVerification({
          to: user.email,
          verificationUrl: url,
        });
        return;
      }
      await EmailService.sendVerificationEmail({
        to: user.email,
        verificationUrl: url,
      });
    },
  },

  plugins: [
    // Connexion sans mot de passe. Le contrôle d'onglet élève/formateur ne
    // s'applique pas : la passkey identifie le compte, le client redirige
    // ensuite selon les rôles (cf. getPostLoginPath).
    passkey({
      rpID: relyingParty.rpID,
      rpName: SITE_NAME,
      origin: relyingParty.origins,
    }),
    haveIBeenPwned({
      customPasswordCompromisedMessage:
        "Ce mot de passe a été compromis dans une fuite de données. Veuillez en choisir un autre.",
    }),
    organization({
      ac,
      roles: {
        // admin → ADMIN_ORGANISME : peut inviter, gérer les membres et modifier l'org
        admin: ac.newRole({
          organization: ["update"],
          invitation: ["create", "cancel"],
          member: ["create", "update", "delete"],
        }),
        // member → FORMATEUR : accès lecture seule, pas de gestion
        member: ac.newRole({
          organization: [],
          invitation: [],
          member: [],
          ac: ["read"],
        }),
      },
      schema: {
        organization: {
          modelName: "organisme",
          additionalFields: {
            siret: { type: "string", required: false },
            agreementNumber: { type: "string", required: false },
            inviteCode: { type: "string", required: false },
            isQualiopi: { type: "boolean", required: false },
          },
        },
        invitation: {
          additionalFields: {
            // token est notre champ custom pour l'URL d'invitation
            token: {
              type: "string",
              required: false,
              returned: true,
              input: false,
            },
          },
        },
      },
      organizationHooks: {
        // Injecte un token UUID dans chaque invitation créée via Better-Auth
        beforeCreateInvitation: async ({ invitation }) => ({
          data: { ...invitation, token: randomUUID() },
        }),
      },
      sendInvitationEmail: async (data) => {
        try {
          const organisme = await prisma.organisme.findUnique({
            where: { id: data.organization.id },
            select: {
              smtpHost: true,
              smtpPort: true,
              smtpUser: true,
              smtpPassword: true,
              smtpFrom: true,
              smtpSecure: true,
            },
          });

          // Le token est injecté via beforeCreateInvitation ; fallback sur l'ID si absent
          const inv = data.invitation as typeof data.invitation & {
            token?: string;
          };
          const invitationUrl = `${getBaseUrl()}/invitation/${inv.token ?? data.id}`;

          await EmailService.sendInvitationEmail({
            to: data.email,
            organismeName: data.organization.name,
            invitationUrl,
            smtp: organisme
              ? {
                  host: organisme.smtpHost,
                  port: organisme.smtpPort,
                  user: organisme.smtpUser,
                  pass: organisme.smtpPassword,
                  from: organisme.smtpFrom,
                  secure: organisme.smtpSecure,
                }
              : undefined,
          });
        } catch (err) {
          logger.error("Failed to send invitation email:", err);
        }
      },
    }),
  ],
  user: {
    // Changement d'email en deux étapes : l'ancienne adresse approuve, puis la
    // nouvelle est vérifiée. L'email du compte ne change qu'à la fin.
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await EmailService.sendEmailChangeConfirmation({
          to: user.email,
          newEmail,
          confirmUrl: url,
        });
      },
    },
    additionalFields: {
      roles: {
        type: "string",
        required: false,
        defaultValue: "[]",
      },
    },
  },
});
