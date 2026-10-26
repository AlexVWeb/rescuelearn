import { describe, it, expect } from "vitest";
import { checkCanEdit, checkEvaluationEligibility } from "./eligibility";

const eligible = {
  sessionStatus: "terminée",
  isAnonymized: false,
  emargementStatuses: ["absent", "validé"],
  sessionEnd: new Date("2026-10-21T15:30:00Z"),
};

describe("checkEvaluationEligibility", () => {
  it("éligible avec au moins un émargement validé", () => {
    expect(checkEvaluationEligibility(eligible)).toBeNull();
  });

  it("refuse sans émargement validé", () => {
    expect(
      checkEvaluationEligibility({
        ...eligible,
        emargementStatuses: ["en_attente", "absent"],
      })
    ).toBe("not_attended");
    expect(
      checkEvaluationEligibility({ ...eligible, emargementStatuses: [] })
    ).toBe("not_attended");
  });

  it("refuse une session annulée, même avec émargement", () => {
    expect(
      checkEvaluationEligibility({ ...eligible, sessionStatus: "annulée" })
    ).toBe("session_cancelled");
  });

  it("refuse un stagiaire anonymisé", () => {
    expect(
      checkEvaluationEligibility({ ...eligible, isAnonymized: true })
    ).toBe("anonymized");
  });

  it("refuse une session sans créneau", () => {
    expect(checkEvaluationEligibility({ ...eligible, sessionEnd: null })).toBe(
      "no_slots"
    );
  });
});

describe("checkCanEdit", () => {
  it("modifiable seulement pendant la fenêtre", () => {
    expect(checkCanEdit("open")).toBeNull();
    expect(checkCanEdit("upcoming")).toBe("not_open");
    expect(checkCanEdit("closed")).toBe("closed");
  });
});
