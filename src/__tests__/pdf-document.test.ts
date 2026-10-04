import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { extractPages, readPdfOutline } from "@/lib/pdf/document";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return doc.save();
}

describe("extractPages", () => {
  it("garde uniquement les plages demandées (1-based, inclusives)", async () => {
    const src = await makePdf(10);
    const out = await extractPages(src, [
      { pageStart: 2, pageEnd: 3 },
      { pageStart: 8, pageEnd: 8 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
  });

  it("borne les plages hors limites", async () => {
    const out = await extractPages(await makePdf(5), [
      { pageStart: 4, pageEnd: 99 },
    ]);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
  });
});

describe("readPdfOutline", () => {
  it("retourne numPages et un sommaire vide pour un PDF sans signets", async () => {
    const res = await readPdfOutline(await makePdf(3));
    expect(res).toEqual({ numPages: 3, entries: [] });
  });
});
