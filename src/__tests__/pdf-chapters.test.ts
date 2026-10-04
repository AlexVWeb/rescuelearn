import { describe, it, expect } from "vitest";
import {
  outlineToChapters,
  mergePageRanges,
  slugify,
  splitLargeChapters,
  buildAnalysisBatches,
  findSection,
} from "@/lib/pdf/chapters";

describe("outlineToChapters", () => {
  it("transforme les entrées de niveau 0 en chapitres bornés par l'entrée suivante", () => {
    const chapters = outlineToChapters(
      [
        { title: "Intro", depth: 0, pageIndex: 0 },
        { title: "Protection", depth: 0, pageIndex: 4 },
        { title: "Alerte", depth: 0, pageIndex: 9 },
        { title: "Hémorragies", depth: 0, pageIndex: 14 },
      ],
      20
    );
    expect(chapters).toEqual([
      { title: "Intro", pageStart: 1, pageEnd: 4 },
      { title: "Protection", pageStart: 5, pageEnd: 9 },
      { title: "Alerte", pageStart: 10, pageEnd: 14 },
      { title: "Hémorragies", pageStart: 15, pageEnd: 20 },
    ]);
  });

  it("descend au niveau 1 quand le niveau 0 a moins de 4 entrées", () => {
    const chapters = outlineToChapters(
      [
        { title: "Partie 1", depth: 0, pageIndex: 0 },
        { title: "A", depth: 1, pageIndex: 0 },
        { title: "B", depth: 1, pageIndex: 3 },
        { title: "C", depth: 1, pageIndex: 6 },
        { title: "D", depth: 1, pageIndex: 8 },
      ],
      10
    );
    expect(chapters.map((c) => c.title)).toEqual(["A", "B", "C", "D"]);
  });

  it("retourne [] si moins de 4 entrées exploitables", () => {
    expect(
      outlineToChapters([{ title: "X", depth: 0, pageIndex: 0 }], 5)
    ).toEqual([]);
  });
});

describe("mergePageRanges", () => {
  it("fusionne les plages qui se chevauchent ou se touchent", () => {
    expect(
      mergePageRanges([
        { pageStart: 10, pageEnd: 12 },
        { pageStart: 1, pageEnd: 3 },
        { pageStart: 4, pageEnd: 5 },
        { pageStart: 11, pageEnd: 15 },
      ])
    ).toEqual([
      { pageStart: 1, pageEnd: 5 },
      { pageStart: 10, pageEnd: 15 },
    ]);
  });
});

describe("slugify", () => {
  it("supprime accents et ponctuation", () => {
    expect(slugify("Ch. 3 — Hémorragie externe !")).toBe(
      "ch-3-hemorragie-externe"
    );
  });
});

describe("splitLargeChapters", () => {
  it("laisse intacts les chapitres courts et découpe les longs", () => {
    expect(
      splitLargeChapters(
        [
          { title: "Court", pageStart: 1, pageEnd: 10 },
          { title: "Long", pageStart: 11, pageEnd: 60 },
        ],
        40
      )
    ).toEqual([
      { title: "Court", pageStart: 1, pageEnd: 10 },
      { title: "Long (1/2)", pageStart: 11, pageEnd: 50 },
      { title: "Long (2/2)", pageStart: 51, pageEnd: 60 },
    ]);
  });
});

describe("buildAnalysisBatches", () => {
  it("regroupe les sections consécutives en lots de maxPages pages au plus", () => {
    const sections = Array.from({ length: 10 }, (_, i) => ({
      title: `S${i}`,
      pageStart: i * 10 + 1,
      pageEnd: i * 10 + 10,
    }));
    const batches = buildAnalysisBatches(sections, 40);
    expect(batches.map((b) => [b.pageStart, b.pageEnd])).toEqual([
      [1, 40],
      [41, 80],
      [81, 100],
    ]);
    expect(batches[0].sections.map((s) => s.title)).toEqual([
      "S0",
      "S1",
      "S2",
      "S3",
    ]);
    expect(batches[0].title).toBe("Pages 1-40");
  });

  it("isole et découpe une section plus longue que maxPages", () => {
    const batches = buildAnalysisBatches(
      [
        { title: "Court", pageStart: 1, pageEnd: 5 },
        { title: "Gros", pageStart: 6, pageEnd: 95 },
      ],
      40
    );
    expect(batches.map((b) => b.sections.map((s) => s.title))).toEqual([
      ["Court"],
      ["Gros (1/3)"],
      ["Gros (2/3)"],
      ["Gros (3/3)"],
    ]);
  });
});

describe("findSection", () => {
  const sections = [
    { title: "A", pageStart: 1, pageEnd: 3 },
    { title: "B", pageStart: 4, pageEnd: 9 },
  ];
  it("retourne la section contenant la page", () => {
    expect(findSection(sections, 5)?.title).toBe("B");
  });
  it("retourne la première section si aucune ne contient la page", () => {
    expect(findSection(sections, 50)?.title).toBe("A");
  });
});
