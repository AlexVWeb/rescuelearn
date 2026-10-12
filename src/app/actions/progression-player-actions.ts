"use server";

import { getUserContext } from "@/lib/context";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  ProgressionPlayError,
  ProgressionPlayerService,
} from "@/services/progression.service";

export async function getPlayerProgressionPathAction() {
  try {
    const userContext = await getUserContext();
    const data = await ProgressionPlayerService.getPlayerProgressionPath(
      userContext.id
    );
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur getPlayerProgressionPathAction:", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function startProgressionNodeSessionAction(nodeId: string) {
  try {
    const user = await getUserContext();
    const data = await ProgressionPlayerService.startProgressionNodeSession(
      user.id,
      nodeId
    );
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur startProgressionNodeSessionAction:", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

function playErrorMessage(error: unknown) {
  return error instanceof ProgressionPlayError
    ? error.message
    : "Une erreur interne est survenue.";
}

const answerExerciseSchema = z.object({
  attemptId: z.string().min(1),
  exerciseId: z.string().min(1),
  optionIndex: z.number().int().min(0),
});

export async function answerExerciseAction(
  values: z.infer<typeof answerExerciseSchema>
) {
  try {
    const parsed = answerExerciseSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: "Réponse invalide." };
    }
    const user = await getUserContext();
    const { attemptId, exerciseId, optionIndex } = parsed.data;
    const data = await ProgressionPlayerService.answerExercise(
      user.id,
      attemptId,
      exerciseId,
      optionIndex
    );
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur answerExerciseAction:", error);
    return { success: false, error: playErrorMessage(error) };
  }
}

const videoCheckpointSchema = z.object({
  attemptId: z.string().min(1),
  exerciseId: z.string().min(1),
  position: z.number().finite().min(0),
});

export async function videoCheckpointAction(
  values: z.infer<typeof videoCheckpointSchema>
) {
  try {
    const parsed = videoCheckpointSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: "Position invalide." };
    }
    const user = await getUserContext();
    const { attemptId, exerciseId, position } = parsed.data;
    const data = await ProgressionPlayerService.recordVideoCheckpoint(
      user.id,
      attemptId,
      exerciseId,
      position
    );
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur videoCheckpointAction:", error);
    return { success: false, error: playErrorMessage(error) };
  }
}

export async function submitNodeCompletionAction(attemptId: string) {
  try {
    if (typeof attemptId !== "string" || !attemptId) {
      return { success: false, error: "Tentative invalide." };
    }
    const user = await getUserContext();
    const data = await ProgressionPlayerService.submitNodeCompletion(
      user.id,
      attemptId
    );
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur submitNodeCompletionAction:", error);
    return { success: false, error: playErrorMessage(error) };
  }
}

export async function getPlayerStatsAction() {
  try {
    const user = await getUserContext();
    const data = await ProgressionPlayerService.getPlayerStats(user.id);
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur getPlayerStatsAction:", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function getProgressionStatsAction() {
  try {
    const user = await getUserContext();
    const data = await ProgressionPlayerService.getProgressionStats(user.id);
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur getProgressionStatsAction:", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}
