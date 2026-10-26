import { describe, it, expect } from "vitest";
import { computeAggregates, MIN_RESPONSES_FOR_DETAIL } from "./aggregates";
import { getCurrentQuestionnaire } from "./questionnaires";
import type { EvaluationAnswers } from "./schemas";

const hot = getCurrentQuestionnaire("chaud");
const cold = getCurrentQuestionnaire("froid");

const responses: EvaluationAnswers[] = [
  {
    satisfaction_globale: 4,
    nps: 10,
    attentes: true,
    rythme: "adapte",
    suggestions: "Zèbre",
  },
  { satisfaction_globale: 3, nps: 9, attentes: true, rythme: "adapte" },
  {
    satisfaction_globale: 4,
    nps: 8,
    attentes: false,
    rythme: "trop_rapide",
    suggestions: "Abricot",
  },
  { satisfaction_globale: 2, nps: 6, attentes: true, rythme: "adapte" },
  { satisfaction_globale: 4, nps: 3, attentes: true },
];

function question(id: string, agg = computeAggregates(hot, responses, 8)) {
  const found = agg.questions.find((q) => q.id === id);
  if (!found) throw new Error(`question ${id} absente`);
  return found;
}

describe("computeAggregates", () => {
  it("masque le détail sous le seuil, garde le taux de réponse", () => {
    const agg = computeAggregates(
      hot,
      responses.slice(0, MIN_RESPONSES_FOR_DETAIL - 1),
      10
    );
    expect(agg).toEqual({
      eligibleCount: 10,
      submittedCount: 4,
      responseRate: 0.4,
      detailed: false,
      questions: [],
    });
  });

  it("donne le détail à partir de 5 réponses", () => {
    const agg = computeAggregates(hot, responses, 8);
    expect(agg.detailed).toBe(true);
    expect(agg.responseRate).toBe(5 / 8);
    expect(agg.questions).toHaveLength(12);
  });

  it("taux de réponse null sans stagiaire éligible", () => {
    expect(computeAggregates(hot, [], 0).responseRate).toBeNull();
  });

  it("moyenne arrondie et distribution des notes", () => {
    expect(question("satisfaction_globale")).toMatchObject({
      count: 5,
      mean: 3.4,
      distribution: [0, 1, 1, 3],
    });
  });

  it("question sans réponse : moyenne nulle", () => {
    expect(question("supports")).toMatchObject({ count: 0, mean: null });
  });

  it("NPS : promoteurs 9-10, passifs 7-8, détracteurs 0-6", () => {
    // 2 promoteurs, 1 passif, 2 détracteurs sur 5 → 0
    expect(question("nps")).toMatchObject({
      count: 5,
      promoters: 2,
      passives: 1,
      detractors: 2,
      score: 0,
    });
  });

  it("oui / non", () => {
    expect(question("attentes")).toMatchObject({ count: 5, yes: 4, no: 1 });
  });

  it("choix unique : compte par option, réponses absentes exclues", () => {
    const rythme = question("rythme");
    expect(rythme.count).toBe(4);
    if (rythme.kind !== "single_choice") throw new Error("type inattendu");
    expect(rythme.options.map((o) => [o.value, o.count])).toEqual([
      ["trop_lent", 0],
      ["adapte", 3],
      ["trop_rapide", 1],
    ]);
  });

  it("choix multiple : une réponse compte pour chaque option cochée", () => {
    const multi: EvaluationAnswers[] = Array.from({ length: 5 }, (_, i) => ({
      gestes_utilises: i < 3 ? ["pls", "alerter"] : ["rcp"],
    }));
    const agg = computeAggregates(cold, multi, 5);
    const gestes = agg.questions.find((q) => q.id === "gestes_utilises");
    if (gestes?.kind !== "multi_choice") throw new Error("type inattendu");
    expect(gestes.count).toBe(5);
    expect(
      Object.fromEntries(gestes.options.map((o) => [o.value, o.count]))
    ).toMatchObject({
      pls: 3,
      alerter: 3,
      rcp: 2,
      proteger: 0,
    });
  });

  it("textes libres triés, sans lien avec l'ordre d'envoi", () => {
    expect(question("suggestions")).toMatchObject({
      count: 2,
      texts: ["Abricot", "Zèbre"],
    });
  });
});
