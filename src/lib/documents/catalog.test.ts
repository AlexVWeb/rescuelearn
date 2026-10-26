import { describe, it, expect } from "vitest";
import { documentTemplateSections } from "./catalog";

const ids = (sections: ReturnType<typeof documentTemplateSections>) =>
  Object.fromEntries(
    sections.map((s) => [
      s.id,
      s.templates.map((t) => `${t.id}${t.available ? "" : "?"}`),
    ])
  );

describe("documentTemplateSections", () => {
  it("regroupe communs, PSC, PSE et modèles de fédération", () => {
    expect(ids(documentTemplateSections("CROIX_BLANCHE", null))).toEqual({
      communs: ["emargement", "attestation"],
      psc: ["fise-psc", "fiche-formative"],
      pse: ["fise-pse1", "fise-pse2", "grille-pse1", "grille-pse2"],
      federation: ["pv"],
    });
  });

  it("marque les modèles de fédération absents comme indisponibles", () => {
    const sections = documentTemplateSections("FFSS", null);
    expect(ids(sections).federation).toEqual(["pv?"]);
    expect(ids(sections).communs).toEqual(["emargement", "attestation"]);
  });

  it("titre la section fédération avec son libellé", () => {
    const federation = (f: Parameters<typeof documentTemplateSections>) =>
      documentTemplateSections(...f).find((s) => s.id === "federation")?.title;
    expect(federation(["CROIX_BLANCHE", null])).toBe(
      "Modèles Fédération des Secouristes Français Croix Blanche"
    );
    expect(federation(["AUTRE", "Secouristes du Lot"])).toBe(
      "Modèles Secouristes du Lot"
    );
    expect(federation([null, null])).toBe("Modèles de fédération");
  });

  it("indique la formation de chaque modèle", () => {
    const all = documentTemplateSections("CROIX_BLANCHE", null).flatMap(
      (s) => s.templates
    );
    expect(Object.fromEntries(all.map((t) => [t.id, t.formation]))).toEqual({
      emargement: "Commun",
      attestation: "Commun",
      "fise-psc": "PSC",
      "fiche-formative": "PSC",
      "fise-pse1": "PSE1",
      "fise-pse2": "PSE2",
      "grille-pse1": "PSE1",
      "grille-pse2": "PSE2",
      pv: "Commun",
    });
  });
});
