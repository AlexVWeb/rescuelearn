import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import {
  computeFilieres,
  computeValidCompetences,
  computeNextExpiry,
} from "./trainee-validity";

const NOW = dayjs("2026-01-01");

// Helpers
const extValid = (type: string, isFC = false) => ({
  type,
  obtainedAt: "2025-01-01", // expiry: 2026-12-31 → valid on 2026-01-01
  isFC,
});
const extExpired = (type: string, isFC = false) => ({
  type,
  obtainedAt: "2024-01-01", // expiry: 2025-12-31 → expired on 2026-01-01
  isFC,
});
const platPresent = (type: string, startDate: string, isFC = false) => ({
  status: "présent",
  trainingSession: { type, startDate, isFC },
});
const platInscrit = (type: string, startDate: string) => ({
  status: "inscrit",
  trainingSession: { type, startDate, isFC: false },
});

describe("computeFilieres", () => {
  it("returns empty array when no trainings", () => {
    expect(computeFilieres([], [], NOW)).toEqual([]);
  });

  it("computes valid filiere from external training", () => {
    const result = computeFilieres([], [extValid("PSC")], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("PSC");
    expect(result[0].expired).toBe(false);
    expect(result[0].effectiveExpiry.format("YYYY-MM-DD")).toBe("2026-12-31");
  });

  it("marks expired filiere when expiry < now", () => {
    const result = computeFilieres([], [extExpired("PSC")], NOW);
    expect(result[0].expired).toBe(true);
    expect(result[0].effectiveExpiry.format("YYYY-MM-DD")).toBe("2025-12-31");
  });

  it("only counts platform inscriptions with status présent", () => {
    const result = computeFilieres([platInscrit("PSC", "2025-06-01")], [], NOW);
    expect(result).toHaveLength(0);
  });

  it("uses the latest expiry when multiple trainings of same type", () => {
    const result = computeFilieres(
      [],
      [extExpired("PSC"), extValid("PSC")],
      NOW
    );
    expect(result).toHaveLength(1);
    expect(result[0].expired).toBe(false);
    expect(result[0].effectiveExpiry.format("YYYY-MM-DD")).toBe("2026-12-31");
  });

  it("sets diplomaDate from non-FC trainings", () => {
    const result = computeFilieres(
      [platPresent("PSC", "2025-01-01", false)],
      [],
      NOW
    );
    expect(result[0].diplomaDate).toBeTruthy();
  });

  it("sets lastFCDate from FC trainings", () => {
    const result = computeFilieres([], [extValid("PSC", true)], NOW);
    expect(result[0].lastFCDate).toBeTruthy();
    expect(result[0].diplomaDate).toBeFalsy();
  });

  it("handles multiple types independently", () => {
    const result = computeFilieres(
      [],
      [extValid("PSC"), extExpired("PSE1")],
      NOW
    );
    expect(result).toHaveLength(2);
    const psc = result.find((f) => f.type === "PSC")!;
    const pse1 = result.find((f) => f.type === "PSE1")!;
    expect(psc.expired).toBe(false);
    expect(pse1.expired).toBe(true);
  });
});

describe("computeValidCompetences", () => {
  it("returns empty array for no trainings", () => {
    expect(computeValidCompetences([], [], NOW)).toEqual([]);
  });

  it("returns empty array when all expired", () => {
    expect(computeValidCompetences([], [extExpired("PSC")], NOW)).toEqual([]);
  });

  it("returns valid types only", () => {
    const result = computeValidCompetences(
      [],
      [extValid("PSC"), extExpired("PSE1")],
      NOW
    );
    expect(result).toEqual(["PSC"]);
  });

  it("includes type when platform training is présent and valid", () => {
    const result = computeValidCompetences(
      [platPresent("PSE2", "2025-06-01")],
      [],
      NOW
    );
    expect(result).toContain("PSE2");
  });

  it("excludes type when platform training is not présent", () => {
    const result = computeValidCompetences(
      [platInscrit("PSE2", "2025-06-01")],
      [],
      NOW
    );
    expect(result).not.toContain("PSE2");
  });

  it("returns multiple valid types", () => {
    const result = computeValidCompetences(
      [platPresent("PSE1", "2025-01-01")],
      [extValid("PSC")],
      NOW
    );
    expect(result).toHaveLength(2);
    expect(result).toContain("PSC");
    expect(result).toContain("PSE1");
  });
});

describe("computeNextExpiry", () => {
  it("returns null when no trainings", () => {
    expect(computeNextExpiry([], [], NOW)).toBeNull();
  });

  it("returns null when all competences expired", () => {
    expect(computeNextExpiry([], [extExpired("PSC")], NOW)).toBeNull();
  });

  it("returns the single valid competence", () => {
    const result = computeNextExpiry([], [extValid("PSC")], NOW);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("PSC");
    expect(result!.expiryDate.format("YYYY-MM-DD")).toBe("2026-12-31");
  });

  it("returns the soonest expiry when multiple types expire same year", () => {
    const result = computeNextExpiry(
      [],
      [extValid("PSC"), extValid("PSE1")],
      NOW
    );
    expect(result).not.toBeNull();
    expect(result!.expiryDate.format("YYYY-MM-DD")).toBe("2026-12-31");
  });

  it("returns the earlier expiry when types expire different years", () => {
    const result = computeNextExpiry(
      [],
      [
        { type: "PSC", obtainedAt: "2025-01-01", isFC: false },
        { type: "PSE1", obtainedAt: "2026-01-01", isFC: false },
      ],
      NOW
    );
    expect(result!.type).toBe("PSC");
    expect(result!.expiryDate.format("YYYY-MM-DD")).toBe("2026-12-31");
  });

  it("ignores expired types when finding soonest", () => {
    const result = computeNextExpiry(
      [],
      [extExpired("PSC"), extValid("PSE1")],
      NOW
    );
    expect(result!.type).toBe("PSE1");
  });
});
