import { prisma } from "@/lib/prisma";
import { ProgressionExerciseInput } from "@/types/progression";
import { getProgressionQuizBank } from "./ai-exercises";
import {
  generateEntireTreeWithAi,
  generateNextTreeNode,
  generateProgressionNodeWithAi,
  startTreeGenerationFromTopics,
} from "./generation";

const LEVELS = ["GQS", "PSC", "SST", "PSE1", "PSE2"];

export class ProgressionAdminService {
  static generateProgressionNodeWithAi = generateProgressionNodeWithAi;
  static generateEntireTreeWithAi = generateEntireTreeWithAi;
  static startTreeGenerationFromTopics = startTreeGenerationFromTopics;
  static generateNextTreeNode = generateNextTreeNode;

  static async getProgressionTrees() {
    for (const lvl of LEVELS) {
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
        const quiz = await getProgressionQuizBank(node.tree.level);
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
          data: { nodeId, order: index, ...ex },
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
}
