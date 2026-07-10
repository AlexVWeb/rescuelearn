"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { z } from "zod";

const submitAnswerSchema = z.object({
  questionId: z.number(),
  optionIndex: z.string(),
});

export async function submitDailyQuestionAnswerAction(values: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const parsed = submitAnswerSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { questionId, optionIndex } = parsed.data;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return { success: false, error: "Question introuvable." };
    }

    const LETTER_TO_INDEX: Record<string, string> = {
      A: "0",
      B: "1",
      C: "2",
      D: "3",
    };
    const correctAnswerIndex =
      LETTER_TO_INDEX[question.correctAnswer] ?? question.correctAnswer;

    // Check if the user has already answered this question today/before to avoid duplicate spamming
    const existingAnswer = await prisma.dailyQuestionAnswer.findFirst({
      where: {
        userId: session.user.id,
        questionId,
      },
    });

    if (existingAnswer) {
      return {
        success: true,
        data: {
          isCorrect: existingAnswer.isCorrect,
          correctAnswer: correctAnswerIndex,
          explanation: question.explanation,
          alreadyAnswered: true,
        },
      };
    }

    const isCorrect = correctAnswerIndex === optionIndex;

    await prisma.dailyQuestionAnswer.create({
      data: {
        userId: session.user.id,
        questionId,
        isCorrect,
        tags: question.tags,
      },
    });

    logger.info(
      `Réponse enregistrée pour l'utilisateur ${session.user.email} sur la question ${questionId}. Correct: ${isCorrect}`
    );

    return {
      success: true,
      data: {
        isCorrect,
        correctAnswer: correctAnswerIndex,
        explanation: question.explanation,
        alreadyAnswered: false,
      },
    };
  } catch (error) {
    logger.error("Erreur lors de la soumission de la réponse :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function getDailyQuestionStatsAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const answers = await prisma.dailyQuestionAnswer.findMany({
      where: { userId: session.user.id },
    });

    const total = answers.length;
    const correct = answers.filter((a) => a.isCorrect).length;
    const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Aggregate stats by tag
    const tagStats: Record<string, { total: number; correct: number }> = {};
    for (const ans of answers) {
      for (const tag of ans.tags) {
        if (!tagStats[tag]) {
          tagStats[tag] = { total: 0, correct: 0 };
        }
        tagStats[tag].total += 1;
        if (ans.isCorrect) {
          tagStats[tag].correct += 1;
        }
      }
    }

    const formattedTagStats = Object.entries(tagStats).map(([tag, stats]) => ({
      tag,
      total: stats.total,
      correct: stats.correct,
      rate: Math.round((stats.correct / stats.total) * 100),
    }));

    return {
      success: true,
      data: {
        total,
        correct,
        successRate,
        tagStats: formattedTagStats,
      },
    };
  } catch (error) {
    logger.error("Erreur lors de la récupération des statistiques :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function getQuestionForPlayerAction(questionId: number) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        text: true,
        options: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    if (!question) {
      return { success: false, error: "Question introuvable." };
    }

    return { success: true, data: question };
  } catch (error) {
    logger.error("Erreur lors de la récupération de la question :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}
