import { prisma } from "@/lib/prisma";
import { answerLetter, shuffleOptions } from "@/lib/quiz-answers";
import { Prisma } from "@prisma/client";

export type AiExercise = {
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD";
  courseTitle?: string;
  courseContent?: string;
  questionText?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  flashcardTheme?: string;
  flashcardInfo?: string;
  flashcardReference?: string;
  description?: string;
  content?: string;
};

// Quiz « banque » d'un niveau, qui regroupe les questions de la progression
export async function getProgressionQuizBank(level: string) {
  const title = `Banque Progression - ${level}`;
  const existing = await prisma.quiz.findFirst({ where: { title } });
  return (
    existing ?? (await prisma.quiz.create({ data: { title, status: "DRAFT" } }))
  );
}

export function toPromptTopic(topic: {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  pageStart: number;
  pageEnd: number;
}) {
  return {
    id: topic.id,
    title: topic.title,
    summary: topic.summary,
    keyPoints: topic.keyPoints,
    pageStart: topic.pageStart,
    pageEnd: topic.pageEnd,
  };
}

// Crée les questions, fiches et exercices d'un nœud généré par l'IA
export async function persistAiExercises(
  tx: Prisma.TransactionClient,
  nodeId: string,
  exercises: AiExercise[],
  options: {
    quizId: number;
    level: string;
    fallbackTheme: string;
    topicId?: string;
  }
) {
  for (const [order, ex] of exercises.entries()) {
    let questionId: number | null = null;
    let learningCardId: number | null = null;

    if (ex.type === "QUIZ_QUESTION") {
      // Options mélangées (biais de position de l'IA), réponse en lettre comme
      // le reste de la banque de questions
      const shuffled = shuffleOptions(ex.options ?? [], ex.correctAnswer ?? 0);
      const createdQuestion = await tx.question.create({
        data: {
          quizId: options.quizId,
          text: ex.questionText ?? "",
          correctAnswer: answerLetter(shuffled.correctIndex),
          explanation: ex.explanation || "",
          topicId: options.topicId ?? null,
          options: {
            create: shuffled.options.map((opt, oIdx) => ({
              text: opt,
              optionId: String(oIdx),
            })),
          },
        },
      });
      questionId = createdQuestion.id;
    }

    if (ex.type === "FLASHCARD") {
      const createdCard = await tx.learningCard.create({
        data: {
          theme: ex.flashcardTheme || options.fallbackTheme,
          info: ex.flashcardInfo || "",
          reference: ex.flashcardReference || "",
          niveau: options.level,
        },
      });
      learningCardId = createdCard.id;
    }

    await tx.progressionNodeExercise.create({
      data: {
        nodeId,
        order,
        type: ex.type,
        questionId,
        learningCardId,
        courseTitle: ex.courseTitle || null,
        courseContent:
          ex.courseContent ||
          ex.explanation ||
          ex.description ||
          ex.content ||
          null,
      },
    });
  }
}
