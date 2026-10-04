import { describe, it, expect } from "vitest";
import {
  remainingCapacity,
  suggestedQuestionCount,
  topicCoverage,
} from "@/lib/topic-coverage";

describe("topicCoverage", () => {
  it("retourne le ratio questions / capacité, plafonné à 1", () => {
    expect(topicCoverage(3, 6)).toBe(0.5);
    expect(topicCoverage(10, 6)).toBe(1);
    expect(topicCoverage(0, 0)).toBe(1);
  });
});

describe("remainingCapacity", () => {
  it("ne descend jamais sous 0", () => {
    expect(remainingCapacity(2, 6)).toBe(4);
    expect(remainingCapacity(9, 6)).toBe(0);
  });
});

describe("suggestedQuestionCount", () => {
  it("additionne les capacités restantes, plafonnées à 30", () => {
    expect(
      suggestedQuestionCount([
        { questionCount: 2, capacity: 6 },
        { questionCount: 0, capacity: 5 },
      ])
    ).toBe(9);
    expect(
      suggestedQuestionCount([
        { questionCount: 0, capacity: 20 },
        { questionCount: 0, capacity: 20 },
      ])
    ).toBe(30);
  });

  it("revient à 10 quand tout est déjà couvert ou sans sujet", () => {
    expect(suggestedQuestionCount([{ questionCount: 9, capacity: 6 }])).toBe(
      10
    );
    expect(suggestedQuestionCount([])).toBe(10);
  });
});
