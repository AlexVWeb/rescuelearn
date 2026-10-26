import { describe, it, expect } from "vitest";
import {
  FEDERATIONS,
  federationFromName,
  federationLabel,
} from "./federations";

describe("federationFromName", () => {
  it("reconnaît les libellés historiques du formulaire", () => {
    for (const [value, label] of Object.entries(FEDERATIONS)) {
      if (value === "AUTRE") continue;
      expect(federationFromName(label)).toBe(value);
    }
  });

  it("ignore la casse et les espaces autour", () => {
    expect(
      federationFromName("  fédération des secouristes français croix blanche ")
    ).toBe("CROIX_BLANCHE");
  });

  it("classe un texte inconnu en AUTRE", () => {
    expect(federationFromName("Secouristes du Lot")).toBe("AUTRE");
  });

  it("renvoie null pour une valeur vide", () => {
    expect(federationFromName(null)).toBeNull();
    expect(federationFromName("   ")).toBeNull();
  });
});

describe("federationLabel", () => {
  it("donne le libellé de la fédération", () => {
    expect(federationLabel("FFSS", null)).toBe(FEDERATIONS.FFSS);
  });

  it("utilise le nom libre pour AUTRE", () => {
    expect(federationLabel("AUTRE", "Secouristes du Lot")).toBe(
      "Secouristes du Lot"
    );
    expect(federationLabel("AUTRE", null)).toBe("Autre fédération");
  });

  it("renvoie null sans fédération", () => {
    expect(federationLabel(null, null)).toBeNull();
  });
});
