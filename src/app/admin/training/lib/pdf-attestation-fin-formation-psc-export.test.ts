import { describe, it, expect } from "vitest";
import {
  attestationFileName,
  buildAttestationDocument,
} from "./pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "../types";

const inscription = {
  id: "ins-1",
  traineeId: "t-1",
  trainingSessionId: "ts-1",
  status: "présent",
  attestationResult: "acquis",
  attestationValidatedAt: new Date("2026-11-16"),
  trainee: { firstName: "Léa", lastName: "Martin" },
} as unknown as Inscription;

describe("buildAttestationDocument", () => {
  // L'espace stagiaire génère l'attestation côté serveur (Node), sans navigateur
  it("produit un PDF côté serveur", () => {
    const doc = buildAttestationDocument(
      {
        title: "PSE1 · Formation initiale",
        location: "Toulouse",
        startDate: new Date("2026-11-12"),
        slots: [],
      },
      inscription,
      { lastName: "Bernard", firstName: "Hugo" }
    );
    const bytes = Buffer.from(doc.output("arraybuffer"));
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("nomme le fichier d'après le stagiaire", () => {
    expect(attestationFileName(inscription)).toBe("Attestation_Martin_Léa.pdf");
  });
});
