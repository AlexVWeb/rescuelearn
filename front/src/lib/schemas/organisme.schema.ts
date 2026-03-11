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
});

export type OrganismeFormValues = z.infer<typeof organismeSchema>;
