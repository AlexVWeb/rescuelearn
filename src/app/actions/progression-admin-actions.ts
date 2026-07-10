"use server";

import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { logger } from "@/lib/logger";
import { ProgressionAdminService } from "@/services/progression.service";
import { z } from "zod";

// Helper to assert super admin
async function assertSuperAdmin() {
  const user = await getUserContext();
  const roles =
    typeof user.roles === "string" ? JSON.parse(user.roles) : user.roles;
  if (!hasRole(roles, UserRole.SUPER_ADMIN)) {
    throw new Error("Action non autorisée.");
  }
}

export async function getProgressionTreesAction() {
  try {
    await assertSuperAdmin();
    const trees = await ProgressionAdminService.getProgressionTrees();
    return { success: true, data: trees };
  } catch (error) {
    logger.error("Erreur getProgressionTreesAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

export async function getProgressionNodeDetailsAction(nodeId: string) {
  try {
    await assertSuperAdmin();
    const node =
      await ProgressionAdminService.getProgressionNodeDetails(nodeId);
    return { success: true, data: node };
  } catch (error) {
    logger.error("Erreur getProgressionNodeDetailsAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

const nodeSchema = z.object({
  treeId: z.string(),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  xpReward: z.number().min(0),
});

export async function createProgressionNodeAction(data: unknown) {
  try {
    await assertSuperAdmin();
    const parsed = nodeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const node = await ProgressionAdminService.createProgressionNode(
      parsed.data
    );
    logger.info(
      `Nœud de progression créé : ${parsed.data.title} (arbre: ${parsed.data.treeId})`
    );
    return { success: true, data: node };
  } catch (error) {
    logger.error("Erreur createProgressionNodeAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

export async function updateProgressionNodeAction(
  nodeId: string,
  data: unknown
) {
  try {
    await assertSuperAdmin();
    const parsed = nodeSchema.omit({ treeId: true }).safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const node = await ProgressionAdminService.updateProgressionNode(
      nodeId,
      parsed.data
    );
    logger.info(`Nœud de progression mis à jour : ${parsed.data.title}`);
    return { success: true, data: node };
  } catch (error) {
    logger.error("Erreur updateProgressionNodeAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

export async function deleteProgressionNodeAction(nodeId: string) {
  try {
    await assertSuperAdmin();
    await ProgressionAdminService.deleteProgressionNode(nodeId);
    logger.info(`Nœud de progression supprimé et arbre réordonné : ${nodeId}`);
    return { success: true };
  } catch (error) {
    logger.error("Erreur deleteProgressionNodeAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

export async function reorderProgressionNodesAction(
  treeId: string,
  nodeIds: string[]
) {
  try {
    await assertSuperAdmin();
    await ProgressionAdminService.reorderProgressionNodes(treeId, nodeIds);
    logger.info(`Arbre de progression réordonné avec succès : ${treeId}`);
    return { success: true };
  } catch (error) {
    logger.error("Erreur reorderProgressionNodesAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

const exerciseSaveSchema = z.object({
  type: z.enum(["MICRO_COURSE", "QUIZ_QUESTION", "FLASHCARD"]),
  questionId: z.number().nullable().optional(),
  learningCardId: z.number().nullable().optional(),
  courseTitle: z.string().nullable().optional(),
  courseContent: z.string().nullable().optional(),
  _newQuestion: z
    .object({
      text: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.string(),
      explanation: z.string().optional(),
    })
    .optional(),
  _newFlashcard: z
    .object({
      theme: z.string(),
      info: z.string(),
      reference: z.string(),
      niveau: z.string(),
    })
    .optional(),
});

export async function saveProgressionNodeExercisesAction(
  nodeId: string,
  exercises: unknown[]
) {
  try {
    await assertSuperAdmin();
    const parsedExercises = z.array(exerciseSaveSchema).parse(exercises);
    await ProgressionAdminService.saveProgressionNodeExercises(
      nodeId,
      parsedExercises
    );
    logger.info(`Exercices sauvegardés pour le nœud ${nodeId}`);
    return { success: true };
  } catch (error) {
    logger.error("Erreur saveProgressionNodeExercisesAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

const aiGenSchema = z.object({
  referencielId: z.number(),
  topic: z.string().min(1),
  level: z.string().optional(),
  structureConfig: z.object({
    microCourseCount: z.number().min(0).max(10),
    quizCount: z.number().min(0).max(10),
    flashcardCount: z.number().min(0).max(10),
  }),
});

export async function generateProgressionNodeWithAiAction(jsonData: unknown) {
  try {
    await assertSuperAdmin();
    const parsed = aiGenSchema.safeParse(jsonData);
    if (!parsed.success) {
      return { success: false, error: "Paramètres invalides" };
    }

    const aiResult =
      await ProgressionAdminService.generateProgressionNodeWithAi(parsed.data);
    return { success: true, data: aiResult };
  } catch (error) {
    logger.error("Erreur generateProgressionNodeWithAiAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}

const entireTreeAiSchema = z.object({
  treeId: z.string(),
  referencielId: z.number(),
  topic: z.string().min(1),
});

export async function generateEntireTreeWithAiAction(jsonData: unknown) {
  try {
    await assertSuperAdmin();
    const parsed = entireTreeAiSchema.safeParse(jsonData);
    if (!parsed.success) {
      return { success: false, error: "Paramètres invalides" };
    }

    await ProgressionAdminService.generateEntireTreeWithAi(parsed.data);
    logger.info(
      `L'arbre de progression (arbre: ${parsed.data.treeId}) a été entièrement généré par l'IA.`
    );
    return { success: true };
  } catch (error) {
    logger.error("Erreur generateEntireTreeWithAiAction:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Une erreur est survenue.",
    };
  }
}
