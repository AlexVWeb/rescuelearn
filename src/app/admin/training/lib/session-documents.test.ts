import { describe, it, expect } from "vitest";
import {
  MAX_DOCUMENT_BYTES,
  defaultDocumentTitle,
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

  it("produit un nom sûr pour la clé de stockage", () => {
    expect(safeFileBaseName("Recos PSE ../2024 é.pdf")).toBe(
      "Recos_PSE_2024_e"
    );
  });
});
