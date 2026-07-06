import { z } from "zod";
import axios from "axios";
import { logger } from "@/lib/logger";

export const SiretResponseSchema = z.object({
  results: z.array(
    z.object({
      nom_complet: z.string(),
      siren: z.string(),
      siege: z.object({
        siret: z.string(),
        adresse: z.string().optional(),
        code_postal: z.string().optional(),
        libelle_commune: z.string().optional(),
      }),
      nature_juridique: z.string().optional(),
      matching_etablissements: z
        .array(
          z.object({
            siret: z.string(),
            adresse: z.string().optional(),
            code_postal: z.string().optional(),
            libelle_commune: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
});

export type SiretResponse = z.infer<typeof SiretResponseSchema>;

export interface OrganismeDetails {
  name: string;
  siret: string;
  address: string;
  postalCode: string;
  city: string;
  legalStatus?: string;
}

export class SiretService {
  private static API_URL = "https://recherche-entreprises.api.gouv.fr/search";

  static async searchBySiret(siret: string): Promise<OrganismeDetails | null> {
    if (!/^\d{14}$/.test(siret)) {
      throw new Error("Le SIRET doit contenir 14 chiffres");
    }

    try {
      const response = await axios.get(this.API_URL, {
        params: {
          q: siret,
          per_page: 1,
        },
      });

      const validatedData = SiretResponseSchema.parse(response.data);

      if (validatedData.results.length === 0) {
        return null;
      }

      const result = validatedData.results[0];

      // Find the specific establishment matching the SIRET or default to siege
      const etablissement =
        result.matching_etablissements?.find((e) => e.siret === siret) ||
        result.siege;

      return {
        name: result.nom_complet,
        siret: etablissement.siret,
        address: etablissement.adresse || "",
        postalCode: etablissement.code_postal || "",
        city: etablissement.libelle_commune || "",
        legalStatus: result.nature_juridique,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      logger.error("Error fetching SIRET data:", error);
      throw error;
    }
  }
}
