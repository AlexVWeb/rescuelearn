import type { Part } from "@google/genai";
import { logger } from "../logger";
import { getAiClient } from "./client";

const INLINE_LIMIT_MB = 15;

/**
 * Fournit le PDF à Gemini : inline sous 15 Mo, sinon via la Files API
 * (fichier supprimé une fois `fn` terminé).
 */
export async function withPdfPart<T>(
  pdf: Uint8Array,
  fn: (part: Part) => Promise<T>
): Promise<T> {
  const ai = getAiClient();
  const sizeMB = pdf.byteLength / (1024 * 1024);

  if (sizeMB < INLINE_LIMIT_MB) {
    logger.info(`PDF is small (${sizeMB.toFixed(2)} MB), sending inline...`);
    return fn({
      inlineData: {
        data: Buffer.from(pdf).toString("base64"),
        mimeType: "application/pdf",
      },
    });
  }

  logger.info(
    `PDF is large (${sizeMB.toFixed(2)} MB), uploading to Gemini Files API...`
  );
  const uploaded = await ai.files.upload({
    file: new Blob([pdf as Uint8Array<ArrayBuffer>], {
      type: "application/pdf",
    }),
    config: { mimeType: "application/pdf" },
  });
  if (!uploaded.name) throw new Error("Upload failed: file name is undefined");

  try {
    let state = uploaded.state;
    while (state === "PROCESSING") {
      await new Promise((r) => setTimeout(r, 1000));
      state = (await ai.files.get({ name: uploaded.name })).state;
    }
    if (state !== "ACTIVE") {
      throw new Error(`Uploaded file is not active: ${state}`);
    }
    return await fn({
      fileData: { fileUri: uploaded.uri, mimeType: "application/pdf" },
    });
  } finally {
    try {
      logger.info(`Deleting file ${uploaded.name} from Gemini Files API...`);
      await ai.files.delete({ name: uploaded.name });
    } catch (err) {
      logger.error(`Failed to delete uploaded file ${uploaded.name}:`, err);
    }
  }
}
