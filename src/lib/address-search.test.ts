import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mergeSuggestions,
  parseBanResponse,
  parsePhotonResponse,
  searchAddresses,
} from "./address-search";

describe("parseBanResponse", () => {
  it("garde le libellé et le contexte BAN", () => {
    const result = parseBanResponse({
      features: [
        {
          properties: {
            id: "75102_6998_00012",
            label: "12 Rue de la Paix 75002 Paris",
            context: "75, Paris, Île-de-France",
          },
        },
        { properties: {} },
      ],
    });

    expect(result).toEqual([
      {
        id: "ban:75102_6998_00012",
        label: "12 Rue de la Paix 75002 Paris",
        context: "75, Paris, Île-de-France",
        source: "ban",
      },
    ]);
  });
});

describe("parsePhotonResponse", () => {
  it("compose nom du lieu + adresse", () => {
    const [result] = parsePhotonResponse({
      features: [
        {
          properties: {
            osm_type: "W",
            osm_id: 74699749,
            name: "Gymnase Jean Jaurès",
            street: "Avenue Jean Jaurès",
            postcode: "69600",
            city: "Oullins-Pierre-Bénite",
            state: "Auvergne-Rhône-Alpes",
            country: "France",
            countrycode: "FR",
          },
        },
      ],
    });

    expect(result).toEqual({
      id: "osm:W74699749",
      label:
        "Gymnase Jean Jaurès, Avenue Jean Jaurès 69600 Oullins-Pierre-Bénite",
      context: "Auvergne-Rhône-Alpes",
      source: "osm",
    });
  });

  it("affiche le pays hors France", () => {
    const [result] = parsePhotonResponse({
      features: [
        {
          properties: {
            name: "Bruxelles",
            state: "Bruxelles-Capitale",
            country: "Belgique",
            countrycode: "BE",
          },
        },
      ],
    });

    expect(result.context).toBe("Bruxelles-Capitale, Belgique");
  });
});

describe("mergeSuggestions", () => {
  it("place la BAN en premier et retire les doublons", () => {
    const merged = mergeSuggestions(
      [{ id: "ban:1", label: "12 Rue de la Paix 75002 Paris", source: "ban" }],
      [
        { id: "osm:1", label: "12 rue de la paix 75002 Paris", source: "osm" },
        { id: "osm:2", label: "Caserne Champerret", source: "osm" },
      ]
    );

    expect(merged.map((s) => s.id)).toEqual(["ban:1", "osm:2"]);
  });

  it("respecte la limite", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `ban:${i}`,
      label: `Adresse ${i}`,
      source: "ban" as const,
    }));
    expect(mergeSuggestions(many, [], 4)).toHaveLength(4);
  });
});

describe("searchAddresses", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("n'appelle rien sous 3 caractères", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchAddresses("ab")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renvoie les résultats OSM si l'API Adresse échoue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("geopf")) return new Response("", { status: 503 });
        return Response.json({
          features: [{ properties: { name: "Salle des fêtes", city: "Lyon" } }],
        });
      })
    );

    const result = await searchAddresses("salle des fêtes lyon");
    expect(result.map((s) => s.label)).toEqual(["Salle des fêtes, Lyon"]);
  });
});
