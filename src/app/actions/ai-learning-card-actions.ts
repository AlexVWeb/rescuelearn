"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { generateLearningCardsFromPdf } from "@/lib/gemini";
import { z } from "zod";
import path from "path";

const generateCardsSchema = z.object({
  referencielId: z.number(),
  topic: z.string().min(1, "Le sujet ne peut pas être vide"),
  cardCount: z.number().min(1).max(30),
  level: z.string().optional(),
});

const generatedCardsSchema = z.object({
  cards: z
    .array(
      z.object({
        theme: z.string(),
        niveau: z.string(),
        info: z.string(),
        reference: z.string(),
      })
    )
    .min(1),
});

export async function generateLearningCardsWithAiAction(jsonData: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = generateCardsSchema.safeParse(jsonData);
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  const { referencielId, topic, cardCount, level } = parsed.data;

  let pdfPath = "";
  let tempFileCreated = false;

  try {
    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
    });

    if (!referenciel) {
      return { success: false, error: "Referenciel introuvable" };
    }

    if (
      referenciel.pdfUrl.startsWith("http://") ||
      referenciel.pdfUrl.startsWith("https://")
    ) {
      const key = referenciel.pdfUrl.replace(
        `${process.env.R2_PUBLIC_URL}/`,
        ""
      );
      const { getFile } = await import("@/lib/r2");
      const { buffer } = await getFile(key, false);
      const fs = await import("fs/promises");
      const path = await import("path");
      const tempDir = path.join(process.cwd(), ".next/cache");
      await fs.mkdir(tempDir, { recursive: true });
      pdfPath = path.join(tempDir, `temp-${Date.now()}-${path.basename(key)}`);
      await fs.writeFile(pdfPath, buffer);
      tempFileCreated = true;
    } else {
      pdfPath = path.join(process.cwd(), "public", referenciel.pdfUrl);
    }

    // Call Gemini integration
    const result = await generateLearningCardsFromPdf({
      pdfPath,
      topic,
      cardCount,
      level,
    });

    // Deep validation of Gemini output
    const validatedResult = generatedCardsSchema.safeParse(result);
    if (!validatedResult.success) {
      logger.error("Malformed response from AI:", validatedResult.error);
      return {
        success: false,
        error: "La réponse de l'IA est malformée ou incomplète.",
      };
    }

    return {
      success: true,
      data: validatedResult.data,
    };
  } catch (error) {
    logger.error("Failed to generate learning cards with AI:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la génération par l'IA.",
    };
  } finally {
    if (tempFileCreated && pdfPath) {
      try {
        const fs = await import("fs/promises");
        await fs.unlink(pdfPath);
      } catch (err) {
        logger.error("Failed to delete temp file:", err);
      }
    }
  }
}
