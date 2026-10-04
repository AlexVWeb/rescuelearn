"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { generateQuizFromPdf } from "@/lib/gemini";
import { loadReferencielPdf } from "@/lib/referenciel-pdf";
import { extractPages } from "@/lib/pdf/document";
import { mergePageRanges } from "@/lib/pdf/chapters";
import { MAX_TOPICS_PER_GENERATION } from "@/lib/topic-coverage";
import { shuffleOptions } from "@/lib/quiz-answers";
import { z } from "zod";

const generateQuizSchema = z
  .object({
    referencielId: z.number(),
    topic: z.string().optional(),
    topicIds: z.array(z.string()).max(MAX_TOPICS_PER_GENERATION).optional(),
    questionCount: z.number().min(1).max(30),
    level: z.string().optional(),
  })
  .refine((d) => d.topic?.trim() || d.topicIds?.length, {
    message: "Sujet ou sujets requis",
  });

const generatedQuizSchema = z.object({
  title: z.string(),
  timePerQuestion: z.number().default(30),
  passingScore: z.number().default(70),
  modeRandom: z.boolean().default(false),
  level: z.string().optional(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2),
        correctAnswer: z.number(),
        explanation: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
        topicId: z.string().optional(),
      })
    )
    .min(1),
});

export async function generateQuizWithAiAction(jsonData: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = generateQuizSchema.safeParse(jsonData);
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  const { referencielId, topicIds, questionCount, level } = parsed.data;

  try {
    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
    });

    if (!referenciel) {
      return { success: false, error: "Referenciel introuvable" };
    }

    const fullPdf = await loadReferencielPdf(referenciel.pdfUrl);

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

    const pdf = topics
      ? await extractPages(fullPdf, mergePageRanges(topics))
      : fullPdf;
    const topic =
      parsed.data.topic?.trim() || topics!.map((t) => t.title).join(", ");

    // Get all existing tags in DB for injection/reuse
    const questionsForTags = await prisma.question.findMany({
      select: { tags: true },
    });
    const existingTags = Array.from(
      new Set(questionsForTags.flatMap((q) => q.tags))
    );

    // Get existing questions text to avoid duplicates (scoped to the topics if any)
    const existingQuestionsFromDb = await prisma.question.findMany({
      where: topics
        ? { topicId: { in: topics.map((t) => t.id) } }
        : { quiz: { referencielId } },
      select: { text: true },
    });
    const existingQuestions = existingQuestionsFromDb.map((q) => q.text);

    // Call Gemini integration
    const result = await generateQuizFromPdf({
      pdf,
      topic,
      questionCount,
      level,
      existingQuestions,
      existingTags,
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
    const validatedResult = generatedQuizSchema.safeParse(result);
    if (!validatedResult.success) {
      logger.error("Malformed response from AI:", validatedResult.error);
      return {
        success: false,
        error: "La réponse de l'IA est malformée ou incomplète.",
      };
    }

    const quizData = validatedResult.data;
    const allowedTopicIds = new Set(topics?.map((t) => t.id));

    // Shuffle options for each question to remove AI position bias
    quizData.questions = quizData.questions.map((q) => {
      const shuffled = shuffleOptions(q.options, q.correctAnswer);
      return {
        ...q,
        options: shuffled.options,
        correctAnswer: shuffled.correctIndex,
        topicId:
          q.topicId && allowedTopicIds.has(q.topicId) ? q.topicId : undefined,
      };
    });

    return {
      success: true,
      data: quizData,
    };
  } catch (error) {
    logger.error("Failed to generate quiz with AI:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la génération par l'IA.",
    };
  }
}
