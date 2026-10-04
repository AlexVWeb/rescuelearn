import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  analyzeChapterPlan,
  analyzeChapterTopics,
  type AnalyzedTopic,
} from "@/lib/gemini";
import { extractPages, readPdfOutline } from "@/lib/pdf/document";
import {
  buildAnalysisBatches,
  findSection,
  outlineToChapters,
  slugify,
  type AnalysisBatch,
  type Chapter,
} from "@/lib/pdf/chapters";
import { loadReferencielPdf } from "@/lib/referenciel-pdf";

const MAX_BATCH_PAGES = 40;
const CONCURRENCY = 3;

type TopicData = {
  chapter: string;
  title: string;
  summary: string;
  keyPoints: string[];
  pageStart: number;
  pageEnd: number;
  levels: string[];
  questionCapacity: number;
  suggestedFormats: string[];
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Plan de chapitres : signets du PDF, sinon proposé par l'IA
async function resolveSections(
  pdf: Uint8Array,
  fallbackTitle: string
): Promise<Chapter[]> {
  const { numPages, entries } = await readPdfOutline(pdf);
  const fromOutline = outlineToChapters(entries, numPages);
  if (fromOutline.length) return fromOutline;

  logger.info("No usable PDF outline, asking AI for the chapter plan...");
  const fromAi = (await analyzeChapterPlan(pdf))
    .map((c) => ({
      title: c.title,
      pageStart: clamp(c.pageStart, 1, numPages),
      pageEnd: clamp(c.pageEnd, 1, numPages),
    }))
    .filter((c) => c.pageEnd >= c.pageStart);

  return fromAi.length
    ? fromAi
    : [{ title: fallbackTitle, pageStart: 1, pageEnd: numPages }];
}

function toTopicData(
  topic: AnalyzedTopic,
  batch: AnalysisBatch,
  referencielLevels: string[]
): TopicData {
  const toAbsolute = (rel: number) =>
    clamp(batch.pageStart + rel - 1, batch.pageStart, batch.pageEnd);
  const pageStart = toAbsolute(topic.pageStart);
  const pageEnd = Math.max(pageStart, toAbsolute(topic.pageEnd));

  let levels = referencielLevels;
  if (referencielLevels.length > 1) {
    const picked = (topic.levels ?? []).filter((l) =>
      referencielLevels.includes(l)
    );
    levels = picked.length ? picked : referencielLevels;
  }

  return {
    chapter:
      topic.chapter?.trim() ||
      findSection(batch.sections, pageStart)?.title ||
      batch.title,
    title: topic.title.trim(),
    summary: topic.summary,
    keyPoints: topic.keyPoints ?? [],
    pageStart,
    pageEnd,
    levels,
    questionCapacity: clamp(Math.round(topic.questionCapacity || 5), 1, 30),
    suggestedFormats: topic.suggestedFormats ?? [],
  };
}

/**
 * Aplatit les sujets des lots réussis dans l'ordre du référentiel. Un sujet à
 * cheval sur deux lots (même titre, pages contiguës) est fusionné en un seul.
 */
function collectTopics(
  results: PromiseSettledResult<TopicData[]>[]
): { data: TopicData; order: number }[] {
  const topics: { data: TopicData; order: number }[] = [];
  for (const [batchIndex, result] of results.entries()) {
    if (result.status !== "fulfilled") continue;
    for (const [topicIndex, data] of result.value.entries()) {
      const prev = topics.at(-1)?.data;
      if (
        prev &&
        slugify(prev.title) === slugify(data.title) &&
        data.pageStart <= prev.pageEnd + 1
      ) {
        prev.pageEnd = Math.max(prev.pageEnd, data.pageEnd);
        prev.keyPoints = [...new Set([...prev.keyPoints, ...data.keyPoints])];
        prev.levels = [...new Set([...prev.levels, ...data.levels])];
        prev.suggestedFormats = [
          ...new Set([...prev.suggestedFormats, ...data.suggestedFormats]),
        ];
        prev.questionCapacity = Math.min(
          30,
          prev.questionCapacity + data.questionCapacity
        );
        continue;
      }
      topics.push({ data: { ...data }, order: batchIndex * 1000 + topicIndex });
    }
  }
  return topics;
}

/**
 * Analyse le PDF d'un référentiel en sujets (≈ fiches techniques) et les
 * enregistre. Les sujets sont upsertés par slug pour conserver leur id (et donc
 * leur couverture) d'une analyse à l'autre.
 */
export async function runReferencielAnalysis(referencielId: number) {
  const referenciel = await prisma.referenciel.findUnique({
    where: { id: referencielId },
  });
  if (!referenciel) throw new Error("Référentiel introuvable");

  const pdf = await loadReferencielPdf(referenciel.pdfUrl);
  const sections = await resolveSections(pdf, referenciel.title);
  const batches = buildAnalysisBatches(sections, MAX_BATCH_PAGES);

  await prisma.referenciel.update({
    where: { id: referencielId },
    data: { analysisTotalChapters: batches.length, analysisDoneChapters: 0 },
  });

  const results = await mapWithConcurrency(
    batches,
    CONCURRENCY,
    async (batch) => {
      const extract = await extractPages(pdf, [
        { pageStart: batch.pageStart, pageEnd: batch.pageEnd },
      ]);
      const topics = await analyzeChapterTopics({
        pdf: extract,
        referencielTitle: referenciel.title,
        batch,
        levels: referenciel.levels,
      });
      await prisma.referenciel.update({
        where: { id: referencielId },
        data: { analysisDoneChapters: { increment: 1 } },
      });
      return topics
        .filter((t) => t.title?.trim())
        .map((t) => toTopicData(t, batch, referenciel.levels));
    }
  );

  const existing = await prisma.referencielTopic.findMany({
    where: { referencielId },
    select: { slug: true, validated: true },
  });
  const validatedSlugs = new Set(
    existing.filter((t) => t.validated).map((t) => t.slug)
  );

  // Slugs attribués dans l'ordre du référentiel → stables entre deux analyses
  const slugCounts = new Map<string, number>();
  const seenSlugs: string[] = [];

  for (const { data, order } of collectTopics(results)) {
    const base = slugify(data.title) || "sujet";
    const count = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, count);
    const slug = count > 1 ? `${base}-${count}` : base;
    seenSlugs.push(slug);

    await prisma.referencielTopic.upsert({
      where: { referencielId_slug: { referencielId, slug } },
      create: { referencielId, slug, order, ...data },
      update: validatedSlugs.has(slug)
        ? { pageStart: data.pageStart, pageEnd: data.pageEnd, order }
        : { order, ...data },
    });
  }

  const failures = results.flatMap((r, i) =>
    r.status === "rejected"
      ? [
          `${batches[i].title} (${r.reason instanceof Error ? r.reason.message : String(r.reason)})`,
        ]
      : []
  );

  if (failures.length) {
    logger.error(
      `Referenciel ${referencielId} analysis: ${failures.length} batch(es) failed`,
      failures
    );
    await prisma.referenciel.update({
      where: { id: referencielId },
      data: {
        analysisStatus: "FAILED",
        analysisError:
          `${failures.length} lot(s) en échec : ${failures.join(" ; ")}`.slice(
            0,
            1000
          ),
      },
    });
    return;
  }

  await prisma.referencielTopic.deleteMany({
    where: { referencielId, slug: { notIn: seenSlugs } },
  });
  await prisma.referenciel.update({
    where: { id: referencielId },
    data: {
      analysisStatus: "DONE",
      analyzedAt: new Date(),
      analysisError: null,
    },
  });
  logger.info(
    `Referenciel ${referencielId} analysed: ${seenSlugs.length} topics from ${batches.length} batches`
  );
}
