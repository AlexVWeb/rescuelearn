import { describe, it, expect } from "vitest";
import { getCurrentQuestionnaire } from "@/lib/evaluation/questionnaires";
import type { EvaluationContext } from "@/lib/evaluation/service";
import { toEvaluationView, visibleEvaluations } from "./view";

const WINDOW = {
  opensAt: new Date("2026-10-21T15:30:00Z"),
  closesAt: new Date("2026-11-20T16:30:00Z"),
};

function context(
  overrides: Partial<EvaluationContext> = {}
): EvaluationContext {
  return {
    type: "chaud",
    questionnaire: getCurrentQuestionnaire("chaud"),
    window: WINDOW,
    state: "open",
    denial: null,
    response: null,
    ...overrides,
  };
}

const response = (status: string) => ({
  status,
  submittedAt: null,
  answers: {},
});

describe("toEvaluationView", () => {
  it("à faire, avec la date de fermeture en heure de Paris", () => {
    expect(toEvaluationView(context())).toEqual({
      type: "chaud",
      label: "Évaluation à chaud",
      status: "todo",
      dateLabel: "20 novembre",
      estimatedMinutes: 3,
    });
  });

  it("brouillon puis envoyée", () => {
    expect(
      toEvaluationView(context({ response: response("brouillon") }))?.status
    ).toBe("draft");
    expect(
      toEvaluationView(context({ response: response("soumise") }))?.status
    ).toBe("submitted");
  });

  it("à venir : date d'ouverture", () => {
    expect(toEvaluationView(context({ state: "upcoming" }))).toMatchObject({
      status: "upcoming",
      dateLabel: "21 octobre",
    });
  });

  it("close : visible seulement si envoyée", () => {
    expect(toEvaluationView(context({ state: "closed" }))).toBeNull();
    expect(
      toEvaluationView(
        context({ state: "closed", response: response("soumise") })
      )?.status
    ).toBe("submitted_closed");
  });

  it("masquée pour un stagiaire non éligible ou une session sans créneau", () => {
    expect(toEvaluationView(context({ denial: "not_attended" }))).toBeNull();
    expect(toEvaluationView(context({ window: null, state: null }))).toBeNull();
  });
});

describe("visibleEvaluations", () => {
  const cold = context({
    type: "froid",
    questionnaire: getCurrentQuestionnaire("froid"),
    state: "upcoming",
  });

  it("annonce l'évaluation à froid à côté de celle à chaud", () => {
    expect(visibleEvaluations([context(), cold]).map((v) => v.status)).toEqual([
      "todo",
      "upcoming",
    ]);
  });

  it("rien à montrer si seule une évaluation à venir subsiste", () => {
    expect(visibleEvaluations([context({ state: "closed" }), cold])).toEqual(
      []
    );
  });
});
