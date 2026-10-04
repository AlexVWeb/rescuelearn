import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  generateProgressionNodeFromPdf,
  generateEntireTreeFromPdf,
} from "@/lib/gemini";
import { loadReferencielPdf } from "@/lib/referenciel-pdf";
import { answerIndex, answerLetter, shuffleOptions } from "@/lib/quiz-answers";
import { extractPages } from "@/lib/pdf/document";
import { mergePageRanges } from "@/lib/pdf/chapters";
import {
  planNodesFromTopics,
  type PlannedNode,
} from "@/lib/progression/plan-from-topics";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { ProgressionExerciseInput } from "@/types/progression";

export class ProgressionAdminService {
  static async getProgressionTrees() {
    const levels = ["GQS", "PSC", "SST", "PSE1", "PSE2"];
    for (const lvl of levels) {
      await prisma.progressionTree.upsert({
        where: { level: lvl },
        update: {},
        create: {
          level: lvl,
          description: `Arbre de progression pour la formation ${lvl}`,
        },
      });
    }

    return prisma.progressionTree.findMany({
      include: {
        nodes: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { level: "asc" },
    });
  }

  static async getProgressionNodeDetails(nodeId: string) {
    const node = await prisma.progressionNode.findUnique({
      where: { id: nodeId },
      include: {
        tree: true,
        exercises: {
          orderBy: { order: "asc" },
          include: {
            question: {
              include: { options: true },
            },
            learningCard: true,
          },
        },
      },
    });

    if (!node) {
      throw new Error("Nœud introuvable.");
    }

    return node;
  }

  static async createProgressionNode(data: {
    treeId: string;
    title: string;
    description?: string;
    xpReward: number;
  }) {
    const { treeId, title, description, xpReward } = data;

    const count = await prisma.progressionNode.count({
      where: { treeId },
    });

    return prisma.progressionNode.create({
      data: {
        treeId,
        title,
        description,
        xpReward,
        order: count,
      },
    });
  }

  static async updateProgressionNode(
    nodeId: string,
    data: {
      title: string;
      description?: string;
      xpReward: number;
    }
  ) {
    const { title, description, xpReward } = data;

    return prisma.progressionNode.update({
      where: { id: nodeId },
      data: {
        title,
        description,
        xpReward,
      },
    });
  }

  static async deleteProgressionNode(nodeId: string) {
    const node = await prisma.progressionNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new Error("Nœud introuvable.");
    }

    const { treeId } = node;

    await prisma.progressionNode.delete({
      where: { id: nodeId },
    });

    const remainingNodes = await prisma.progressionNode.findMany({
      where: { treeId },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < remainingNodes.length; i++) {
      await prisma.progressionNode.update({
        where: { id: remainingNodes[i].id },
        data: { order: i },
      });
    }
  }

  static async reorderProgressionNodes(treeId: string, nodeIds: string[]) {
    await prisma.$transaction(
      nodeIds.map((id, index) =>
        prisma.progressionNode.update({
          where: { id, treeId },
          data: { order: index },
        })
      )
    );
  }

  static async saveProgressionNodeExercises(
    nodeId: string,
    exercises: ProgressionExerciseInput[]
  ) {
    const node = await prisma.progressionNode.findUnique({
      where: { id: nodeId },
      include: { tree: true },
    });
    if (!node) {
      throw new Error("Nœud introuvable.");
    }

    const processedExercises = [];
    const linkedTopicIds = new Set<string>();

    for (const ex of exercises) {
      let finalQuestionId = ex.questionId || null;
      let finalLearningCardId = ex.learningCardId || null;

      if (ex._newQuestion) {
        const level = node.tree.level;
        let quiz = await prisma.quiz.findFirst({
          where: { title: `Banque Progression - ${level}` },
        });

        if (!quiz) {
          quiz = await prisma.quiz.create({
            data: {
              title: `Banque Progression - ${level}`,
              status: "DRAFT",
            },
          });
        }

        const createdQuestion = await prisma.question.create({
          data: {
            quizId: quiz.id,
            text: ex._newQuestion.text,
            correctAnswer: ex._newQuestion.correctAnswer,
            explanation: ex._newQuestion.explanation || "",
            topicId: ex._newQuestion.topicId ?? null,
            options: {
              create: ex._newQuestion.options.map(
                (opt: string, oIdx: number) => ({
                  text: opt,
                  optionId: String(oIdx),
                })
              ),
            },
          },
        });
        finalQuestionId = createdQuestion.id;
        if (ex._newQuestion.topicId)
          linkedTopicIds.add(ex._newQuestion.topicId);
      }

      if (ex._newFlashcard) {
        const createdCard = await prisma.learningCard.create({
          data: {
            theme: ex._newFlashcard.theme,
            info: ex._newFlashcard.info,
            reference: ex._newFlashcard.reference,
            niveau: ex._newFlashcard.niveau,
          },
        });
        finalLearningCardId = createdCard.id;
      }

      processedExercises.push({
        type: ex.type,
        questionId: finalQuestionId,
        learningCardId: finalLearningCardId,
        courseTitle: ex.courseTitle || null,
        courseContent: ex.courseContent || null,
      });
    }

    await prisma.$transaction([
      prisma.progressionNodeExercise.deleteMany({
        where: { nodeId },
      }),
      ...processedExercises.map((ex, index) =>
        prisma.progressionNodeExercise.create({
          data: {
            nodeId,
            order: index,
            type: ex.type,
            questionId: ex.questionId,
            learningCardId: ex.learningCardId,
            courseTitle: ex.courseTitle,
            courseContent: ex.courseContent,
          },
        })
      ),
    ]);

    // Leçon générée sur des sujets : le nœud est rattaché à ces sujets
    if (linkedTopicIds.size > 0) {
      await prisma.progressionNode.update({
        where: { id: nodeId },
        data: {
          topics: { connect: [...linkedTopicIds].map((id) => ({ id })) },
        },
      });
    }
  }

  static async generateProgressionNodeWithAi(data: {
    referencielId: number;
    topic?: string;
    topicIds?: string[];
    level?: string;
    structureConfig: {
      microCourseCount: number;
      quizCount: number;
      flashcardCount: number;
    };
  }) {
    const { referencielId, topicIds, level, structureConfig } = data;

    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
    });

    if (!referenciel) {
      throw new Error("Référentiel introuvable");
    }

    // Leçon ciblée : seules les pages des sujets choisis sont envoyées
    const topics = topicIds?.length
      ? await prisma.referencielTopic.findMany({
          where: { id: { in: topicIds }, referencielId },
          orderBy: { order: "asc" },
        })
      : undefined;
    if (topics && topics.length !== new Set(topicIds).size) {
      throw new Error("Sujets introuvables pour ce référentiel");
    }

    const fullPdf = await loadReferencielPdf(referenciel.pdfUrl);
    const pdf = topics
      ? await extractPages(fullPdf, mergePageRanges(topics))
      : fullPdf;

    const aiResult = await generateProgressionNodeFromPdf({
      pdf,
      topic:
        data.topic?.trim() || (topics ?? []).map((t) => t.title).join(", "),
      structureConfig,
      level,
      topics: topics?.map(toPromptTopic),
    });
    return aiResult;
  }

  static async generateEntireTreeWithAi(data: {
    treeId: string;
    referencielId: number;
    topic: string;
  }) {
    const { treeId, referencielId, topic } = data;

    const tree = await prisma.progressionTree.findUnique({
      where: { id: treeId },
    });

    if (!tree) {
      throw new Error("Arbre de progression introuvable");
    }

    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
    });

    if (!referenciel) {
      throw new Error("Référentiel introuvable");
    }

    const pdf = await loadReferencielPdf(referenciel.pdfUrl);

    const aiResult = await generateEntireTreeFromPdf({
      pdf,
      level: tree.level,
      topic,
    });

    if (!aiResult || !aiResult.nodes) {
      throw new Error("Format de réponse IA invalide");
    }

    const quiz = await getProgressionQuizBank(tree.level);

    await prisma.$transaction(
      async (tx) => {
        await tx.progressionNode.deleteMany({
          where: { treeId },
        });

        for (let i = 0; i < aiResult.nodes.length; i++) {
          const aiNode = aiResult.nodes[i];
          const node = await tx.progressionNode.create({
            data: {
              treeId,
              title: aiNode.title,
              description: aiNode.description,
              xpReward: aiNode.xpReward || 100,
              order: i,
            },
          });

          if (Array.isArray(aiNode.exercises)) {
            await persistAiExercises(tx, node.id, aiNode.exercises, {
              quizId: quiz!.id,
              level: tree.level,
              fallbackTheme: topic,
            });
          }
        }
      },
      { timeout: 60000 }
    );

    return aiResult;
  }

  /**
   * Prépare la génération d'un parcours à partir des sujets analysés d'un
   * référentiel : calcule le plan, vide l'arbre et enregistre le plan. Les
   * nœuds sont ensuite générés un par un par generateNextTreeNode, appelé en
   * boucle par la page admin (un parcours complet dépasse la durée max d'une
   * fonction).
   */
  static async startTreeGenerationFromTopics(data: {
    treeId: string;
    referencielId: number;
    restart?: boolean;
  }) {
    const { treeId, referencielId, restart } = data;

    const tree = await prisma.progressionTree.findUnique({
      where: { id: treeId },
    });
    if (!tree) {
      throw new Error("Arbre de progression introuvable");
    }
    if (tree.generationStatus === "PROCESSING" && !restart) {
      throw new Error("Génération déjà en cours");
    }

    const topics = await prisma.referencielTopic.findMany({
      where: { referencielId },
    });
    const plan = planNodesFromTopics(topics, tree.level);
    if (plan.length === 0) {
      throw new Error(`Aucun sujet analysé pour le niveau ${tree.level}`);
    }

    await prisma.$transaction([
      prisma.progressionNode.deleteMany({ where: { treeId } }),
      prisma.progressionTree.update({
        where: { id: treeId },
        data: {
          referencielId,
          generationStatus: "PROCESSING",
          generationPlan: plan,
          generationDone: 0,
          generationTotal: plan.length,
          generationError: null,
          generationStartedAt: new Date(),
        },
      }),
    ]);

    return { total: plan.length };
  }

  /**
   * Génère le prochain nœud du plan. L'index est réservé avant l'appel à l'IA
   * pour qu'un second onglet ne génère pas le même nœud. Un nœud en échec est
   * noté dans generationError et la génération continue.
   */
  static async generateNextTreeNode(
    treeId: string
  ): Promise<TreeGenerationStep> {
    const tree = await prisma.progressionTree.findUnique({
      where: { id: treeId },
    });
    if (!tree) {
      throw new Error("Arbre de progression introuvable");
    }

    const plan = (tree.generationPlan ?? []) as PlannedNode[];
    const index = tree.generationDone;
    if (tree.generationStatus !== "PROCESSING" || index >= plan.length) {
      return generationSnapshot(tree);
    }

    const claimed = await prisma.progressionTree.updateMany({
      where: {
        id: treeId,
        generationStatus: "PROCESSING",
        generationDone: index,
      },
      data: { generationDone: index + 1 },
    });
    if (claimed.count === 0) {
      // Un autre appel (autre onglet) a déjà pris ce nœud
      const current = await prisma.progressionTree.findUnique({
        where: { id: treeId },
      });
      return generationSnapshot(current ?? tree);
    }

    const planned = plan[index];
    let error: string | undefined;
    try {
      await generatePlannedNode(tree, planned);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      logger.error(`Échec de génération du nœud "${planned.title}":`, err);
      const line = `${planned.title} : ${error}`;
      await prisma.progressionTree.update({
        where: { id: treeId },
        data: {
          generationError: tree.generationError
            ? `${tree.generationError}\n${line}`
            : line,
        },
      });
    }

    if (index + 1 >= plan.length) {
      await prisma.progressionTree.update({
        where: { id: treeId },
        data: {
          generationStatus: tree.generationError || error ? "FAILED" : "DONE",
        },
      });
    }

    const updated = await prisma.progressionTree.findUnique({
      where: { id: treeId },
    });
    return {
      ...generationSnapshot(updated ?? tree),
      nodeTitle: planned.title,
      error,
    };
  }
}

const LESSON_STRUCTURE = {
  microCourseCount: 1,
  quizCount: 3,
  flashcardCount: 1,
};
const DEFAULT_NODE_XP = 100;

type GenerationState = {
  generationStatus: string;
  generationDone: number;
  generationTotal: number;
};

export type TreeGenerationStep = {
  status: string;
  done: number;
  total: number;
  nodeTitle?: string;
  error?: string;
};

function generationSnapshot(tree: GenerationState): TreeGenerationStep {
  return {
    status: tree.generationStatus,
    done: tree.generationDone,
    total: tree.generationTotal,
  };
}

function toPromptTopic(topic: {
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

async function getProgressionQuizBank(level: string) {
  const title = `Banque Progression - ${level}`;
  const existing = await prisma.quiz.findFirst({ where: { title } });
  return (
    existing ?? (await prisma.quiz.create({ data: { title, status: "DRAFT" } }))
  );
}

async function generatePlannedNode(
  tree: { id: string; level: string; referencielId: number | null },
  planned: PlannedNode
) {
  if (!tree.referencielId) {
    throw new Error("Référentiel du parcours introuvable");
  }
  const [referenciel, topics] = await Promise.all([
    prisma.referenciel.findUnique({ where: { id: tree.referencielId } }),
    prisma.referencielTopic.findMany({
      where: {
        id: { in: planned.topicIds },
        referencielId: tree.referencielId,
      },
      orderBy: { order: "asc" },
    }),
  ]);
  if (!referenciel) {
    throw new Error("Référentiel introuvable");
  }
  if (topics.length === 0) {
    throw new Error(
      "Sujets introuvables (supprimés depuis la planification ?)"
    );
  }

  // Seules les pages des sujets du nœud sont envoyées à l'IA
  const fullPdf = await loadReferencielPdf(referenciel.pdfUrl);
  const pdf = await extractPages(fullPdf, mergePageRanges(topics));
  const aiResult = await generateProgressionNodeFromPdf({
    pdf,
    topic: planned.title,
    level: tree.level,
    structureConfig: LESSON_STRUCTURE,
    topics: topics.map(toPromptTopic),
  });
  if (!Array.isArray(aiResult?.exercises) || aiResult.exercises.length === 0) {
    throw new Error("Réponse IA sans exercice");
  }

  const quiz = await getProgressionQuizBank(tree.level);
  await prisma.$transaction(
    async (tx) => {
      const order = await tx.progressionNode.count({
        where: { treeId: tree.id },
      });
      const node = await tx.progressionNode.create({
        data: {
          treeId: tree.id,
          title: planned.title,
          description: aiResult.description || null,
          xpReward: DEFAULT_NODE_XP,
          order,
          topics: { connect: topics.map((t) => ({ id: t.id })) },
        },
      });
      await persistAiExercises(tx, node.id, aiResult.exercises, {
        quizId: quiz.id,
        level: tree.level,
        fallbackTheme: planned.title,
        topicId: topics[0].id,
      });
    },
    { timeout: 30000 }
  );
}

type AiExercise = {
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

// Crée les questions, fiches et exercices d'un nœud généré par l'IA
async function persistAiExercises(
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

export class ProgressionPlayerService {
  static async getPlayerProgressionPath(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        onboardingExperience: true,
      },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable.");
    }

    let targetLevel = "GQS";
    const experience = user.onboardingExperience || "";
    if (experience === "intermediate") {
      targetLevel = "PSC";
    } else if (experience === "professional") {
      targetLevel = "PSE1";
    }

    let tree = await prisma.progressionTree.findUnique({
      where: { level: targetLevel },
      include: {
        nodes: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!tree) {
      tree = await prisma.progressionTree.upsert({
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
    }

    const completedNodeProgressions = await prisma.playerProgress.findMany({
      where: { userId: user.id },
      select: { nodeId: true },
    });
    const completedNodeIds = new Set(
      completedNodeProgressions.map((p) => p.nodeId)
    );

    const nodesWithStatus = tree.nodes.map((node, index) => {
      const isCompleted = completedNodeIds.has(node.id);
      let status: "completed" | "current" | "locked" = "locked";

      if (index === 0) {
        status = isCompleted ? "completed" : "current";
      } else {
        const prevNode = tree.nodes[index - 1];
        const isPrevCompleted = completedNodeIds.has(prevNode.id);

        if (isCompleted) {
          status = "completed";
        } else if (isPrevCompleted) {
          status = "current";
        } else {
          status = "locked";
        }
      }

      return {
        id: node.id,
        title: node.title,
        subtitle: `Niveau ${index + 1}`,
        description: node.description || "",
        xpReward: node.xpReward,
        status,
        themeColor: this.getThemeColorForIndex(index),
      };
    });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { xp: true, hearts: true, streak: true },
    });

    return {
      treeId: tree.id,
      level: tree.level,
      nodes: nodesWithStatus,
      stats: {
        xp: dbUser?.xp ?? 0,
        hearts: dbUser?.hearts ?? 5,
        streak: dbUser?.streak ?? 0,
      },
    };
  }

  static async startProgressionNodeSession(userId: string, nodeId: string) {
    const node = await prisma.progressionNode.findUnique({
      where: { id: nodeId },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: {
            question: {
              include: { options: true },
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

    const clientExercises = node.exercises.map((ex) => {
      if (ex.type === "QUIZ_QUESTION" && ex.question) {
        return {
          id: ex.id,
          type: ex.type,
          order: ex.order,
          question: {
            id: ex.question.id,
            text: ex.question.text,
            options: ex.question.options.map((o) => ({
              id: o.id,
              text: o.text,
            })),
            correctAnswerIndex: answerIndex(ex.question.correctAnswer),
            explanation: ex.question.explanation,
          },
        };
      }
      if (ex.type === "FLASHCARD" && ex.learningCard) {
        return {
          id: ex.id,
          type: ex.type,
          order: ex.order,
          flashcard: {
            id: ex.learningCard.id,
            theme: ex.learningCard.theme,
            niveau: ex.learningCard.niveau,
            info: ex.learningCard.info,
            reference: ex.learningCard.reference,
          },
        };
      }
      return {
        id: ex.id,
        type: ex.type,
        order: ex.order,
        courseTitle: ex.courseTitle,
        courseContent: ex.courseContent,
      };
    });

    return {
      nodeId: node.id,
      title: node.title,
      xpReward: node.xpReward,
      exercises: clientExercises,
    };
  }

  static async submitNodeCompletion(
    userId: string,
    nodeId: string,
    score: number
  ) {
    const node = await prisma.progressionNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new Error("Nœud introuvable.");
    }

    await prisma.playerProgress.upsert({
      where: {
        userId_nodeId: {
          userId,
          nodeId,
        },
      },
      update: {
        score,
      },
      create: {
        userId,
        nodeId,
        score,
      },
    });

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, xp: true, streak: true, lastActiveAt: true },
    });

    if (!dbUser) {
      throw new Error("Utilisateur introuvable.");
    }

    let newStreak = dbUser.streak ?? 0;
    const now = dayjs();
    const lastActive = dbUser.lastActiveAt ? dayjs(dbUser.lastActiveAt) : null;

    if (!lastActive) {
      newStreak = 1;
    } else {
      const diffInDays = now
        .startOf("day")
        .diff(lastActive.startOf("day"), "day");
      if (diffInDays === 1) {
        newStreak += 1;
      } else if (diffInDays > 1) {
        newStreak = 1;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: node.xpReward },
        streak: newStreak,
        lastActiveAt: now.toDate(),
      },
    });

    logger.info(
      `Le joueur ${dbUser.email} a complété le nœud ${node.title}. XP gagnés: ${node.xpReward}, Nouvelle série: ${newStreak}`
    );

    return {
      xpGained: node.xpReward,
      totalXp: updatedUser.xp,
      streak: updatedUser.streak,
    };
  }

  private static getThemeColorForIndex(index: number): string {
    const colors = [
      "from-green-400 to-green-500 border-green-600 shadow-green-200",
      "from-blue-400 to-blue-500 border-blue-600 shadow-blue-200",
      "from-amber-400 to-amber-500 border-amber-600 shadow-amber-200",
      "from-purple-400 to-purple-500 border-purple-600 shadow-purple-200",
      "from-rose-400 to-rose-500 border-rose-600 shadow-rose-200",
      "from-cyan-400 to-cyan-500 border-cyan-600 shadow-cyan-200",
    ];
    return colors[index % colors.length];
  }
}
