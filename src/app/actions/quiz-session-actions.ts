"use server";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// --- Types ---
export type QuizSessionStatus = "LOBBY" | "IN_PROGRESS" | "FINISHED";

export interface ParticipantScore {
  id: string;
  nickname: string;
  score: number;
}

// --- Helper Functions ---
function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- Server Actions ---

/**
 * Creates a new multiplayer quiz session.
 */
export async function createQuizSessionAction(quizId: number) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return { success: false, error: "Quiz introuvable" };
    }

    // Limit total concurrent active sessions to protect Supabase Realtime limits on free tier
    const activeSessionsCount = await prisma.quizSession.count({
      where: {
        status: { in: ["LOBBY", "IN_PROGRESS"] },
      },
    });

    if (activeSessionsCount >= 8) {
      return {
        success: false,
        error:
          "Limite de sessions simultanées atteinte. Veuillez réessayer plus tard.",
      };
    }

    // Generate unique code
    let code = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = generateSessionCode();
      const existing = await prisma.quizSession.findFirst({
        where: {
          code,
          status: { in: ["LOBBY", "IN_PROGRESS"] },
        },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return {
        success: false,
        error: "Impossible de générer un code unique de session",
      };
    }

    const session = await prisma.quizSession.create({
      data: {
        quizId,
        code,
        status: "LOBBY",
      },
    });

    logger.info(
      `Session de quiz multijoueurs créée : ${code} pour le quiz ${quizId}`
    );
    return { success: true, sessionId: session.id, code: session.code };
  } catch (error) {
    logger.error("Erreur lors de la création de la session de quiz :", error);
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Joins an existing quiz session.
 */
export async function joinQuizSessionAction(code: string, nickname: string) {
  const trimmedNickname = nickname.trim();
  if (!trimmedNickname) {
    return { success: false, error: "Le pseudo ne peut pas être vide" };
  }

  try {
    const session = await prisma.quizSession.findFirst({
      where: {
        code: code.toUpperCase(),
        status: "LOBBY",
      },
    });

    if (!session) {
      return { success: false, error: "Salon introuvable ou déjà démarré" };
    }

    // Limit participants per session (max 20) to prevent single-room overload
    const sessionParticipantsCount = await prisma.quizParticipant.count({
      where: { sessionId: session.id },
    });

    if (sessionParticipantsCount >= 20) {
      return {
        success: false,
        error: "Ce salon est complet (maximum 20 participants).",
      };
    }

    // Limit total active participants globally to avoid hitting Supabase Realtime connections limits
    const totalActiveParticipants = await prisma.quizParticipant.count({
      where: {
        session: {
          status: { in: ["LOBBY", "IN_PROGRESS"] },
        },
      },
    });

    if (totalActiveParticipants >= 160) {
      return {
        success: false,
        error: "Le serveur de jeu est saturé. Veuillez réessayer plus tard.",
      };
    }

    // Check if nickname already taken
    const existing = await prisma.quizParticipant.findUnique({
      where: {
        sessionId_nickname: {
          sessionId: session.id,
          nickname: trimmedNickname,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Ce pseudo est déjà pris dans ce salon" };
    }

    const participant = await prisma.quizParticipant.create({
      data: {
        nickname: trimmedNickname,
        sessionId: session.id,
      },
    });

    logger.info(`Participant ${trimmedNickname} a rejoint le salon ${code}`);
    return {
      success: true,
      participantId: participant.id,
      sessionId: session.id,
      nickname: participant.nickname,
    };
  } catch (error) {
    logger.error("Erreur lors de la connexion au salon :", error);
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Starts a quiz session. Only authorized via sessionId (acting as hostToken).
 */
export async function startQuizSessionAction(sessionId: string) {
  try {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session introuvable" };
    }

    if (session.status !== "LOBBY") {
      return { success: false, error: "La session a déjà démarré" };
    }

    if (session.quiz.questions.length === 0) {
      return { success: false, error: "Ce quiz ne contient aucune question" };
    }

    const firstQuestion = session.quiz.questions[0];

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: "IN_PROGRESS",
        currentQuestionId: firstQuestion.id,
        currentQuestionStartedAt: new Date(),
      },
    });

    logger.info(
      `Session de quiz ${session.code} démarrée. Question active: ${firstQuestion.id}`
    );
    return {
      success: true,
      currentQuestionId: firstQuestion.id,
      timePerQuestion: session.quiz.timePerQuestion,
    };
  } catch (error) {
    logger.error("Erreur lors du démarrage du quiz :", error);
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Submits an answer for a participant, calculating speed points securely.
 */
export async function submitAnswerAction(
  sessionId: string,
  participantId: string,
  questionId: number,
  optionId: number
) {
  try {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { quiz: true },
    });

    if (
      !session ||
      session.status !== "IN_PROGRESS" ||
      session.currentQuestionId !== questionId
    ) {
      return {
        success: false,
        error: "La question n'est pas active ou le quiz n'est pas en cours",
      };
    }

    const participant = await prisma.quizParticipant.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.sessionId !== sessionId) {
      return {
        success: false,
        error: "Participant non autorisé pour cette session",
      };
    }

    // Check if already answered
    const existingAnswer = await prisma.quizAnswer.findUnique({
      where: {
        participantId_questionId: {
          participantId,
          questionId,
        },
      },
    });

    if (existingAnswer) {
      return {
        success: false,
        error: "Vous avez déjà répondu à cette question",
      };
    }

    // Secure server-side time calculation
    const startedAt = session.currentQuestionStartedAt
      ? session.currentQuestionStartedAt.getTime()
      : Date.now();
    const responseTime = Date.now() - startedAt;

    // Check timeout (+2s grace period for network jitter)
    const timeLimitMs = (session.quiz.timePerQuestion + 2) * 1000;
    const isTimeout = responseTime > timeLimitMs;

    // Fetch the correct answer from the database
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      return { success: false, error: "Question introuvable" };
    }

    // Determine correctness
    const optionIndex = question.options.findIndex(
      (opt) => opt.id === optionId
    );
    const correctLetters = ["A", "B", "C", "D"];
    const isCorrect =
      !isTimeout &&
      optionIndex !== -1 &&
      correctLetters[optionIndex] === question.correctAnswer;

    // Calculate score
    let points = 0;
    if (isCorrect) {
      const basePoints = 500;
      // Bonus based on speed (max 500)
      const maxTimeMs = session.quiz.timePerQuestion * 1000;
      const speedFactor = Math.max(0, 1 - responseTime / maxTimeMs);
      const speedBonus = Math.round(500 * speedFactor);
      points = basePoints + speedBonus;
    }

    // Save answer
    await prisma.$transaction([
      prisma.quizAnswer.create({
        data: {
          participantId,
          questionId,
          optionId,
          isCorrect,
          responseTime,
        },
      }),
      prisma.quizParticipant.update({
        where: { id: participantId },
        data: {
          score: {
            increment: points,
          },
        },
      }),
    ]);

    return { success: true, isCorrect, points };
  } catch (error) {
    logger.error("Erreur lors de la soumission de la réponse :", error);
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Transitions to the next question.
 */
export async function nextQuestionAction(sessionId: string) {
  try {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!session || session.status !== "IN_PROGRESS") {
      return { success: false, error: "Session introuvable ou non active" };
    }

    const questions = session.quiz.questions;
    const currentIndex = questions.findIndex(
      (q) => q.id === session.currentQuestionId
    );

    if (currentIndex === -1 || currentIndex === questions.length - 1) {
      // No more questions -> Finish quiz
      await prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          status: "FINISHED",
          currentQuestionId: null,
          currentQuestionStartedAt: null,
        },
      });

      return { success: true, finished: true };
    }

    const nextQuestion = questions[currentIndex + 1];

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        currentQuestionId: nextQuestion.id,
        currentQuestionStartedAt: new Date(),
      },
    });

    return {
      success: true,
      finished: false,
      currentQuestionId: nextQuestion.id,
    };
  } catch (error) {
    logger.error("Erreur lors du passage à la question suivante :", error);
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Fetches the current leaderboard for the session.
 */
export async function getLeaderboardAction(
  sessionId: string
): Promise<{ success: boolean; data?: ParticipantScore[]; error?: string }> {
  try {
    const participants = await prisma.quizParticipant.findMany({
      where: { sessionId },
      select: {
        id: true,
        nickname: true,
        score: true,
      },
      orderBy: {
        score: "desc",
      },
    });

    return { success: true, data: participants };
  } catch (error) {
    logger.error("Erreur lors de la récupération du classement :", error);
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Fetches the current state of a quiz session.
 * Strictly filters out correct answers for participants to prevent sniffing.
 */
export async function getQuizSessionStateAction(
  code: string,
  hostToken?: string
) {
  try {
    const session = await prisma.quizSession.findFirst({
      where: { code: code.toUpperCase() },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { id: "asc" },
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session introuvable" };
    }

    const isHost = hostToken === session.id;

    // Security: Strip correctAnswer and explanation if not the host
    const sanitizedQuestions = session.quiz.questions.map((q) => {
      const { correctAnswer, explanation, ...rest } = q;
      return {
        ...rest,
        correctAnswer: isHost ? correctAnswer : "",
        explanation: isHost ? explanation : null,
      };
    });

    return {
      success: true,
      data: {
        id: session.id,
        code: session.code,
        status: session.status,
        currentQuestionId: session.currentQuestionId,
        currentQuestionStartedAt: session.currentQuestionStartedAt,
        timePerQuestion: session.quiz.timePerQuestion,
        quizTitle: session.quiz.title,
        questions: sanitizedQuestions,
      },
    };
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération de l'état de la session :",
      error
    );
    return { success: false, error: "Erreur interne du serveur" };
  }
}

/**
 * Checks if the multiplayer server is currently saturated (reached limit of active sessions).
 */
export async function checkServerSaturationAction() {
  try {
    const activeSessionsCount = await prisma.quizSession.count({
      where: {
        status: { in: ["LOBBY", "IN_PROGRESS"] },
      },
    });
    return { success: true, isSaturated: activeSessionsCount >= 8 };
  } catch (error) {
    logger.error(
      "Erreur lors de la vérification de la saturation du serveur :",
      error
    );
    return { success: false, isSaturated: false };
  }
}
