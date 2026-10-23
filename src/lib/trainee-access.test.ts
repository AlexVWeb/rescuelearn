import { describe, it, expect, vi } from "vitest";
import {
  accessFingerprint,
  buildAccessUrl,
  checkInscriptionAccess,
  generateAccessToken,
  hashAccessToken,
} from "./trainee-access";

function inscription(
  overrides: {
    accessTokenHash?: string | null;
    isAnonymized?: boolean;
    startDate?: Date | null;
    endDate?: Date | null;
  } = {}
) {
  return {
    accessTokenHash:
      "accessTokenHash" in overrides
        ? (overrides.accessTokenHash ?? null)
        : hashAccessToken("token-valide"),
    trainee: { isAnonymized: overrides.isAnonymized ?? false },
    trainingSession: {
      startDate: overrides.startDate ?? new Date("2026-11-12"),
      endDate:
        "endDate" in overrides
          ? (overrides.endDate ?? null)
          : new Date("2026-11-16"),
    },
  };
}

describe("generateAccessToken", () => {
  it("génère un token base64url de 256 bits et son hash", () => {
    const { token, hash } = generateAccessToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toBe(hashAccessToken(token));
  });

  it("génère des tokens différents à chaque appel", () => {
    expect(generateAccessToken().token).not.toBe(generateAccessToken().token);
  });
});

describe("hashAccessToken", () => {
  it("est déterministe et ne contient pas le token", () => {
    const hash = hashAccessToken("abc");
    expect(hash).toBe(hashAccessToken("abc"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildAccessUrl", () => {
  it("place le token dans le fragment", () => {
    expect(buildAccessUrl("https://rescuelearn.fr", "abc")).toBe(
      "https://rescuelearn.fr/espace/acces#t=abc"
    );
  });
});

describe("checkInscriptionAccess", () => {
  const fp = accessFingerprint(hashAccessToken("token-valide"));

  it("autorise un accès valide", () => {
    expect(checkInscriptionAccess(inscription(), fp)).toBeNull();
  });

  it("autorise sans empreinte (échange initial du token)", () => {
    expect(checkInscriptionAccess(inscription(), null)).toBeNull();
  });

  it("refuse un lien révoqué", () => {
    expect(
      checkInscriptionAccess(inscription({ accessTokenHash: null }), fp)
    ).toBe("revoked");
  });

  it("refuse un cookie dont l'empreinte ne correspond plus (lien régénéré)", () => {
    expect(
      checkInscriptionAccess(
        inscription({ accessTokenHash: hashAccessToken("nouveau-token") }),
        fp
      )
    ).toBe("revoked");
  });

  it("refuse un stagiaire anonymisé", () => {
    expect(
      checkInscriptionAccess(inscription({ isAnonymized: true }), fp)
    ).toBe("anonymized");
  });

  // Les documents et l'attestation restent accessibles sans limite de durée
  it("n'expire jamais, même des années après la session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2036-11-16T12:00:00Z"));
    try {
      expect(
        checkInscriptionAccess(
          inscription({ endDate: new Date("2026-11-16") }),
          fp
        )
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
