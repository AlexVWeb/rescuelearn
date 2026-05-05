import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAccessControl, organization } from "better-auth/plugins";
import { randomUUID } from "crypto";

import { EmailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const ac = createAccessControl({
  organization: ["update", "delete"] as const,
  member: ["create", "update", "delete"] as const,
  invitation: ["create", "cancel"] as const,
  ac: ["create", "read", "update", "delete"] as const,
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await EmailService.send({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe - RescueLearn",
        text: `Bonjour,\n\nCliquez sur ce lien pour réinitialiser votre mot de passe :\n${url}\n\nCe lien expirera dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nL'équipe RescueLearn`,
      });
    },
  },
  plugins: [
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
          const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitation/${inv.token ?? data.id}`;

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
    additionalFields: {
      roles: {
        type: "string",
        required: false,
        defaultValue: "[]",
      },
    },
  },
});
