import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: remplacer par un vrai provider email en production (Resend, Nodemailer, etc.)
      console.log(
        `[RescueLearn] Lien de réinitialisation pour ${user.email}: ${url}`
      );
    },
  },
  user: {
    additionalFields: {
      roles: {
        type: "string", // prisma Json type is often represented as string or object in JS
        required: false,
        defaultValue: "[]",
      },
    },
  },
});
