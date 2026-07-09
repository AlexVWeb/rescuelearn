"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { generateQuizFromPdf } from "@/lib/gemini";
import { z } from "zod";
import path from "path";

const generateQuizSchema = z.object({
  referencielId: z.number(),
  topic: z.string().min(1, "Le sujet ne peut pas être vide"),
  questionCount: z.number().min(1).max(30),
  level: z.string().optional(),
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

  const { referencielId, topic, questionCount, level } = parsed.data;

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

    // Get all existing tags in DB for injection/reuse
    const questionsForTags = await prisma.question.findMany({
      select: { tags: true },
    });
    const existingTags = Array.from(
      new Set(questionsForTags.flatMap((q) => q.tags))
    );

    // Get existing questions text for this referenciel to avoid duplicates
    const existingQuestionsFromDb = await prisma.question.findMany({
      where: {
        quiz: {
          referencielId,
        },
      },
      select: { text: true },
    });
    const existingQuestions = existingQuestionsFromDb.map((q) => q.text);

    // Call Gemini integration
    const result = await generateQuizFromPdf({
      pdfPath,
      topic,
      questionCount,
      level,
      existingQuestions,
      existingTags,
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

    // Shuffle options for each question to remove AI position bias
    quizData.questions = quizData.questions.map((q) => {
      const correctAnswerIndex = q.correctAnswer;
      const mapped = q.options.map((text, idx) => ({
        text,
        isCorrect: idx === correctAnswerIndex,
      }));

      // Fisher-Yates shuffle
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = mapped[i];
        mapped[i] = mapped[j];
        mapped[j] = temp;
      }

      const shuffledOptions = mapped.map((item) => item.text);
      const newCorrectAnswerIndex = mapped.findIndex((item) => item.isCorrect);

      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: newCorrectAnswerIndex,
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
