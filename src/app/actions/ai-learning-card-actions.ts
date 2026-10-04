"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { generateLearningCardsFromPdf } from "@/lib/gemini";
import { loadReferencielPdf } from "@/lib/referenciel-pdf";
import { extractPages } from "@/lib/pdf/document";
import { mergePageRanges } from "@/lib/pdf/chapters";
import { MAX_TOPICS_PER_GENERATION } from "@/lib/topic-coverage";
import { z } from "zod";

const generateCardsSchema = z
  .object({
    referencielId: z.number(),
    topic: z.string().optional(),
    topicIds: z.array(z.string()).max(MAX_TOPICS_PER_GENERATION).optional(),
    cardCount: z.number().min(1).max(30),
    level: z.string().optional(),
  })
  .refine((d) => d.topic?.trim() || d.topicIds?.length, {
    message: "Sujet ou sujets requis",
  });

const generatedCardsSchema = z.object({
  cards: z
    .array(
      z.object({
        theme: z.string(),
        niveau: z.string(),
        info: z.string(),
        reference: z.string(),
        topicId: z.string().optional(),
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

  const { referencielId, topicIds, cardCount, level } = parsed.data;

  try {
    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
    });

    if (!referenciel) {
      return { success: false, error: "Referenciel introuvable" };
    }

    // Génération ciblée : seules les pages des sujets choisis sont envoyées
    const topics = topicIds?.length
      ? await prisma.referencielTopic.findMany({
          where: { id: { in: topicIds }, referencielId },
          orderBy: { order: "asc" },
        })
      : undefined;
    if (topics && topics.length !== new Set(topicIds).size) {
      return {
        success: false,
        error: "Sujets introuvables pour ce référentiel",
      };
    }

    const fullPdf = await loadReferencielPdf(referenciel.pdfUrl);
    const pdf = topics
      ? await extractPages(fullPdf, mergePageRanges(topics))
      : fullPdf;
    const topic =
      parsed.data.topic?.trim() ||
      (topics ?? []).map((t) => t.title).join(", ");

    // Call Gemini integration
    const result = await generateLearningCardsFromPdf({
      pdf,
      topic,
      cardCount,
      level,
      topics: topics?.map((t) => ({
        id: t.id,
        title: t.title,
        summary: t.summary,
        keyPoints: t.keyPoints,
        pageStart: t.pageStart,
        pageEnd: t.pageEnd,
      })),
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

    // Un topicId inventé par l'IA est retiré
    const allowedTopicIds = new Set(topics?.map((t) => t.id));
    return {
      success: true,
      data: {
        cards: validatedResult.data.cards.map((card) => ({
          ...card,
          topicId:
            card.topicId && allowedTopicIds.has(card.topicId)
              ? card.topicId
              : undefined,
        })),
      },
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
  }
}
