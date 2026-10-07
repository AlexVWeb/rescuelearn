import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { answerIndex } from "@/lib/quiz-answers";
import { Prisma } from "@prisma/client";
import {
  MAX_HEARTS,
  computeProgressionStats,
  displayedStreak,
  lessonScore,
  nextHeartAt,
  nextStreak,
  regenerateHearts,
} from "@/lib/progression/player-stats";
import {
  LEVEL_CHAIN,
  levelForExperience,
  nodeStatus,
  resolvePlayerLevel,
  themeColorForIndex,
  toClientExercise,
} from "./player-view";

// Erreur métier dont le message peut être montré au joueur
export class ProgressionPlayError extends Error {}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export class ProgressionPlayerService {
  /**
   * Arbre du joueur : celui de son niveau d'onboarding, puis le niveau
   * suivant de la filière dès que le parcours est entièrement terminé.
   */
  private static async getPlayerTree(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingExperience: true,
      },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable.");
    }

    const startLevel = levelForExperience(user.onboardingExperience);

    const [trees, progress] = await Promise.all([
      prisma.progressionTree.findMany({
        where: { level: { in: [...LEVEL_CHAIN, startLevel] } },
        include: {
          nodes: {
            orderBy: { order: "asc" },
          },
        },
      }),
      prisma.playerProgress.findMany({
        where: { userId: user.id },
        select: { nodeId: true },
      }),
    ]);
    const completedNodeIds = new Set(progress.map((p) => p.nodeId));

    const resolved =
      resolvePlayerLevel(startLevel, trees, completedNodeIds) ??
      resolvePlayerLevel("GQS", trees, completedNodeIds);
    if (resolved) {
      return { user, completedNodeIds, ...resolved };
    }

    const tree = await prisma.progressionTree.upsert({
      where: { level: "GQS" },
      update: {},
      create: {
        level: "GQS",
        description: "Arbre de progression pour la formation GQS",
      },
      include: {
        nodes: {
          orderBy: { order: "asc" },
        },
      },
    });

    return { user, completedNodeIds, tree, nextLevel: LEVEL_CHAIN[1] };
  }

  static async getPlayerProgressionPath(userId: string) {
    const { user, tree, nextLevel, completedNodeIds } =
      await this.getPlayerTree(userId);

    const nodesWithStatus = tree.nodes.map((node, index) => ({
      id: node.id,
      title: node.title,
      subtitle: `Niveau ${index + 1}`,
      description: node.description || "",
      xpReward: node.xpReward,
      status: nodeStatus(tree.nodes, index, completedNodeIds),
      themeColor: themeColorForIndex(index),
    }));

    const stats = await this.getPlayerStats(user.id);

    return {
      treeId: tree.id,
      level: tree.level,
      nextLevel,
      nodes: nodesWithStatus,
      stats,
    };
  }

  static async getProgressionStats(userId: string) {
    const { user, tree, nextLevel } = await this.getPlayerTree(userId);

    const progress = await prisma.playerProgress.findMany({
      where: { userId: user.id, node: { treeId: tree.id } },
      select: { nodeId: true, score: true, completedAt: true },
    });

    return {
      level: tree.level,
      nextLevel,
      ...computeProgressionStats(tree.nodes, progress),
    };
  }

  static async getPlayerStats(userId: string) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        hearts: true,
        heartsUpdatedAt: true,
        streak: true,
        lastActiveAt: true,
      },
    });

    if (!dbUser) {
      throw new Error("Utilisateur introuvable.");
    }

    const hearts = await this.refreshHearts(userId, dbUser);

    return {
      xp: dbUser.xp,
      hearts: hearts.hearts,
      maxHearts: MAX_HEARTS,
      nextHeartAt: nextHeartAt(hearts)?.toISOString() ?? null,
      streak: displayedStreak(dbUser.streak, dbUser.lastActiveAt),
    };
  }

  static async loseHeart(userId: string) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { hearts: true, heartsUpdatedAt: true },
    });

    if (!dbUser) {
      throw new Error("Utilisateur introuvable.");
    }

    const current = regenerateHearts(dbUser);
    const nextHearts = Math.max(0, current.hearts - 1);
    // Quitter le maximum démarre un nouveau cycle de recharge.
    const heartsUpdatedAt = current.heartsUpdatedAt ?? new Date();

    await prisma.user.update({
      where: { id: userId },
      data: { hearts: nextHearts, heartsUpdatedAt },
    });

    return {
      hearts: nextHearts,
      nextHeartAt:
        nextHeartAt({ hearts: nextHearts, heartsUpdatedAt })?.toISOString() ??
        null,
    };
  }

  private static async refreshHearts(
    userId: string,
    state: { hearts: number; heartsUpdatedAt: Date | null }
  ) {
    const regenerated = regenerateHearts(state);
    if (regenerated.changed) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          hearts: regenerated.hearts,
          heartsUpdatedAt: regenerated.heartsUpdatedAt,
        },
      });
    }
    return regenerated;
  }

  // Vies restantes du joueur, sinon erreur
  private static async requireHearts(userId: string) {
    const { hearts } = await this.getPlayerStats(userId);
    if (hearts <= 0) {
      throw new ProgressionPlayError("Plus de vies disponibles.");
    }
    return hearts;
  }

  static async startProgressionNodeSession(userId: string, nodeId: string) {
    const node = await prisma.progressionNode.findUnique({
      where: { id: nodeId },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: {
            question: {
              include: { options: { orderBy: { id: "asc" } } },
            },
            learningCard: true,
          },
        },
      },
    });

    if (!node) {
      throw new Error("Nœud introuvable.");
    }

    const treeNodes = await prisma.progressionNode.findMany({
      where: { treeId: node.treeId },
      orderBy: { order: "asc" },
    });

    const nodeIndex = treeNodes.findIndex((n) => n.id === node.id);
    if (nodeIndex > 0) {
      const prevNode = treeNodes[nodeIndex - 1];
      const prevCompleted = await prisma.playerProgress.findUnique({
        where: {
          userId_nodeId: {
            userId,
            nodeId: prevNode.id,
          },
        },
      });

      if (!prevCompleted) {
        throw new Error("Ce niveau est verrouillé.");
      }
    }

    const hearts = await this.requireHearts(userId);

    const attempt = await prisma.progressionAttempt.create({
      data: { userId, nodeId: node.id },
    });

    return {
      attemptId: attempt.id,
      nodeId: node.id,
      title: node.title,
      xpReward: node.xpReward,
      hearts,
      exercises: node.exercises.map(toClientExercise),
    };
  }

  // Tentative en cours appartenant au joueur, sinon erreur
  private static async getOpenAttempt(userId: string, attemptId: string) {
    const attempt = await prisma.progressionAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new ProgressionPlayError("Tentative introuvable.");
    }
    if (attempt.completedAt) {
      throw new ProgressionPlayError("Tentative déjà terminée.");
    }
    return attempt;
  }

  /**
   * Note une réponse côté serveur. Seule la première réponse à une question
   * compte : la contrainte unique (attemptId, exerciseId) empêche de
   * retenter après avoir vu la correction.
   */
  static async answerExercise(
    userId: string,
    attemptId: string,
    exerciseId: string,
    optionIndex: number
  ) {
    const attempt = await this.getOpenAttempt(userId, attemptId);

    const exercise = await prisma.progressionNodeExercise.findUnique({
      where: { id: exerciseId },
      include: { question: true },
    });
    if (
      !exercise ||
      exercise.nodeId !== attempt.nodeId ||
      exercise.type !== "QUIZ_QUESTION" ||
      !exercise.question
    ) {
      throw new ProgressionPlayError("Question introuvable.");
    }

    const hearts = await this.requireHearts(userId);

    const correctAnswerIndex = answerIndex(exercise.question.correctAnswer);
    const isCorrect = optionIndex === correctAnswerIndex;

    try {
      await prisma.progressionAttemptAnswer.create({
        data: { attemptId, exerciseId, isCorrect },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ProgressionPlayError("Question déjà répondue.");
      }
      throw error;
    }

    const remainingHearts = isCorrect
      ? hearts
      : (await this.loseHeart(userId)).hearts;

    return {
      isCorrect,
      correctAnswerIndex,
      explanation: exercise.question.explanation,
      hearts: remainingHearts,
    };
  }

  static async submitNodeCompletion(userId: string, attemptId: string) {
    const attempt = await this.getOpenAttempt(userId, attemptId);

    const node = await prisma.progressionNode.findUnique({
      where: { id: attempt.nodeId },
      include: { exercises: { select: { id: true, type: true } } },
    });

    if (!node) {
      throw new Error("Nœud introuvable.");
    }

    const answers = await prisma.progressionAttemptAnswer.findMany({
      where: { attemptId },
      select: { exerciseId: true, isCorrect: true },
    });
    const answered = new Map(answers.map((a) => [a.exerciseId, a.isCorrect]));
    const quizIds = node.exercises
      .filter((ex) => ex.type === "QUIZ_QUESTION")
      .map((ex) => ex.id);
    if (quizIds.some((id) => !answered.has(id))) {
      throw new ProgressionPlayError(
        "Toutes les questions doivent être répondues."
      );
    }
    const score = lessonScore(
      node.exercises,
      quizIds.filter((id) => answered.get(id)).length
    );

    // Clôture atomique : une tentative ne peut être validée qu'une fois.
    const closed = await prisma.progressionAttempt.updateMany({
      where: { id: attemptId, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (closed.count === 0) {
      throw new ProgressionPlayError("Tentative déjà terminée.");
    }

    const firstCompletion = await this.recordProgress(userId, node.id, score);
    const xpGained = firstCompletion ? node.xpReward : 0;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, xp: true, streak: true, lastActiveAt: true },
    });

    if (!dbUser) {
      throw new Error("Utilisateur introuvable.");
    }

    const now = new Date();
    const newStreak = nextStreak(dbUser.streak ?? 0, dbUser.lastActiveAt, now);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpGained },
        streak: newStreak,
        lastActiveAt: now,
      },
    });

    logger.info(
      `Le joueur ${dbUser.email} a complété le nœud ${node.title}. XP gagnés: ${xpGained}, Nouvelle série: ${newStreak}`
    );

    return {
      xpGained,
      alreadyCompleted: !firstCompletion,
      score,
      totalXp: updatedUser.xp,
      streak: updatedUser.streak,
    };
  }

  // Enregistre le score du nœud ; renvoie true à la première complétion
  private static async recordProgress(
    userId: string,
    nodeId: string,
    score: number
  ) {
    try {
      await prisma.playerProgress.create({
        data: { userId, nodeId, score },
      });
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      await prisma.playerProgress.update({
        where: { userId_nodeId: { userId, nodeId } },
        data: { score },
      });
      return false;
    }
  }
}
