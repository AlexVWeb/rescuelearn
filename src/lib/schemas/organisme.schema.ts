import { z } from "zod";

export const organismeSchema = z
  .object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    siret: z
      .string()
      .regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres")
      .optional()
      .or(z.literal("")),
    agreementNumber: z.string().optional(),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phone: z.string().optional(),
    website: z.string().url("URL invalide").optional().or(z.literal("")),
    address: z.string().optional(),
    postalCode: z
      .string()
      .regex(/^\d{5}$/, "Code postal invalide (5 chiffres)")
      .optional()
      .or(z.literal("")),
    city: z.string().optional().or(z.literal("")),

    // Représentant Légal
    legalRepFirstName: z.string().optional().or(z.literal("")),
    legalRepLastName: z.string().optional().or(z.literal("")),
    legalRepJobTitle: z.string().optional().or(z.literal("")),

    // Informations Administratives
    legalStatus: z.string().optional().or(z.literal("")),
    tvaNumber: z.string().optional().or(z.literal("")),
    federationName: z.string().optional().or(z.literal("")),

    // Certification Qualiopi
    isQualiopi: z.boolean().default(false),
    qualiopiCertifiedBy: z.string().optional().or(z.literal("")),

    retentionYearsActive: z.coerce
      .number()
      .min(1, "Minimum 1 an")
      .max(10, "Maximum 10 ans"),
    retentionYearsArchive: z.coerce
      .number()
      .min(5, "Minimum 5 ans")
      .max(20, "Maximum 20 ans"),

    // Configuration SMTP
    smtpHost: z.string().optional().or(z.literal("")),
    smtpPort: z.coerce.number().optional(),
    smtpUser: z.string().optional().or(z.literal("")),
    smtpPassword: z.string().optional().or(z.literal("")),
    smtpFrom: z.string().email("Email invalide").optional().or(z.literal("")),
    smtpSecure: z.boolean().default(true),

    // Administrateur initial (non persistant en base pour l'organisme, utilisé uniquement pour l'invitation à la création)
    createAdmin: z.boolean().default(false),
    useContactEmailAsAdmin: z.boolean().default(true),
    adminEmail: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.createAdmin) {
      if (data.useContactEmailAsAdmin) {
        if (!data.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "L'e-mail de contact de l'organisme est requis pour créer l'administrateur",
            path: ["email"],
          });
        } else {
          const emailCheck = z.string().email().safeParse(data.email);
          if (!emailCheck.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "L'e-mail de contact de l'organisme n'est pas un e-mail valide",
              path: ["email"],
            });
          }
        }
      } else {
        if (!data.adminEmail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "L'e-mail de l'administrateur est requis",
            path: ["adminEmail"],
          });
        } else {
          const emailCheck = z.string().email().safeParse(data.adminEmail);
          if (!emailCheck.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "L'e-mail de l'administrateur n'est pas un e-mail valide",
              path: ["adminEmail"],
            });
          }
        }
      }
    }
  });

export type OrganismeFormValues = z.infer<typeof organismeSchema>;
