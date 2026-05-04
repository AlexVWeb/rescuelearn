import { z } from "zod";
import { UserRole } from "@/lib/roles";

export const inviteMemberSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  role: z.enum([UserRole.ADMIN_ORGANISME, UserRole.FORMATEUR], {
    message: "Le rôle est requis",
  }),
  organismeId: z.string().uuid("ID d'organisme invalide"),
});

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, "Token manquant"),
    password: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caractères"),
    confirmPassword: z.string(),
    firstName: z.string().min(2, "Le prénom est trop court"),
    lastName: z.string().min(2, "Le nom est trop court"),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    // Check complexity
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z\d]/.test(password);
    const hasUnderscore = /_/.test(password);
    const isLongEnoughForPassphrase = password.length >= 16;
    const isLongEnoughForClassic = password.length >= 12;

    const isClassicValid =
      isLongEnoughForClassic && hasUpper && hasLower && hasDigit && hasSpecial;
    const isPassphraseValid = isLongEnoughForPassphrase && hasUnderscore;

    if (!isClassicValid && !isPassphraseValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Le mot de passe doit soit faire 12+ caractères avec majuscule, minuscule, chiffre et caractère spécial, soit être une phrase de 16+ caractères avec des underscores (_).",
        path: ["password"],
      });
    }

    // Check match
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
      });
    }
  });

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
