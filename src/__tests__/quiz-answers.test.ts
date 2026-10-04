import { describe, it, expect } from "vitest";
import { answerIndex, answerLetter, shuffleOptions } from "@/lib/quiz-answers";

describe("answerIndex", () => {
  it("lit les lettres (banque de questions) et les chiffres (anciens parcours)", () => {
    expect(answerIndex("A")).toBe(0);
    expect(answerIndex("d")).toBe(3);
    expect(answerIndex("2")).toBe(2);
  });

  it("retourne -1 pour une valeur illisible", () => {
    expect(answerIndex("")).toBe(-1);
    expect(answerIndex("Z")).toBe(-1);
  });
});

describe("answerLetter", () => {
  it("convertit un index en lettre", () => {
    expect(answerLetter(0)).toBe("A");
    expect(answerLetter(3)).toBe("D");
  });

  it("retombe sur A pour un index hors limites", () => {
    expect(answerLetter(9)).toBe("A");
  });
});

describe("shuffleOptions", () => {
  it("garde la bonne réponse attachée à son texte", () => {
    const options = ["juste", "faux 1", "faux 2", "faux 3"];
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleOptions(options, 0);
      expect(shuffled.options).toHaveLength(4);
      expect(shuffled.options[shuffled.correctIndex]).toBe("juste");
      expect([...shuffled.options].sort()).toEqual([...options].sort());
    }
  });

  it("utilise le générateur aléatoire fourni", () => {
    // random() = 0 : chaque élément est échangé avec le premier
    const shuffled = shuffleOptions(["a", "b", "c"], 2, () => 0);
    expect(shuffled.options[shuffled.correctIndex]).toBe("c");
  });
});
