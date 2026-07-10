import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  generateProgressionNodeFromPdf,
  generateEntireTreeFromPdf,
} from "@/lib/gemini";
import dayjs from "dayjs";

import { ProgressionExerciseInput } from "@/types/progression";

export class ProgressionAdminService {
  static async getProgressionTrees() {
    const levels = ["GQS", "PSC", "SST", "PSE"];
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
  }

  static async generateProgressionNodeWithAi(data: {
    referencielId: number;
    topic: string;
    level?: string;
    structureConfig: {
      microCourseCount: number;
      quizCount: number;
      flashcardCount: number;
    };
  }) {
    const { referencielId, topic, level, structureConfig } = data;

    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
    });

    if (!referenciel) {
      throw new Error("Référentiel introuvable");
    }

    let pdfPath = "";
    let tempFileCreated = false;

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
      const os = await import("os");
      const tempDir = os.tmpdir();
      pdfPath = path.join(tempDir, `temp-${Date.now()}-${path.basename(key)}`);
      await fs.writeFile(pdfPath, buffer);
      tempFileCreated = true;
    } else {
      const path = await import("path");
      pdfPath = path.join(process.cwd(), "public", referenciel.pdfUrl);
    }

    try {
      const aiResult = await generateProgressionNodeFromPdf({
        pdfPath,
        topic,
        structureConfig,
        level,
      });
      return aiResult;
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

    let pdfPath = "";
    let tempFileCreated = false;

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
      const os = await import("os");
      const tempDir = os.tmpdir();
      pdfPath = path.join(tempDir, `temp-${Date.now()}-${path.basename(key)}`);
      await fs.writeFile(pdfPath, buffer);
      tempFileCreated = true;
    } else {
      const path = await import("path");
      pdfPath = path.join(process.cwd(), "public", referenciel.pdfUrl);
    }

    try {
      const aiResult = await generateEntireTreeFromPdf({
        pdfPath,
        level: tree.level,
        topic,
      });

      if (!aiResult || !aiResult.nodes) {
        throw new Error("Format de réponse IA invalide");
      }

      let quiz = await prisma.quiz.findFirst({
        where: { title: `Banque Progression - ${tree.level}` },
      });

      if (!quiz) {
        quiz = await prisma.quiz.create({
          data: {
            title: `Banque Progression - ${tree.level}`,
            status: "DRAFT",
          },
        });
      }

      await prisma.$transaction(async (tx) => {
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

          if (aiNode.exercises && Array.isArray(aiNode.exercises)) {
            for (let j = 0; j < aiNode.exercises.length; j++) {
              const ex = aiNode.exercises[j];
              let questionId: number | null = null;
              let learningCardId: number | null = null;

              if (ex.type === "QUIZ_QUESTION") {
                const createdQuestion = await tx.question.create({
                  data: {
                    quizId: quiz!.id,
                    text: ex.questionText,
                    correctAnswer: String(ex.correctAnswer),
                    explanation: ex.explanation || "",
                    options: {
                      create: ex.options.map((opt: string, oIdx: number) => ({
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
                    theme: ex.flashcardTheme || topic,
                    info: ex.flashcardInfo || "",
                    reference: ex.flashcardReference || "",
                    niveau: tree.level,
                  },
                });
                learningCardId = createdCard.id;
              }

              await tx.progressionNodeExercise.create({
                data: {
                  nodeId: node.id,
                  order: j,
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
        }
      });

      return aiResult;
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
      targetLevel = "PSE";
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
            correctAnswerIndex: parseInt(ex.question.correctAnswer, 10),
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
