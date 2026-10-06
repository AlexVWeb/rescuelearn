import { z } from "zod";

// Archivage des contenus pédagogiques (quiz, cartes) : un contenu archivé
// reste en base (historique, sessions passées) mais disparaît côté joueur.

export const ARCHIVE_FILTERS = ["active", "archived", "all"] as const;
export type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number];

export const BULK_CONTENT_ACTIONS = ["archive", "restore", "delete"] as const;
export type BulkContentAction = (typeof BULK_CONTENT_ACTIONS)[number];

export const bulkContentSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(1000),
  action: z.enum(BULK_CONTENT_ACTIONS),
});

export function parseArchiveFilter(value: string | undefined): ArchiveFilter {
  return ARCHIVE_FILTERS.includes(value as ArchiveFilter)
    ? (value as ArchiveFilter)
    : "active";
}

export function archiveWhere(filter: ArchiveFilter) {
  if (filter === "active") return { archivedAt: null };
  if (filter === "archived") return { archivedAt: { not: null } };
  return {};
}
