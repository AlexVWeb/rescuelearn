"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { uploadFile } from "@/lib/r2";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { filterReferencielLevels } from "@/lib/referenciel-levels";
import { startReferencielAnalysisAction } from "./referenciel-topic-actions";
import { BULK_CONTENT_ACTIONS } from "@/lib/content-archive";
import { z } from "zod";

export type Referenciel = {
  id: number;
  title: string;
  yearEdition: number;
  pdfUrl: string;
  levels: string[];
  analysisStatus: "NONE" | "PROCESSING" | "DONE" | "FAILED";
  analysisError: string | null;
  analysisDoneChapters: number;
  analysisTotalChapters: number;
  _count: { topics: number };
};

export async function getReferencielsAction(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const skip = (page - 1) * limit;

  const where = search
    ? {
        title: { contains: search, mode: "insensitive" as const },
      }
    : {};

  try {
    const [referenciels, total] = await Promise.all([
      prisma.referenciel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { yearEdition: "desc" },
        include: { _count: { select: { topics: true } } },
      }),
      prisma.referenciel.count({ where }),
    ]);

    const { getPresignedUrl } = await import("@/lib/r2");
    const referencielsWithUrls = await Promise.all(
      referenciels.map(async (ref) => {
        let url = ref.pdfUrl;
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, "");
          url = await getPresignedUrl(key);
        }
        return {
          ...ref,
          pdfUrl: url,
        };
      })
    );

    return {
      success: true,
      data: referencielsWithUrls,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch referenciels:", error);
    return { success: false, error: "Failed to fetch referenciels" };
  }
}

export async function getPresignedUrlAction(url: string): Promise<string> {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (r2PublicUrl && url.startsWith(r2PublicUrl)) {
      const key = url.replace(`${r2PublicUrl}/`, "");
      const { getPresignedUrl } = await import("@/lib/r2");
      return await getPresignedUrl(key);
    }
  }
  return url;
}

export async function deleteReferencielAction(id: number) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.referenciel.delete({
      where: { id },
    });
    revalidatePath("/admin/referenciels");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete referenciel:", error);
    return { success: false, error: "Failed to delete referenciel" };
  }
}

// Contenus pédagogiques rattachés à un référentiel : quiz liés, et cartes
// liées directement ou via un de ses sujets.
function referencielContentWhere(id: number) {
  return {
    quiz: { referencielId: id } satisfies Prisma.QuizWhereInput,
    card: {
      OR: [{ referencielId: id }, { topic: { referencielId: id } }],
    } satisfies Prisma.LearningCardWhereInput,
  };
}

export type ReferencielContentCounts = {
  quizzes: { active: number; archived: number };
  cards: { active: number; archived: number };
};

export async function getReferencielContentCountsAction(
  id: number
): Promise<
  | { success: true; data: ReferencielContentCounts }
  | { success: false; error: string }
> {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const where = referencielContentWhere(id);
  const archived = { archivedAt: { not: null } };
  try {
    const [quizActive, quizArchived, cardActive, cardArchived] =
      await Promise.all([
        prisma.quiz.count({ where: { ...where.quiz, archivedAt: null } }),
        prisma.quiz.count({ where: { ...where.quiz, ...archived } }),
        prisma.learningCard.count({
          where: { ...where.card, archivedAt: null },
        }),
        prisma.learningCard.count({ where: { ...where.card, ...archived } }),
      ]);
    return {
      success: true,
      data: {
        quizzes: { active: quizActive, archived: quizArchived },
        cards: { active: cardActive, archived: cardArchived },
      },
    };
  } catch (error) {
    logger.error("Failed to count referenciel content:", error);
    return { success: false, error: "Impossible de compter les contenus" };
  }
}

const referencielContentSchema = z.object({
  id: z.number().int().positive(),
  action: z.enum(BULK_CONTENT_ACTIONS),
  targets: z
    .array(z.enum(["quizzes", "cards"]))
    .min(1)
    .default(["quizzes", "cards"]),
});

/**
 * Archive, restaure ou supprime en masse les quiz et cartes d'un référentiel,
 * typiquement quand une nouvelle version le rend obsolète.
 */
export async function bulkReferencielContentAction(input: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = referencielContentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }
  const { id, action, targets } = parsed.data;
  const where = referencielContentWhere(id);
  const data = { archivedAt: action === "archive" ? new Date() : null };
  // N'écrase pas la date d'archivage des contenus déjà archivés
  const stateFilter =
    action === "archive"
      ? { archivedAt: null }
      : action === "restore"
        ? { archivedAt: { not: null } }
        : {};

  const withQuizzes = targets.includes("quizzes");
  const withCards = targets.includes("cards");
  const ops: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [];
  if (withQuizzes) {
    ops.push(
      action === "delete"
        ? prisma.quiz.deleteMany({ where: where.quiz })
        : prisma.quiz.updateMany({
            where: { ...where.quiz, ...stateFilter },
            data,
          })
    );
  }
  if (withCards) {
    ops.push(
      action === "delete"
        ? prisma.learningCard.deleteMany({ where: where.card })
        : prisma.learningCard.updateMany({
            where: { ...where.card, ...stateFilter },
            data,
          })
    );
  }

  try {
    const results = await prisma.$transaction(ops);
    const quizzes = withQuizzes ? results[0].count : 0;
    const cards = withCards ? results[withQuizzes ? 1 : 0].count : 0;

    revalidatePath("/admin/referenciels");
    revalidatePath("/admin/quiz/quizzes");
    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return {
      success: true,
      data: { quizzes, cards },
    };
  } catch (error) {
    logger.error("Failed to bulk update referenciel content:", error);
    return { success: false, error: "Impossible de traiter les contenus" };
  }
}

async function saveFile(
  file: File,
  title: string,
  year: number
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Slugify title
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const timestamp = Date.now();
  const extension = "pdf"; // Enforce PDF as per requirements
  const fileName = `${slug}_${year}_${timestamp}.${extension}`;

  const mode = process.env.APP_MODE || "dev";
  const key = `${mode}/referenciels/${fileName}`;

  return await uploadFile(key, buffer, "application/pdf", false);
}

export async function createReferencielAction(formData: FormData) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const title = formData.get("title") as string;
    const yearEdition = parseInt(formData.get("yearEdition") as string);
    const file = formData.get("file") as File;
    const levels = filterReferencielLevels(formData.getAll("levels"));

    if (!title || !yearEdition || !file) {
      return { success: false, error: "Missing required fields" };
    }

    const pdfUrl = await saveFile(file, title, yearEdition);

    const referenciel = await prisma.referenciel.create({
      data: {
        title,
        yearEdition,
        pdfUrl,
        levels,
      },
    });

    if (formData.get("analyze") === "on") {
      const analysis = await startReferencielAnalysisAction(referenciel.id);
      if (!analysis.success) {
        logger.error("Failed to start referenciel analysis:", analysis.error);
      }
    }

    revalidatePath("/admin/referenciels");
    return { success: true };
  } catch (error) {
    logger.error("Failed to create referenciel:", error);
    return { success: false, error: "Failed to create referenciel" };
  }
}

export async function updateReferencielAction(id: number, formData: FormData) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const title = formData.get("title") as string;
    const yearEdition = parseInt(formData.get("yearEdition") as string);
    const file = formData.get("file") as File | null;

    const data: Prisma.ReferencielUpdateInput = {
      title,
      yearEdition,
      levels: filterReferencielLevels(formData.getAll("levels")),
    };

    if (file && file.size > 0) {
      const pdfUrl = await saveFile(file, title, yearEdition);
      data.pdfUrl = pdfUrl;
    }

    await prisma.referenciel.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/referenciels");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update referenciel:", error);
    return { success: false, error: "Failed to update referenciel" };
  }
}
