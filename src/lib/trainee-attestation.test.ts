import { describe, it, expect } from "vitest";
import { getAttestationState } from "./trainee-attestation";

const acquis = {
  attestationResult: "acquis",
  attestationValidatedAt: new Date("2026-11-16"),
};

describe("getAttestationState", () => {
  it("en attente tant que l'organisme n'a pas publié", () => {
    expect(getAttestationState(null, acquis)).toBe("pending");
  });

  it("disponible après publication pour un résultat acquis", () => {
    expect(getAttestationState(new Date(), acquis)).toBe("available");
  });

  it("jamais de résultat brut : « non acquis » renvoie vers l'organisme", () => {
    expect(
      getAttestationState(new Date(), {
        attestationResult: "non_acquis",
        attestationValidatedAt: new Date(),
      })
    ).toBe("contact");
  });

  it("publié sans résultat saisi : renvoie vers l'organisme", () => {
    expect(
      getAttestationState(new Date(), {
        attestationResult: null,
        attestationValidatedAt: null,
      })
    ).toBe("contact");
  });
});
