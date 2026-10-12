import type { ArchiveFilter } from "@/lib/content-archive";

// Usage des cartes : fiches de la bibliothèque ou étapes des parcours
export const CARD_USAGES = ["all", "progression", "library"] as const;
export type CardUsage = (typeof CARD_USAGES)[number];

export const CARD_USAGE_LABELS: Record<CardUsage, string> = {
  all: "Tous les usages",
  progression: "Utilisées dans des leçons",
  library: "Hors leçons",
};

export type CardFilters = {
  archived: ArchiveFilter;
  referencielId?: number;
  niveau?: string;
  usage: CardUsage;
  incomplete: boolean;
};

export function parseCardUsage(value: string | undefined): CardUsage {
  return CARD_USAGES.includes(value as CardUsage)
    ? (value as CardUsage)
    : "all";
}
