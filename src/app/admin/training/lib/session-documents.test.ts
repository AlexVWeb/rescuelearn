import { describe, it, expect } from "vitest";
import {
  MAX_DOCUMENT_BYTES,
  defaultDocumentTitle,
  formatVisibleFrom,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  matchesDocumentSignature,
  safeFileBaseName,
  validateDocumentUpload,
} from "./session-documents";

const PDF = "application/pdf";
const PPTX =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

describe("validateDocumentUpload", () => {
  it("accepte un PDF de taille raisonnable", () => {
    expect(validateDocumentUpload({ mimeType: PDF, size: 1024 })).toBeNull();
  });

  it("refuse un format non prévu", () => {
    expect(
      validateDocumentUpload({ mimeType: "application/zip", size: 1024 })
    ).toMatch(/Format non supporté/);
  });

  it("refuse un fichier vide ou au-delà de 25 Mo", () => {
    expect(validateDocumentUpload({ mimeType: PDF, size: 0 })).toMatch(/vide/);
    expect(
      validateDocumentUpload({ mimeType: PDF, size: MAX_DOCUMENT_BYTES + 1 })
    ).toMatch(/25 Mo/);
  });
});

describe("matchesDocumentSignature", () => {
  it("reconnaît un vrai PDF", () => {
    expect(
      matchesDocumentSignature(PDF, Buffer.from("%PDF-1.7\n", "latin1"))
    ).toBe(true);
  });

  it("refuse un fichier dont le contenu ne correspond pas au type annoncé", () => {
    expect(
      matchesDocumentSignature(PDF, Buffer.from("<html><script>", "latin1"))
    ).toBe(false);
  });

  it("vérifie l'enveloppe ZIP d'un PPTX", () => {
    expect(
      matchesDocumentSignature(PPTX, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]))
    ).toBe(true);
  });
});

describe("noms de fichiers", () => {
  it("dérive un titre lisible du nom de fichier", () => {
    expect(defaultDocumentTitle("livret_stagiaire-PSE1.pdf")).toBe(
      "livret stagiaire PSE1"
    );
  });

  it("ne laisse pas de double espace autour des tirets", () => {
    expect(
      defaultDocumentTitle("6- RIC-RIF PICF version 5 février 2026.pdf")
    ).toBe("6 RIC RIF PICF version 5 février 2026");
  });

  it("produit un nom sûr pour la clé de stockage", () => {
    expect(safeFileBaseName("Recos PSE ../2024 é.pdf")).toBe(
      "Recos_PSE_2024_e"
    );
  });
});

describe("visibilité à date et heure", () => {
  it("produit une valeur lisible par <input type=datetime-local>", () => {
    const value = toDateTimeLocalValue(new Date(2026, 10, 12, 14, 5));
    expect(value).toBe("2026-11-12T14:05");
  });

  it("fait l'aller-retour saisie → Date → saisie sans décalage", () => {
    // Jour du passage à l'heure d'hiver
    const value = "2026-10-25T09:30";
    expect(toDateTimeLocalValue(fromDateTimeLocalValue(value))).toBe(value);
    expect(fromDateTimeLocalValue(value)).toEqual(new Date(2026, 9, 25, 9, 30));
  });

  it("champ vidé : visible tout de suite", () => {
    expect(fromDateTimeLocalValue("")).toBeNull();
  });

  it("vide si aucune date", () => {
    expect(toDateTimeLocalValue(null)).toBe("");
  });

  it("affiche le jour et l'heure", () => {
    expect(formatVisibleFrom(new Date(2026, 10, 12, 14, 0))).toBe(
      "12 nov. à 14h00"
    );
  });
});
