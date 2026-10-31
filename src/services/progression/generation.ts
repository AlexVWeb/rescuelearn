import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAiErrorMessage } from "@/lib/gemini/errors";
import {
  generateProgressionNodeFromPdf,
  generateEntireTreeFromPdf,
} from "@/lib/gemini";
import { loadReferencielPdf } from "@/lib/referenciel-pdf";
import { extractPages } from "@/lib/pdf/document";
import { mergePageRanges } from "@/lib/pdf/chapters";
import {
  planNodesFromTopics,
  type PlannedNode,
} from "@/lib/progression/plan-from-topics";
import {
  getProgressionQuizBank,
  persistAiExercises,
  toPromptTopic,
} from "./ai-exercises";

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

export async function generateProgressionNodeWithAi(data: {
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
    topic: data.topic?.trim() || (topics ?? []).map((t) => t.title).join(", "),
    structureConfig,
    level,
    topics: topics?.map(toPromptTopic),
  });
  return aiResult;
}

export async function generateEntireTreeWithAi(data: {
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
export async function startTreeGenerationFromTopics(data: {
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
export async function generateNextTreeNode(
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
    error = getAiErrorMessage(err, String(err));
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
