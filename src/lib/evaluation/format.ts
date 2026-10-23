import { RATING_SCALES, type Question } from "./questionnaires";
import type { AnswerValue } from "./schemas";

/** Réponse lisible pour le récapitulatif : « 3 · Satisfait », « Oui »… */
export function formatAnswer(
  question: Question,
  value: AnswerValue | undefined
): string | null {
  if (value === undefined) return null;
  switch (question.kind) {
    case "rating_1_4":
      return typeof value === "number"
        ? `${value} sur 4 · ${RATING_SCALES[question.scale][value - 1] ?? ""}`
        : null;
    case "nps":
      return typeof value === "number" ? `${value} sur 10` : null;
    case "yes_no":
      return typeof value === "boolean" ? (value ? "Oui" : "Non") : null;
    case "single_choice":
    case "multi_choice": {
      const values = Array.isArray(value) ? value : [String(value)];
      const labels = question.options
        .filter((option) => values.includes(option.value))
        .map((option) => option.label);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    case "free_text":
      return typeof value === "string" && value !== "" ? value : null;
  }
}
