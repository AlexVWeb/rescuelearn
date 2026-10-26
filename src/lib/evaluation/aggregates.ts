import {
  allQuestions,
  type ChoiceOption,
  type Question,
  type Questionnaire,
  type RatingScale,
} from "./questionnaires";
import type { EvaluationAnswers } from "./schemas";

// Synthèse des réponses soumises pour l'organisme. Sous le seuil, seul le
// taux de réponse est donné : le détail permettrait de deviner qui a répondu.

export const MIN_RESPONSES_FOR_DETAIL = 5;

export type QuestionAggregate =
  | {
      kind: "rating_1_4";
      id: string;
      label: string;
      scale: RatingScale;
      count: number;
      mean: number | null;
      // Nombre de réponses pour les notes 1 à 4
      distribution: [number, number, number, number];
    }
  | {
      kind: "nps";
      id: string;
      label: string;
      count: number;
      // De -100 à 100 : % promoteurs (9-10) - % détracteurs (0-6)
      score: number | null;
      promoters: number;
      passives: number;
      detractors: number;
    }
  | {
      kind: "yes_no";
      id: string;
      label: string;
      count: number;
      yes: number;
      no: number;
    }
  | {
      kind: "single_choice" | "multi_choice";
      id: string;
      label: string;
      count: number;
      options: (ChoiceOption & { count: number })[];
    }
  | {
      kind: "free_text";
      id: string;
      label: string;
      count: number;
      texts: string[];
    };

export interface EvaluationAggregates {
  eligibleCount: number;
  submittedCount: number;
  // 0 à 1, null sans stagiaire éligible
  responseRate: number | null;
  detailed: boolean;
  questions: QuestionAggregate[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function valuesOf(question: Question, responses: EvaluationAnswers[]) {
  return responses
    .map((answers) => answers[question.id])
    .filter((value) => value !== undefined);
}

function aggregateQuestion(
  question: Question,
  responses: EvaluationAnswers[]
): QuestionAggregate {
  const values = valuesOf(question, responses);
  const base = { id: question.id, label: question.label };

  switch (question.kind) {
    case "rating_1_4": {
      const notes = values.filter(
        (value): value is number => typeof value === "number"
      );
      const distribution: [number, number, number, number] = [0, 0, 0, 0];
      for (const note of notes) {
        if (note >= 1 && note <= 4) distribution[note - 1] += 1;
      }
      const sum = notes.reduce((total, note) => total + note, 0);
      return {
        ...base,
        kind: "rating_1_4",
        scale: question.scale,
        count: notes.length,
        mean: notes.length > 0 ? round1(sum / notes.length) : null,
        distribution,
      };
    }
    case "nps": {
      const notes = values.filter(
        (value): value is number => typeof value === "number"
      );
      const promoters = notes.filter((note) => note >= 9).length;
      const detractors = notes.filter((note) => note <= 6).length;
      return {
        ...base,
        kind: "nps",
        count: notes.length,
        score:
          notes.length > 0
            ? Math.round(((promoters - detractors) / notes.length) * 100)
            : null,
        promoters,
        passives: notes.length - promoters - detractors,
        detractors,
      };
    }
    case "yes_no": {
      const answers = values.filter(
        (value): value is boolean => typeof value === "boolean"
      );
      const yes = answers.filter(Boolean).length;
      return {
        ...base,
        kind: "yes_no",
        count: answers.length,
        yes,
        no: answers.length - yes,
      };
    }
    case "single_choice":
    case "multi_choice": {
      const selections = values.map((value) =>
        Array.isArray(value) ? value : [value]
      );
      return {
        ...base,
        kind: question.kind,
        count: selections.length,
        options: question.options.map((option) => ({
          ...option,
          count: selections.filter((selected) =>
            selected.includes(option.value)
          ).length,
        })),
      };
    }
    case "free_text": {
      // Ordre alphabétique : l'ordre d'envoi ne relie pas un texte à un stagiaire
      const texts = values
        .filter(
          (value): value is string => typeof value === "string" && value !== ""
        )
        .sort((a, b) => a.localeCompare(b, "fr"));
      return { ...base, kind: "free_text", count: texts.length, texts };
    }
  }
}

export function computeAggregates(
  questionnaire: Questionnaire,
  submitted: EvaluationAnswers[],
  eligibleCount: number
): EvaluationAggregates {
  const submittedCount = submitted.length;
  const detailed = submittedCount >= MIN_RESPONSES_FOR_DETAIL;

  return {
    eligibleCount,
    submittedCount,
    responseRate: eligibleCount > 0 ? submittedCount / eligibleCount : null,
    detailed,
    questions: detailed
      ? allQuestions(questionnaire).map((question) =>
          aggregateQuestion(question, submitted)
        )
      : [],
  };
}
