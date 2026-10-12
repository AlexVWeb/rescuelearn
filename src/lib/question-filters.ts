import type { ArchiveFilter } from "@/lib/content-archive";

// Banques de questions créées par la génération des parcours de progression
export const PROGRESSION_BANK_PREFIX = "Banque Progression";

export const QUESTION_SOURCES = ["all", "quiz", "progression", "ai"] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];

export const QUESTION_SOURCE_LABELS: Record<QuestionSource, string> = {
  all: "Toutes les sources",
  quiz: "Quiz classiques",
  progression: "Banques de progression",
  ai: "Quiz générés par IA",
};

export type QuestionFilters = {
  source: QuestionSource;
  quizId?: number;
  archived: ArchiveFilter;
  incomplete: boolean;
};

export function parseQuestionSource(value: string | undefined): QuestionSource {
  return QUESTION_SOURCES.includes(value as QuestionSource)
    ? (value as QuestionSource)
    : "all";
}
