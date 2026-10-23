import { describe, it, expect } from "vitest";
import { extractText } from "unpdf";
import { renderSignedAttestationPDF } from "./pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "../types";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("renderSignedAttestationPDF", () => {
  it("prints the signer, the signing date and the reference", async () => {
    const pdf = await renderSignedAttestationPDF(
      { title: "PSC", location: "Lyon", startDate: null, slots: [] },
      {
        id: "ins-1",
        attestationResult: "acquis",
        attestationValidatedAt: new Date("2026-10-01T10:00:00Z"),
        trainee: { firstName: "Léa", lastName: "MARTIN" },
      } as unknown as Inscription,
      {
        name: "DUPONT Jean",
        signedAt: new Date("2026-10-23T12:05:00Z"),
        signatureId: "sig-123",
        imageDataUrl: TINY_PNG,
      }
    );

    const { text } = await extractText(new Uint8Array(pdf), {
      mergePages: true,
    });
    expect(text).toContain("DUPONT Jean");
    expect(text).toContain("Le, 23/10/2026");
    expect(text).toContain("Signé électroniquement par DUPONT Jean");
    expect(text).toContain("14h05"); // heure de Paris
    expect(text).toContain("sig-123");
  });
});
