"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// --- Types ---

export type Quiz = {
  id: number;
  title: string;
  timePerQuestion: number;
  passingScore: number;
  modeRandom: boolean;
  _count?: { questions: number };
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
};

// --- Quiz Actions ---

export async function getQuizzesAction(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const skip = (page - 1) * limit;
  const where = search
    ? {
        title: { contains: search, mode: "insensitive" as const },
      }
    : {};

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
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return {
      success: true,
      data: quizzes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Failed to fetch quizzes:", error);
    return { success: false, error: "Failed to fetch quizzes" };
  }
}

export async function createQuizAction(data: {
  title: string;
  timePerQuestion: number;
  passingScore: number;
  modeRandom: boolean;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.quiz.create({
      data: {
        title: data.title,
        timePerQuestion: data.timePerQuestion,
        passingScore: data.passingScore,
        modeRandom: data.modeRandom,
      },
    });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    console.error("Failed to create quiz:", error);
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
  }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.quiz.update({
      where: { id },
      data: {
        title: data.title,
        timePerQuestion: data.timePerQuestion,
        passingScore: data.passingScore,
        modeRandom: data.modeRandom,
      },
    });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    console.error("Failed to update quiz:", error);
    return { success: false, error: "Failed to update quiz" };
  }
}

export async function deleteQuizAction(id: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.quiz.delete({
      where: { id },
    });
    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete quiz:", error);
    return { success: false, error: "Failed to delete quiz" };
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
      })
    )
    .min(1),
});

export async function importQuizAction(jsonData: any) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = importSchema.safeParse(jsonData);
  if (!parsed.success) {
    return { success: false, error: "Invalid JSON structure" };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx: any) => {
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
        },
      });

      // Create Questions
      for (const q of data.questions) {
        // Map index to letter
        const letters = ["A", "B", "C", "D"];
        const correctLetter = letters[q.correctAnswer] || "A";

        const question = await tx.question.create({
          data: {
            text: q.question,
            explanation: q.explanation,
            correctAnswer: correctLetter,
            quizId: quiz.id,
            options: {
              create: q.options.map((opt) => ({ text: opt })),
            },
          },
        });
      }
    });

    revalidatePath("/admin/quiz/quizzes");
    return { success: true };
  } catch (error) {
    console.error("Failed to import quiz:", error);
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

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
    console.error("Failed to fetch questions:", error);
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

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
    console.error("Failed to create question:", error);
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // Transaction to update question and replace options
    await prisma.$transaction(async (tx: any) => {
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
    console.error("Failed to update question:", error);
    return { success: false, error: "Failed to update question" };
  }
}

export async function deleteQuestionAction(id: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.question.delete({
      where: { id },
    });
    revalidatePath("/admin/quiz/questions");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete question:", error);
    return { success: false, error: "Failed to delete question" };
  }
}

export async function getAllQuizzesSimpleAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  try {
    return await prisma.quiz.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch all quizzes:", error);
    return [];
  }
}
