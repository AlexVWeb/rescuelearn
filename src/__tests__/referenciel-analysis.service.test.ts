import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  referenciel: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  referencielTopic: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/gemini", () => ({
  analyzeChapterPlan: vi.fn(),
  analyzeChapterTopics: vi.fn(),
}));

vi.mock("@/lib/pdf/document", () => ({
  readPdfOutline: vi.fn(),
  extractPages: vi.fn().mockResolvedValue(new Uint8Array(1)),
}));

vi.mock("@/lib/referenciel-pdf", () => ({
  loadReferencielPdf: vi.fn().mockResolvedValue(new Uint8Array(1)),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { analyzeChapterPlan, analyzeChapterTopics } from "@/lib/gemini";
import { readPdfOutline, extractPages } from "@/lib/pdf/document";
import { runReferencielAnalysis } from "@/services/referenciel-analysis.service";

const outline = {
  numPages: 100,
  entries: [
    { title: "Protection", depth: 0, pageIndex: 0 },
    { title: "Alerte", depth: 0, pageIndex: 30 },
    { title: "Hémorragies", depth: 0, pageIndex: 44 },
    { title: "Traumatismes", depth: 0, pageIndex: 70 },
  ],
};

const aiTopic = (title: string, pageStart = 1, pageEnd = 2) => ({
  chapter: "Urgences vitales",
  title,
  summary: "Résumé.",
  keyPoints: ["Point"],
  pageStart,
  pageEnd,
  levels: ["PSE2"],
  questionCapacity: 8,
  suggestedFormats: ["QUIZ"],
});

function upsertCalls() {
  return mockPrisma.referencielTopic.upsert.mock.calls.map((c) => c[0]);
}

function lastStatusUpdate() {
  const calls = mockPrisma.referenciel.update.mock.calls.map((c) => c[0].data);
  return calls.filter((d) => d.analysisStatus).at(-1);
}

describe("runReferencielAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "Référentiel PSC",
      pdfUrl: "referenciels/psc.pdf",
      levels: ["PSC"],
    });
    mockPrisma.referencielTopic.findMany.mockResolvedValue([]);
    vi.mocked(readPdfOutline).mockResolvedValue(outline);
    vi.mocked(analyzeChapterTopics).mockImplementation(async ({ batch }) => [
      aiTopic(`Sujet ${batch.pageStart}`),
    ]);
  });

  it("utilise le sommaire du PDF et analyse chaque lot", async () => {
    await runReferencielAnalysis(1);

    expect(analyzeChapterPlan).not.toHaveBeenCalled();
    // 1-30 | 31-44 | 45-70 | 71-100 → lots ≤ 40 pages : [1-30], [31-70], [71-100]
    expect(analyzeChapterTopics).toHaveBeenCalledTimes(3);
    expect(extractPages).toHaveBeenCalledWith(expect.any(Uint8Array), [
      { pageStart: 31, pageEnd: 70 },
    ]);
    expect(mockPrisma.referenciel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { analysisTotalChapters: 3, analysisDoneChapters: 0 },
    });
  });

  it("demande le plan à l'IA quand le sommaire est inexploitable", async () => {
    vi.mocked(readPdfOutline).mockResolvedValue({ numPages: 20, entries: [] });
    vi.mocked(analyzeChapterPlan).mockResolvedValue([
      { title: "A", pageStart: 1, pageEnd: 10 },
      { title: "B", pageStart: 11, pageEnd: 20 },
    ]);

    await runReferencielAnalysis(1);

    expect(analyzeChapterPlan).toHaveBeenCalled();
    expect(analyzeChapterTopics).toHaveBeenCalledTimes(1);
  });

  it("convertit les pages relatives en pages absolues", async () => {
    vi.mocked(analyzeChapterTopics).mockImplementation(async ({ batch }) =>
      batch.pageStart === 31 ? [aiTopic("Garrot", 15, 16)] : []
    );

    await runReferencielAnalysis(1);

    expect(upsertCalls()[0].create).toMatchObject({
      title: "Garrot",
      pageStart: 45,
      pageEnd: 46,
    });
  });

  it("force les niveaux du référentiel quand il est mono-niveau", async () => {
    await runReferencielAnalysis(1);

    for (const call of upsertCalls()) {
      expect(call.create.levels).toEqual(["PSC"]);
    }
  });

  it("garde les niveaux de l'IA (filtrés) en multi-niveau", async () => {
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "PSE",
      pdfUrl: "referenciels/pse.pdf",
      levels: ["PSE1", "PSE2"],
    });
    vi.mocked(analyzeChapterTopics).mockResolvedValue([
      { ...aiTopic("Garrot"), levels: ["PSE2", "GQS"] },
    ]);

    await runReferencielAnalysis(1);

    expect(upsertCalls()[0].create.levels).toEqual(["PSE2"]);
  });

  it("dédoublonne les slugs dans l'ordre du référentiel", async () => {
    vi.mocked(analyzeChapterTopics).mockResolvedValue([aiTopic("Garrot")]);

    await runReferencielAnalysis(1);

    expect(upsertCalls().map((c) => c.create.slug)).toEqual([
      "garrot",
      "garrot-2",
      "garrot-3",
    ]);
    expect(upsertCalls().map((c) => c.create.order)).toEqual([0, 1000, 2000]);
  });

  it("fusionne un sujet coupé à la frontière de deux lots", async () => {
    vi.mocked(analyzeChapterTopics).mockImplementation(async ({ batch }) => {
      // lot 1-30 : sujet sur les pages 29-30 ; lot 31-70 : suite pages 31-33
      if (batch.pageStart === 1)
        return [aiTopic("Alerte", 1, 2), aiTopic("Garrot", 29, 30)];
      if (batch.pageStart === 31)
        return [
          {
            ...aiTopic("Garrot", 1, 3),
            keyPoints: ["Heure de pose"],
            questionCapacity: 10,
          },
          aiTopic("Plaies", 5, 6),
        ];
      return [];
    });

    await runReferencielAnalysis(1);

    const created = upsertCalls().map((c) => c.create);
    expect(created.map((t) => t.slug)).toEqual(["alerte", "garrot", "plaies"]);
    expect(created[1]).toMatchObject({
      pageStart: 29,
      pageEnd: 33,
      keyPoints: ["Point", "Heure de pose"],
      questionCapacity: 18,
    });
  });

  it("ne réécrit que pages et ordre d'un sujet validé", async () => {
    mockPrisma.referencielTopic.findMany.mockResolvedValue([
      { slug: "sujet-1", validated: true },
    ]);

    await runReferencielAnalysis(1);

    const call = upsertCalls().find((c) => c.create.slug === "sujet-1");
    expect(call.update).toEqual({ pageStart: 1, pageEnd: 2, order: 0 });
  });

  it("passe en FAILED sans rien supprimer si un lot échoue", async () => {
    vi.mocked(analyzeChapterTopics).mockImplementation(async ({ batch }) => {
      if (batch.pageStart === 31) throw new Error("boom");
      return [aiTopic(`Sujet ${batch.pageStart}`)];
    });

    await runReferencielAnalysis(1);

    expect(mockPrisma.referencielTopic.deleteMany).not.toHaveBeenCalled();
    expect(upsertCalls()).toHaveLength(2);
    expect(lastStatusUpdate()).toMatchObject({
      analysisStatus: "FAILED",
      analysisError: expect.stringContaining("Pages 31-70"),
    });
  });

  it("supprime les sujets disparus et passe en DONE si tout réussit", async () => {
    await runReferencielAnalysis(1);

    expect(mockPrisma.referencielTopic.deleteMany).toHaveBeenCalledWith({
      where: {
        referencielId: 1,
        slug: { notIn: ["sujet-1", "sujet-31", "sujet-71"] },
      },
    });
    expect(lastStatusUpdate()).toMatchObject({
      analysisStatus: "DONE",
      analyzedAt: expect.any(Date),
      analysisError: null,
    });
  });
});
