"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { checkSuperAdmin } from "@/lib/admin-guard";
import {
  ArchiveFilter,
  archiveWhere,
  bulkContentSchema,
} from "@/lib/content-archive";

// --- Types ---

export type Quiz = {
  id: number;
  title: string;
  timePerQuestion: number;
  passingScore: number;
  modeRandom: boolean;
  _count?: { questions: number };
  status: "DRAFT" | "PUBLISHED";
  generatedByAi: boolean;
  referencielId: number | null;
  referenciel?: { id: number; title: string } | null;
  archivedAt: Date | null;
};

export type QuestionOption = {
  id: number;
  text: string;
};

export type Question = {
  id: number;
  text: string;
  correctAnswer: string; // "A", "B", "C", "D"
  explanation: string | null;
  quizId: number;
  quiz?: { title: string };
  options: QuestionOption[];
  tags: string[];
};

// --- Quiz Actions ---

export async function getQuizzesAction(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  filters: { archived?: ArchiveFilter; referencielId?: number } = {}
) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  const skip = (page - 1) * limit;
  const where: Prisma.QuizWhereInput = {
    ...archiveWhere(filters.archived ?? "active"),
    ...(filters.referencielId ? { referencielId: filters.referencielId } : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  try {
    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          _count: {
            select: { questions: true },
          },
          referenciel: { select: { id: true, title: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return {
      success: true,
      data: quizzes as unknown as Quiz[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch quizzes:", error);
    return { success: false, error: "Failed to fetch quizzes" };
  }
}

export async function createQuizAction(data: {
  title: string;
  timePerQuestion: number;
  passingScore: number;
  modeRandom: boolean;
  status?: "DRAFT" | "PUBLISHED";
}) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  try {
    await prisma.quiz.create({
      data: {
        title: data.title,
        timePerQuestion: data.timePerQuestion,
        passingScore: data.passingScore,
        modeRandom: data.modeRandom,
        status: data.status || "PUBLISHED",
      },
    });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    logger.error("Failed to create quiz:", error);
    return { success: false, error: "Failed to create quiz" };
  }
}

export async function updateQuizAction(
  id: number,
  data: {
    title: string;
    timePerQuestion: number;
    passingScore: number;
    modeRandom: boolean;
    status?: "DRAFT" | "PUBLISHED";
  }
) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  try {
    await prisma.quiz.update({
      where: { id },
      data: {
        title: data.title,
        timePerQuestion: data.timePerQuestion,
        passingScore: data.passingScore,
        modeRandom: data.modeRandom,
        ...(data.status ? { status: data.status } : {}),
      },
    });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update quiz:", error);
    return { success: false, error: "Failed to update quiz" };
  }
}

export async function deleteQuizAction(id: number) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  try {
    await prisma.quiz.delete({
      where: { id },
    });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete quiz:", error);
    return { success: false, error: "Failed to delete quiz" };
  }
}

export async function bulkQuizzesAction(input: unknown) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  const parsed = bulkContentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Paramètres invalides" };
  const { ids, action } = parsed.data;

  try {
    const where = { id: { in: ids } };
    const { count } =
      action === "delete"
        ? await prisma.quiz.deleteMany({ where })
        : await prisma.quiz.updateMany({
            where,
            data: { archivedAt: action === "archive" ? new Date() : null },
          });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true, count };
  } catch (error) {
    logger.error("Failed to bulk update quizzes:", error);
    return { success: false, error: "Impossible de traiter les quiz" };
  }
}

// --- Import Action ---

const importSchema = z.object({
  title: z.string(),
  timePerQuestion: z.number().optional().default(30),
  passingScore: z.number().optional().default(70),
  modeRandom: z.boolean().optional().default(false),
  level: z.string().optional(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2),
        correctAnswer: z.number(), // Index
        explanation: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
        topicId: z.string().optional().nullable(),
      })
    )
    .min(1),
  referencielId: z.number().optional().nullable(),
  generatedByAi: z.boolean().optional().default(false),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("PUBLISHED"),
  aiModel: z.string().optional().nullable(),
  aiPrompt: z.string().optional().nullable(),
});

export async function importQuizAction(jsonData: unknown) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  const parsed = importSchema.safeParse(jsonData);
  if (!parsed.success) {
    logger.error("JSON validation failed for import:", parsed.error);
    return { success: false, error: "Invalid JSON structure" };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Handle Level
        let levelId: number | null = null;
        if (data.level) {
          const existingLevel = await tx.levelQuestion.findFirst({
            where: { name: data.level },
          });
          if (existingLevel) {
            levelId = existingLevel.id;
          } else {
            const newLevel = await tx.levelQuestion.create({
              data: { name: data.level },
            });
            levelId = newLevel.id;
          }
        }

        // Create Quiz
        const quiz = await tx.quiz.create({
          data: {
            title: data.title,
            timePerQuestion: data.timePerQuestion,
            passingScore: data.passingScore,
            modeRandom: data.modeRandom,
            levelId: levelId,
            status: data.status,
            referencielId: data.referencielId,
            generatedByAi: data.generatedByAi,
            aiModel: data.aiModel,
            aiPrompt: data.aiPrompt,
          },
        });

        // Create Questions in bulk (one round-trip each for questions and options,
        // instead of one per question, to stay under the transaction timeout)
        const letters = ["A", "B", "C", "D"];
        const questions = await tx.question.createManyAndReturn({
          data: data.questions.map((q) => ({
            text: q.question,
            explanation: q.explanation,
            correctAnswer: letters[q.correctAnswer] || "A",
            quizId: quiz.id,
            tags: q.tags,
            topicId: q.topicId ?? null,
          })),
          select: { id: true },
        });

        await tx.questionOption.createMany({
          data: data.questions.flatMap((q, i) =>
            q.options.map((opt) => ({ text: opt, questionId: questions[i].id }))
          ),
        });
      },
      { timeout: 15000 }
    );

    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    logger.error("Failed to import quiz:", error);
    return { success: false, error: "Failed to import quiz" };
  }
}

import { z } from "zod";

// --- Question Actions ---

export async function getQuestionsAction(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  const skip = (page - 1) * limit;
  const where = search
    ? {
        text: { contains: search, mode: "insensitive" as const },
      }
    : {};

  try {
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          quiz: {
            select: { title: true },
          },
          options: true,
        },
      }),
      prisma.question.count({ where }),
    ]);

    return {
      success: true,
      data: questions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch questions:", error);
    return { success: false, error: "Failed to fetch questions" };
  }
}

export async function createQuestionAction(data: {
  text: string;
  quizId: number;
  explanation: string;
  correctAnswer: string;
  options: string[];
}) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  try {
    await prisma.question.create({
      data: {
        text: data.text,
        quizId: data.quizId,
        explanation: data.explanation,
        correctAnswer: data.correctAnswer,
        options: {
          create: data.options.map((opt) => ({ text: opt })),
        },
      },
    });
    revalidatePath("/admin/quiz/questions");
    return { success: true };
  } catch (error) {
    logger.error("Failed to create question:", error);
    return { success: false, error: "Failed to create question" };
  }
}

export async function updateQuestionAction(
  id: number,
  data: {
    text: string;
    quizId: number;
    explanation: string;
    correctAnswer: string;
    options: string[];
  }
) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  try {
    // Transaction to update question and replace options
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.question.update({
        where: { id },
        data: {
          text: data.text,
          quizId: data.quizId,
          explanation: data.explanation,
          correctAnswer: data.correctAnswer,
        },
      });

      // Delete specific options? Or simple approach: delete all and recreate.
      // Deleting all and recreating changes IDs, but that's likely fine for this use case.
      await tx.questionOption.deleteMany({
        where: { questionId: id },
      });

      await tx.questionOption.createMany({
        data: data.options.map((opt) => ({
          text: opt,
          questionId: id,
        })),
      });
    });

    revalidatePath("/admin/quiz/questions");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update question:", error);
    return { success: false, error: "Failed to update question" };
  }
}

export async function deleteQuestionAction(id: number) {
  const authError = await checkSuperAdmin();
  if (authError) return { success: false, error: authError };

  try {
    await prisma.question.delete({
      where: { id },
    });
    revalidatePath("/admin/quiz/questions");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete question:", error);
    return { success: false, error: "Failed to delete question" };
  }
}

export async function getAllQuizzesSimpleAction() {
  if (await checkSuperAdmin()) return [];

  try {
    return await prisma.quiz.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  } catch (error) {
    logger.error("Failed to fetch all quizzes:", error);
    return [];
  }
}

export async function getAllReferencielsSimpleAction() {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return [];
  }

  try {
    return await prisma.referenciel.findMany({
      select: { id: true, title: true, levels: true, analysisStatus: true },
      orderBy: { title: "asc" },
    });
  } catch (error) {
    logger.error("Failed to fetch all referenciels:", error);
    return [];
  }
}
