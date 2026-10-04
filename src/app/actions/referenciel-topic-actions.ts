"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { filterReferencielLevels } from "@/lib/referenciel-levels";
import { runReferencielAnalysis } from "@/services/referenciel-analysis.service";

// Au-delà, une analyse PROCESSING est considérée comme interrompue
const STALE_ANALYSIS_MS = 20 * 60 * 1000;

function isStale(status: string, startedAt: Date | null) {
  return (
    status === "PROCESSING" &&
    (!startedAt || Date.now() - startedAt.getTime() > STALE_ANALYSIS_MS)
  );
}

async function isSuperAdmin() {
  const user = await getUserContext();
  return hasRole(user.roles, UserRole.SUPER_ADMIN);
}

function revalidateReferenciel(referencielId: number) {
  revalidatePath("/admin/referenciels");
  revalidatePath(`/admin/referenciels/${referencielId}/sujets`);
}

export async function startReferencielAnalysisAction(referencielId: number) {
  if (!(await isSuperAdmin())) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
      select: { id: true, analysisStatus: true, analysisStartedAt: true },
    });
    if (!referenciel) {
      return { success: false, error: "Référentiel introuvable" };
    }
    if (
      referenciel.analysisStatus === "PROCESSING" &&
      !isStale(referenciel.analysisStatus, referenciel.analysisStartedAt)
    ) {
      return { success: false, error: "Analyse déjà en cours" };
    }

    await prisma.referenciel.update({
      where: { id: referencielId },
      data: {
        analysisStatus: "PROCESSING",
        analysisStartedAt: new Date(),
        analysisError: null,
        analysisDoneChapters: 0,
        analysisTotalChapters: 0,
      },
    });

    after(() =>
      runReferencielAnalysis(referencielId).catch(async (error) => {
        logger.error(`Referenciel ${referencielId} analysis failed:`, error);
        await prisma.referenciel.update({
          where: { id: referencielId },
          data: {
            analysisStatus: "FAILED",
            analysisError:
              error instanceof Error ? error.message : "Erreur inconnue",
          },
        });
      })
    );

    revalidateReferenciel(referencielId);
    return { success: true };
  } catch (error) {
    logger.error("Failed to start referenciel analysis:", error);
    return { success: false, error: "Impossible de lancer l'analyse" };
  }
}

export async function getReferencielAnalysisAction(referencielId: number) {
  if (!(await isSuperAdmin())) {
    return { success: false as const, error: "Forbidden" };
  }

  try {
    const referenciel = await prisma.referenciel.findUnique({
      where: { id: referencielId },
      select: {
        id: true,
        title: true,
        yearEdition: true,
        levels: true,
        analysisStatus: true,
        analysisStartedAt: true,
        analyzedAt: true,
        analysisError: true,
        analysisDoneChapters: true,
        analysisTotalChapters: true,
      },
    });
    if (!referenciel) {
      return { success: false as const, error: "Référentiel introuvable" };
    }

    const topics = await prisma.referencielTopic.findMany({
      where: { referencielId },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            questions: true,
            progressionNodes: true,
            learningCards: true,
          },
        },
      },
    });

    const stale = isStale(
      referenciel.analysisStatus,
      referenciel.analysisStartedAt
    );

    return {
      success: true as const,
      data: {
        referenciel: {
          ...referenciel,
          analysisStatus: stale ? "FAILED" : referenciel.analysisStatus,
          analysisError: stale
            ? "Analyse interrompue"
            : referenciel.analysisError,
        },
        topics,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch referenciel analysis:", error);
    return { success: false as const, error: "Failed to fetch analysis" };
  }
}

const updateTopicSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim(),
  keyPoints: z.array(z.string().trim().min(1)),
  levels: z.array(z.string()),
  questionCapacity: z.number().int().min(1).max(30),
});

export async function updateReferencielTopicAction(
  topicId: string,
  data: unknown
) {
  if (!(await isSuperAdmin())) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = updateTopicSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  try {
    const topic = await prisma.referencielTopic.update({
      where: { id: topicId },
      data: {
        ...parsed.data,
        levels: filterReferencielLevels(parsed.data.levels),
        validated: true,
      },
    });
    revalidateReferenciel(topic.referencielId);
    return { success: true, data: topic };
  } catch (error) {
    logger.error("Failed to update referenciel topic:", error);
    return { success: false, error: "Failed to update topic" };
  }
}

export async function setTopicValidatedAction(
  topicId: string,
  validated: boolean
) {
  if (!(await isSuperAdmin())) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const topic = await prisma.referencielTopic.update({
      where: { id: topicId },
      data: { validated },
    });
    revalidateReferenciel(topic.referencielId);
    return { success: true };
  } catch (error) {
    logger.error("Failed to set topic validation:", error);
    return { success: false, error: "Failed to update topic" };
  }
}

export async function deleteReferencielTopicAction(topicId: string) {
  if (!(await isSuperAdmin())) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const topic = await prisma.referencielTopic.delete({
      where: { id: topicId },
    });
    revalidateReferenciel(topic.referencielId);
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete referenciel topic:", error);
    return { success: false, error: "Failed to delete topic" };
  }
}

export type ReferencielAnalysis = Extract<
  Awaited<ReturnType<typeof getReferencielAnalysisAction>>,
  { success: true }
>["data"];
export type ReferencielTopicWithCoverage =
  ReferencielAnalysis["topics"][number];
