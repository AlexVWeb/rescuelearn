"use server";

import { getUserContext } from "@/lib/context";
import { logger } from "@/lib/logger";
import { ProgressionPlayerService } from "@/services/progression.service";

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

export async function submitNodeCompletionAction(
  nodeId: string,
  score: number
) {
  try {
    const user = await getUserContext();
    const data = await ProgressionPlayerService.submitNodeCompletion(
      user.id,
      nodeId,
      score
    );
    return { success: true, data };
  } catch (error) {
    logger.error("Erreur submitNodeCompletionAction:", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}
