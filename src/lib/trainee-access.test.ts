import { describe, it, expect } from "vitest";
import {
  accessFingerprint,
  buildAccessUrl,
  checkInscriptionAccess,
  generateAccessToken,
  getAccessExpiry,
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

describe("getAccessExpiry", () => {
  it("expire 90 jours après la fin de session, en fin de journée", () => {
    const expiry = getAccessExpiry({
      startDate: new Date("2026-11-12T00:00:00Z"),
      endDate: new Date("2026-11-16T00:00:00Z"),
    });
    expect(expiry).not.toBeNull();
    expect(expiry!.getTime()).toBeGreaterThan(
      new Date("2027-02-14T00:00:00Z").getTime()
    );
    expect(expiry!.getTime()).toBeLessThan(
      new Date("2027-02-15T12:00:00Z").getTime()
    );
  });

  it("se rabat sur la date de début sans date de fin", () => {
    const expiry = getAccessExpiry({
      startDate: new Date("2026-11-12T00:00:00Z"),
      endDate: null,
    });
    expect(expiry!.getTime()).toBeLessThan(
      new Date("2027-02-11T12:00:00Z").getTime()
    );
  });

  it("n'expire pas si la session n'a aucune date", () => {
    expect(getAccessExpiry({ startDate: null, endDate: null })).toBeNull();
  });
});

describe("checkInscriptionAccess", () => {
  const now = new Date("2026-11-13T10:00:00Z");
  const fp = accessFingerprint(hashAccessToken("token-valide"));

  it("autorise un accès valide", () => {
    expect(checkInscriptionAccess(inscription(), fp, now)).toBeNull();
  });

  it("autorise sans empreinte (échange initial du token)", () => {
    expect(checkInscriptionAccess(inscription(), null, now)).toBeNull();
  });

  it("refuse un lien révoqué", () => {
    expect(
      checkInscriptionAccess(inscription({ accessTokenHash: null }), fp, now)
    ).toBe("revoked");
  });

  it("refuse un cookie dont l'empreinte ne correspond plus (lien régénéré)", () => {
    expect(
      checkInscriptionAccess(
        inscription({ accessTokenHash: hashAccessToken("nouveau-token") }),
        fp,
        now
      )
    ).toBe("revoked");
  });

  it("refuse un stagiaire anonymisé", () => {
    expect(
      checkInscriptionAccess(inscription({ isAnonymized: true }), fp, now)
    ).toBe("anonymized");
  });

  it("refuse un lien expiré", () => {
    expect(
      checkInscriptionAccess(inscription(), fp, new Date("2027-03-01"))
    ).toBe("expired");
  });
});
