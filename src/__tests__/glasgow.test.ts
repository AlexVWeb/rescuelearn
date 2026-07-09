import { describe, it, expect } from "vitest";

// Testing Glasgow scoring logic and clinical thresholds
const calculateGlasgow = (y: number, v: number, m: number) => {
  return y + v + m;
};

const getClinicalInterpretation = (scoreTotal: number) => {
  if (scoreTotal === 15) {
    return { level: "normal", title: "Conscience normale" };
  }
  if (scoreTotal >= 13) {
    return { level: "light", title: "Altération légère de la conscience" };
  }
  if (scoreTotal >= 9) {
    return { level: "moderate", title: "Altération modérée de la conscience" };
  }
  return { level: "severe", title: "Coma / Altération grave (Score ≤ 8)" };
};

describe("Calculateur Glasgow - Logique de notation", () => {
  it("calcule correctement le score maximal (état de conscience normale)", () => {
    const score = calculateGlasgow(4, 5, 6);
    expect(score).toBe(15);
    const interpretation = getClinicalInterpretation(score);
    expect(interpretation.level).toBe("normal");
    expect(interpretation.title).toBe("Conscience normale");
  });

  it("calcule correctement le score minimal (coma profond)", () => {
    const score = calculateGlasgow(1, 1, 1);
    expect(score).toBe(3);
    const interpretation = getClinicalInterpretation(score);
    expect(interpretation.level).toBe("severe");
    expect(interpretation.title).toContain("Coma");
  });

  it("identifie correctement la limite critique de 8 (coma / bilan jaune)", () => {
    const scoreComa = calculateGlasgow(2, 2, 4); // 8
    expect(scoreComa).toBe(8);
    const interpretationComa = getClinicalInterpretation(scoreComa);
    expect(interpretationComa.level).toBe("severe");

    const scoreConscient = calculateGlasgow(3, 3, 3); // 9
    expect(scoreConscient).toBe(9);
    const interpretationConscient = getClinicalInterpretation(scoreConscient);
    expect(interpretationConscient.level).toBe("moderate");
  });

  it("évalue correctement l'altération légère (scores 13 et 14)", () => {
    expect(getClinicalInterpretation(13).level).toBe("light");
    expect(getClinicalInterpretation(14).level).toBe("light");
  });
});
