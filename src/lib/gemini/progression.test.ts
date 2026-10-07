import { describe, expect, it } from "vitest";
import { findIncompleteExercise } from "./progression";

const quiz = {
  type: "QUIZ_QUESTION",
  questionText: "Quelle est la première action ?",
  options: ["Protéger", "Alerter", "Secourir", "Attendre"],
  correctAnswer: 0,
};

describe("findIncompleteExercise", () => {
  it("accepte une leçon complète", () => {
    expect(
      findIncompleteExercise([
        { type: "MICRO_COURSE", courseContent: "# Cours" },
        quiz,
        { type: "FLASHCARD", flashcardInfo: "Notion clé" },
      ])
    ).toBeNull();
  });

  it("rejette un quiz sans options", () => {
    expect(findIncompleteExercise([{ ...quiz, options: [] }])).toMatch(
      /options manquantes/
    );
  });

  it("rejette un quiz avec une option vide", () => {
    expect(
      findIncompleteExercise([{ ...quiz, options: ["A", "B", "", "D"] }])
    ).toMatch(/options manquantes/);
  });

  it("rejette un quiz sans question ou avec une bonne réponse hors bornes", () => {
    expect(findIncompleteExercise([{ ...quiz, questionText: " " }])).toMatch(
      /question vide/
    );
    expect(findIncompleteExercise([{ ...quiz, correctAnswer: 4 }])).toMatch(
      /bonne réponse invalide/
    );
  });

  it("rejette un cours ou une fiche vide", () => {
    expect(findIncompleteExercise([{ type: "MICRO_COURSE" }])).toMatch(
      /cours vide/
    );
    expect(findIncompleteExercise([{ type: "FLASHCARD" }])).toMatch(
      /fiche vide/
    );
  });
});
