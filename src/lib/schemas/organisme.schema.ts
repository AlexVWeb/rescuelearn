import { z } from "zod";

export const organismeSchema = z.object({
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
  city: z.string().optional(),
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
});

export type OrganismeFormValues = z.infer<typeof organismeSchema>;
