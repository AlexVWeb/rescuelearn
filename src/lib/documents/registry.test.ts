import { describe, it, expect } from "vitest";
import {
  availableDocuments,
  buildTemplateRequestMailto,
  documentHeaderLines,
  missingDocumentLabels,
  missingFederationDocuments,
} from "./registry";

const COMMON = ["emargement", "fise", "fiche-formative", "attestation"];

describe("availableDocuments", () => {
  it("ajoute le PV pour la Croix Blanche", () => {
    expect(availableDocuments("CROIX_BLANCHE")).toEqual(["pv", ...COMMON]);
  });

  it("ne donne que les documents communs aux autres fédérations", () => {
    expect(availableDocuments("FFSS")).toEqual(COMMON);
    expect(availableDocuments("AUTRE")).toEqual(COMMON);
    expect(availableDocuments(null)).toEqual(COMMON);
  });
});

describe("missingFederationDocuments", () => {
  it("est faux quand la fédération a ses modèles", () => {
    expect(missingFederationDocuments("CROIX_BLANCHE")).toBe(false);
  });

  it("est vrai sinon, y compris sans fédération", () => {
    expect(missingFederationDocuments("CROIX_ROUGE")).toBe(true);
    expect(missingFederationDocuments(null)).toBe(true);
  });
});

describe("missingDocumentLabels", () => {
  it("liste les documents propres à une fédération absents", () => {
    expect(missingDocumentLabels("FFSS")).toEqual(["PV de formation"]);
    expect(missingDocumentLabels("CROIX_BLANCHE")).toEqual([]);
  });
});

describe("documentHeaderLines", () => {
  const base = { name: "Secours Lyon", city: "Lyon", documentHeader: null };

  it("reprend les lignes saisies, sans les lignes vides", () => {
    expect(
      documentHeaderLines({
        ...base,
        documentHeader:
          " Comité Rhône \n\n  Croix Blanche\r\nAssociation de Lyon ",
      })
    ).toEqual(["Comité Rhône", "Croix Blanche", "Association de Lyon"]);
  });

  it("se replie sur le nom et la ville", () => {
    expect(documentHeaderLines(base)).toEqual(["Secours Lyon", "Lyon"]);
    expect(documentHeaderLines({ ...base, documentHeader: "  \n " })).toEqual([
      "Secours Lyon",
      "Lyon",
    ]);
  });

  it("omet la ville absente", () => {
    expect(documentHeaderLines({ ...base, city: null })).toEqual([
      "Secours Lyon",
    ]);
  });
});

describe("buildTemplateRequestMailto", () => {
  const url = buildTemplateRequestMailto({
    name: "Secours & Sauvetage",
    city: "Évry",
    federation: "FFSS",
    federationName: null,
  });

  it("vise l'adresse de contact", () => {
    expect(url.startsWith("mailto:contact@rescuelearn.fr?subject=")).toBe(true);
  });

  it("encode objet et corps", () => {
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("subject")).toBe(
      "Modèles de documents – Fédération Française de Sauvetage et de Secourisme (FFSS) – Secours & Sauvetage"
    );
    const body = params.get("body") ?? "";
    expect(body).toContain("Organisme : Secours & Sauvetage");
    expect(body).toContain("Ville : Évry");
    expect(body).toContain("- PV de formation");
    expect(body).toContain("\n");
    expect(url).not.toContain(" ");
  });

  it("gère l'absence de fédération", () => {
    const params = new URLSearchParams(
      buildTemplateRequestMailto({
        name: "Asso",
        city: null,
        federation: null,
        federationName: null,
      }).split("?")[1]
    );
    expect(params.get("subject")).toBe(
      "Modèles de documents – Fédération non renseignée – Asso"
    );
  });
});
