import { PDFDocument } from "pdf-lib";
import { getDocumentProxy } from "unpdf";
import type { OutlineEntry, PageRange } from "./chapters";

// Construit un nouveau PDF ne contenant que les plages demandées (1-based, inclusives)
export async function extractPages(
  pdf: Uint8Array,
  ranges: PageRange[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(pdf);
  const total = src.getPageCount();
  const indices: number[] = [];
  for (const { pageStart, pageEnd } of ranges) {
    for (let p = Math.max(1, pageStart); p <= Math.min(total, pageEnd); p++) {
      indices.push(p - 1);
    }
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((page) => out.addPage(page));
  return out.save();
}

type RawOutlineItem = {
  title: string;
  dest: string | unknown[] | null;
  items: RawOutlineItem[];
};

// Lit les signets (niveaux 0 et 1) du PDF avec leur page de destination
export async function readPdfOutline(
  pdf: Uint8Array
): Promise<{ numPages: number; entries: OutlineEntry[] }> {
  // unpdf/pdf.js détache le buffer : on lui passe une copie
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const outline = ((await doc.getOutline()) ?? []) as RawOutlineItem[];
  const entries: OutlineEntry[] = [];

  const walk = async (items: RawOutlineItem[], depth: number) => {
    if (depth > 1) return;
    for (const item of items) {
      try {
        const dest =
          typeof item.dest === "string"
            ? await doc.getDestination(item.dest)
            : item.dest;
        if (Array.isArray(dest) && dest[0]) {
          const pageIndex = await doc.getPageIndex(
            dest[0] as Parameters<typeof doc.getPageIndex>[0]
          );
          entries.push({ title: item.title.trim(), depth, pageIndex });
        }
      } catch {
        // signet cassé : ignoré
      }
      await walk(item.items ?? [], depth + 1);
    }
  };
  await walk(outline, 0);

  return { numPages: doc.numPages, entries };
}
