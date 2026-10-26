import { z } from "zod";
import {
  allQuestions,
  FREE_TEXT_MAX_LENGTH,
  type Question,
  type Questionnaire,
} from "./questionnaires";

// Validation des réponses, partagée par le formulaire (retour immédiat) et
// les Server Actions (source de vérité, revalidation systématique).

export type AnswerValue = number | boolean | string | string[];
export type EvaluationAnswers = Record<string, AnswerValue>;

/** "draft" : tout est facultatif ; "submit" : les questions obligatoires sont exigées. */
export type ValidationMode = "draft" | "submit";

export type ValidationResult =
  | { success: true; answers: EvaluationAnswers }
  | { success: false; fieldErrors: Record<string, string> };

export const REQUIRED_MESSAGE = "Merci de répondre à cette question.";

/** Le texte libre est affiché tel quel (échappé par React) : on retire toute balise. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>?/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function optionValues(question: Question): string[] {
  return "options" in question
    ? question.options.map((option) => option.value)
    : [];
}

function questionSchema(question: Question): z.ZodType<AnswerValue> {
  switch (question.kind) {
    case "rating_1_4":
      return z
        .number({ error: "Choisissez une note de 1 à 4." })
        .int()
        .min(1, "Choisissez une note de 1 à 4.")
        .max(4, "Choisissez une note de 1 à 4.");
    case "nps":
      return z
        .number({ error: "Choisissez une note de 0 à 10." })
        .int()
        .min(0, "Choisissez une note de 0 à 10.")
        .max(10, "Choisissez une note de 0 à 10.");
    case "yes_no":
      return z.boolean({ error: "Répondez par oui ou par non." });
    case "single_choice": {
      const values = optionValues(question);
      return z
        .string({ error: "Choix invalide." })
        .refine((value) => values.includes(value), "Choix invalide.");
    }
    case "multi_choice": {
      const values = optionValues(question);
      return z
        .array(
          z
            .string()
            .refine((value) => values.includes(value), "Choix invalide.")
        )
        .max(values.length, "Choix invalide.")
        .refine(
          (selected) => new Set(selected).size === selected.length,
          "Choix invalide."
        );
    }
    case "free_text":
      return z
        .string({ error: "Texte invalide." })
        .max(
          FREE_TEXT_MAX_LENGTH,
          `${FREE_TEXT_MAX_LENGTH} caractères maximum.`
        )
        .transform(stripHtml);
  }
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function buildAnswersSchema(
  questionnaire: Questionnaire,
  mode: ValidationMode
) {
  const questions = allQuestions(questionnaire);
  const shape = Object.fromEntries(
    questions.map((question) => [
      question.id,
      questionSchema(question).optional(),
    ])
  );

  return z
    .object(shape)
    .strict()
    .superRefine((answers, ctx) => {
      if (mode === "draft") return;
      for (const question of questions) {
        if (question.required && isEmpty(answers[question.id])) {
          ctx.addIssue({
            code: "custom",
            path: [question.id],
            message: REQUIRED_MESSAGE,
          });
        }
      }
    });
}

/** Retire les réponses vides (texte effacé, cases toutes décochées). */
function compact(answers: Record<string, AnswerValue | undefined>) {
  const result: EvaluationAnswers = {};
  for (const [key, value] of Object.entries(answers)) {
    if (value !== undefined && !isEmpty(value)) result[key] = value;
  }
  return result;
}

export function validateAnswers(
  questionnaire: Questionnaire,
  raw: unknown,
  mode: ValidationMode
): ValidationResult {
  const parsed = buildAnswersSchema(questionnaire, mode).safeParse(raw);
  if (parsed.success) return { success: true, answers: compact(parsed.data) };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    // Clé inconnue (.strict()) : rattachée au formulaire
    const key =
      issue.code === "unrecognized_keys"
        ? "_form"
        : String(issue.path[0] ?? "_form");
    fieldErrors[key] ??= issue.message;
  }
  return { success: false, fieldErrors };
}

/**
 * Lit les réponses d'un FormData natif (radios, cases, textarea) et les
 * convertit dans les types attendus. Les champs inconnus sont ignorés ; une
 * valeur mal formée est conservée telle quelle pour que Zod la refuse.
 */
export function readAnswersFromForm(
  questionnaire: Questionnaire,
  formData: FormData
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (const question of allQuestions(questionnaire)) {
    if (question.kind === "multi_choice") {
      const values = formData
        .getAll(question.id)
        .filter((value): value is string => typeof value === "string");
      if (values.length > 0) raw[question.id] = values;
      continue;
    }

    const value = formData.get(question.id);
    if (typeof value !== "string" || value.trim() === "") continue;

    switch (question.kind) {
      case "rating_1_4":
      case "nps": {
        const number = Number(value);
        raw[question.id] = Number.isFinite(number) ? number : value;
        break;
      }
      case "yes_no":
        raw[question.id] =
          value === "oui" ? true : value === "non" ? false : value;
        break;
      default:
        raw[question.id] = value;
    }
  }

  return raw;
}

export const CONSENT_FIELD = "consent";
export const CONSENT_MESSAGE =
  "Cochez la case pour accepter l'utilisation de vos réponses.";

/** Case à cocher native : présente avec la valeur "on" uniquement si cochée. */
export function readConsent(formData: FormData): boolean {
  return formData.get(CONSENT_FIELD) === "on";
}

/** Réponses stockées (JSON) : relues avec le schéma de leur version. */
export function parseStoredAnswers(
  questionnaire: Questionnaire,
  stored: unknown
): EvaluationAnswers {
  const result = validateAnswers(questionnaire, stored, "draft");
  return result.success ? result.answers : {};
}
