import { GoogleGenAI } from "@google/genai";
import { logger } from "../logger";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

let aiInstance: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured in environment variables"
    );
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = process.env.NODE_ENV === "test" ? 1 : 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const err = error as
      | { status?: number; statusCode?: number; message?: string }
      | null
      | undefined;
    const isTransient =
      err?.status === 503 ||
      err?.status === 429 ||
      err?.statusCode === 503 ||
      err?.statusCode === 429 ||
      String(err?.message).includes("503") ||
      String(err?.message).includes("429") ||
      String(err?.message).includes("UNAVAILABLE") ||
      String(err?.message).includes("Resource has been exhausted");

    if (retries > 0 && isTransient) {
      logger.warn(
        `Gemini API returned transient error: ${err?.message || error}. Retrying in ${delay}ms... (${retries} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export { GEMINI_MODEL };
