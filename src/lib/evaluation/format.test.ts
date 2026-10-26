import { describe, it, expect } from "vitest";
import { formatAnswer } from "./format";
import { allQuestions, getCurrentQuestionnaire } from "./questionnaires";

const questions = Object.fromEntries(
  [
    ...allQuestions(getCurrentQuestionnaire("chaud")),
    ...allQuestions(getCurrentQuestionnaire("froid")),
  ].map((q) => [q.id, q])
);

describe("formatAnswer", () => {
  it("note sur 4 avec son libellé d'échelle", () => {
    expect(formatAnswer(questions.satisfaction_globale, 3)).toBe(
      "3 sur 4 · Satisfait"
    );
    expect(formatAnswer(questions.objectifs_atteints, 1)).toBe(
      "1 sur 4 · Pas du tout d'accord"
    );
  });

  it("NPS, oui / non, choix et texte", () => {
    expect(formatAnswer(questions.nps, 0)).toBe("0 sur 10");
    expect(formatAnswer(questions.attentes, false)).toBe("Non");
    expect(formatAnswer(questions.rythme, "trop_rapide")).toBe("Trop rapide");
    expect(formatAnswer(questions.gestes_utilises, ["alerter", "pls"])).toBe(
      "Alerter les secours, Position latérale de sécurité"
    );
    expect(formatAnswer(questions.suggestions, "Plus de pratique")).toBe(
      "Plus de pratique"
    );
  });

  it("null sans réponse ou pour une valeur incohérente", () => {
    expect(formatAnswer(questions.nps, undefined)).toBeNull();
    expect(formatAnswer(questions.nps, "dix")).toBeNull();
    expect(formatAnswer(questions.satisfaction_globale, true)).toBeNull();
    expect(formatAnswer(questions.attentes, 1)).toBeNull();
    expect(formatAnswer(questions.rythme, "inconnu")).toBeNull();
    expect(formatAnswer(questions.suggestions, "")).toBeNull();
  });
});
