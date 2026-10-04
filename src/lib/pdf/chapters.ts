export type OutlineEntry = { title: string; depth: number; pageIndex: number };
export type PageRange = { pageStart: number; pageEnd: number };
// Section du référentiel (signet ou chapitre détecté par l'IA)
export type Chapter = PageRange & { title: string };
// Lot de pages envoyé en une fois à l'IA pour l'analyse des sujets
export type AnalysisBatch = PageRange & { title: string; sections: Chapter[] };

const MIN_CHAPTERS = 4;

export function outlineToChapters(
  entries: OutlineEntry[],
  numPages: number
): Chapter[] {
  const atDepth = (d: number) =>
    entries
      .filter((e) => e.depth === d)
      .sort((a, b) => a.pageIndex - b.pageIndex);

  let picked = atDepth(0);
  if (picked.length < MIN_CHAPTERS) picked = atDepth(1);
  if (picked.length < MIN_CHAPTERS) return [];

  return picked.map((entry, i) => {
    const pageStart = entry.pageIndex + 1;
    const next = picked[i + 1];
    const pageEnd = next ? Math.max(pageStart, next.pageIndex) : numPages;
    return { title: entry.title, pageStart, pageEnd };
  });
}

// Découpe les chapitres de plus de maxPages pages en fenêtres successives
export function splitLargeChapters(
  chapters: Chapter[],
  maxPages = 40
): Chapter[] {
  return chapters.flatMap(({ title, pageStart, pageEnd }) => {
    const length = pageEnd - pageStart + 1;
    const parts = Math.max(1, Math.ceil(length / maxPages));
    return Array.from({ length: parts }, (_, p) => ({
      title: parts > 1 ? `${title} (${p + 1}/${parts})` : title,
      pageStart: pageStart + p * maxPages,
      pageEnd: Math.min(pageEnd, pageStart + (p + 1) * maxPages - 1),
    }));
  });
}

/**
 * Regroupe les sections consécutives en lots d'au plus maxPages pages, pour
 * limiter le nombre d'appels IA (un référentiel peut avoir ~200 signets).
 * Une section plus longue que maxPages est d'abord découpée.
 */
export function buildAnalysisBatches(
  chapters: Chapter[],
  maxPages = 40
): AnalysisBatch[] {
  const sections = splitLargeChapters(
    [...chapters].sort((a, b) => a.pageStart - b.pageStart),
    maxPages
  );
  const batches: AnalysisBatch[] = [];
  let current: Chapter[] = [];

  const flush = () => {
    if (!current.length) return;
    const pageStart = current[0].pageStart;
    const pageEnd = Math.max(...current.map((c) => c.pageEnd));
    batches.push({
      title: `Pages ${pageStart}-${pageEnd}`,
      pageStart,
      pageEnd,
      sections: current,
    });
    current = [];
  };

  for (const section of sections) {
    const start = current[0]?.pageStart ?? section.pageStart;
    if (current.length && section.pageEnd - start + 1 > maxPages) flush();
    current.push(section);
  }
  flush();
  return batches;
}

// Section contenant la page donnée (repli quand l'IA ne nomme pas le chapitre)
export function findSection(
  sections: Chapter[],
  page: number
): Chapter | undefined {
  return (
    sections.find((s) => page >= s.pageStart && page <= s.pageEnd) ??
    sections[0]
  );
}

export function mergePageRanges(ranges: PageRange[]): PageRange[] {
  const sorted = [...ranges].sort((a, b) => a.pageStart - b.pageStart);
  const merged: PageRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.pageStart <= last.pageEnd + 1) {
      last.pageEnd = Math.max(last.pageEnd, r.pageEnd);
    } else {
      merged.push({ pageStart: r.pageStart, pageEnd: r.pageEnd });
    }
  }
  return merged;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
