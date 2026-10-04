import { readFile } from "fs/promises";
import path from "path";

// Charge en mémoire le PDF d'un référentiel (R2 ou dossier public local)
export async function loadReferencielPdf(pdfUrl: string): Promise<Uint8Array> {
  if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) {
    const key = pdfUrl.replace(`${process.env.R2_PUBLIC_URL}/`, "");
    const { getFile } = await import("@/lib/r2");
    const { buffer } = await getFile(key, false);
    return new Uint8Array(buffer);
  }
  return new Uint8Array(
    await readFile(path.join(process.cwd(), "public", pdfUrl))
  );
}
