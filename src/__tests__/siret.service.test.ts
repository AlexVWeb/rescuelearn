import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import axios from "axios";
import { SiretService } from "@/services/siret.service";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("SiretService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return organization details for a valid SIRET", async () => {
    const mockData = {
      results: [
        {
          nom_complet: "ASSOCIATION DE SECOURS",
          siren: "123456789",
          siege: {
            siret: "12345678901234",
            adresse: "123 RUE DE LA PAIX",
            code_postal: "75001",
            libelle_commune: "PARIS",
          },
          nature_juridique: "9220",
          matching_etablissements: [
            {
              siret: "12345678901234",
              adresse: "123 RUE DE LA PAIX",
              code_postal: "75001",
              libelle_commune: "PARIS",
            },
          ],
        },
      ],
    };

    (mockedAxios.get as Mock).mockResolvedValueOnce({ data: mockData });

    const result = await SiretService.searchBySiret("12345678901234");

    expect(result).toEqual({
      name: "ASSOCIATION DE SECOURS",
      siret: "12345678901234",
      address: "123 RUE DE LA PAIX",
      postalCode: "75001",
      city: "PARIS",
      legalStatus: "9220",
    });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("search"),
      {
        params: { q: "12345678901234", per_page: 1 },
      }
    );
  });

  it("should return null if no results are found", async () => {
    (mockedAxios.get as Mock).mockResolvedValueOnce({ data: { results: [] } });

    const result = await SiretService.searchBySiret("12345678901234");

    expect(result).toBeNull();
  });

  it("should throw an error if SIRET is invalid", async () => {
    await expect(SiretService.searchBySiret("invalid")).rejects.toThrow(
      "Le SIRET doit contenir 14 chiffres"
    );
  });

  it("should throw an error if API request fails", async () => {
    (mockedAxios.get as Mock).mockRejectedValueOnce(new Error("API Error"));

    await expect(SiretService.searchBySiret("12345678901234")).rejects.toThrow(
      "API Error"
    );
  });
});
