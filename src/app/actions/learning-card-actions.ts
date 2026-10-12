"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { archiveWhere, bulkContentSchema } from "@/lib/content-archive";
import type { CardFilters } from "@/lib/card-filters";

const learningCardSchema = z.object({
  theme: z.string().min(1, "Le thème est requis"),
  niveau: z.string().min(1, "Le niveau est requis"),
  info: z.string().min(1, "Les informations sont requises"),
  reference: z.string().min(1, "La référence est requise"),
  referencielId: z.number().nullable().optional(),
});

function adminCardsWhere(
  search: string,
  filters: Partial<CardFilters>
): Prisma.LearningCardWhereInput {
  return {
    ...archiveWhere(filters.archived ?? "active"),
    ...(filters.referencielId ? { referencielId: filters.referencielId } : {}),
    ...(filters.niveau ? { niveau: filters.niveau } : {}),
    ...(filters.usage === "progression" && {
      progressionExercises: { some: {} },
    }),
    ...(filters.usage === "library" && { progressionExercises: { none: {} } }),
    ...(filters.incomplete && { info: "" }),
    ...(search
      ? {
          OR: [
            { theme: { contains: search, mode: "insensitive" as const } },
            { info: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

// Plafond aligné sur bulkContentSchema
const MAX_BULK_IDS = 1000;

/** Identifiants de toutes les cartes filtrées, pour une sélection multi-pages. */
export async function getAdminLearningCardIdsAction(
  search: string = "",
  filters: Partial<CardFilters> = {}
) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const cards = await prisma.learningCard.findMany({
      where: adminCardsWhere(search, filters),
      select: { id: true },
      orderBy: { id: "desc" },
      take: MAX_BULK_IDS,
    });
    return { success: true, data: cards.map((c) => c.id) };
  } catch (error) {
    logger.error("Failed to fetch learning card ids:", error);
    return { success: false, error: "Impossible de récupérer les cartes." };
  }
}

export async function getAdminLearningCardsAction(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  filters: Partial<CardFilters> = {}
) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const skip = (page - 1) * limit;
  const where = adminCardsWhere(search, filters);

  try {
    const [cards, total] = await Promise.all([
      prisma.learningCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          referenciel: {
            select: {
              id: true,
              title: true,
              pdfUrl: true,
            },
          },
          _count: { select: { progressionExercises: true } },
        },
      }),
      prisma.learningCard.count({ where }),
    ]);

    return {
      success: true,
      data: cards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch admin learning cards:", error);
    return {
      success: false,
      error: "Impossible de récupérer les cartes d'apprentissage.",
    };
  }
}

export async function getPublicLearningCardsAction() {
  try {
    const cards = await prisma.learningCard.findMany({
      where: { archivedAt: null },
      orderBy: { theme: "asc" },
      include: {
        referenciel: {
          select: {
            pdfUrl: true,
          },
        },
      },
    });

    return {
      success: true,
      data: cards.map((card) => ({
        id: card.id,
        theme: card.theme,
        niveau: card.niveau,
        info: card.info,
        reference: card.reference,
        pdfUrl: card.referenciel?.pdfUrl || undefined,
      })),
    };
  } catch (error) {
    logger.error("Failed to fetch public learning cards:", error);
    return {
      success: false,
      error: "Impossible de récupérer les cartes d'apprentissage.",
    };
  }
}

export async function getPublicLearningCardsFiltersAction() {
  try {
    const cards = await prisma.learningCard.findMany({
      where: { archivedAt: null },
      select: {
        theme: true,
        niveau: true,
      },
    });

    const themes = Array.from(new Set(cards.map((c) => c.theme))).map(
      (theme) => ({ theme })
    );
    const niveaux = Array.from(new Set(cards.map((c) => c.niveau))).map(
      (niveau) => ({ niveau })
    );

    return {
      success: true,
      data: {
        themes,
        niveaux,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch public learning cards filters:", error);
    return { success: false, error: "Impossible de récupérer les filtres." };
  }
}

export async function createLearningCardAction(jsonData: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = learningCardSchema.safeParse(jsonData);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }

  try {
    const card = await prisma.learningCard.create({
      data: {
        theme: parsed.data.theme,
        niveau: parsed.data.niveau,
        info: parsed.data.info,
        reference: parsed.data.reference,
        referencielId: parsed.data.referencielId || null,
      },
    });

    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return { success: true, data: card };
  } catch (error) {
    logger.error("Failed to create learning card:", error);
    return {
      success: false,
      error: "Impossible de créer la carte d'apprentissage.",
    };
  }
}

export async function updateLearningCardAction(id: number, jsonData: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = learningCardSchema.safeParse(jsonData);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }

  try {
    const card = await prisma.learningCard.update({
      where: { id },
      data: {
        theme: parsed.data.theme,
        niveau: parsed.data.niveau,
        info: parsed.data.info,
        reference: parsed.data.reference,
        referencielId: parsed.data.referencielId || null,
      },
    });

    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return { success: true, data: card };
  } catch (error) {
    logger.error("Failed to update learning card:", error);
    return {
      success: false,
      error: "Impossible de mettre à jour la carte d'apprentissage.",
    };
  }
}

export async function deleteLearningCardAction(id: number) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  try {
    // Les étapes de leçon pointant sur cette carte deviendraient vides
    await prisma.$transaction([
      prisma.progressionNodeExercise.deleteMany({
        where: { learningCardId: id },
      }),
      prisma.learningCard.delete({ where: { id } }),
    ]);

    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete learning card:", error);
    return {
      success: false,
      error: "Impossible de supprimer la carte d'apprentissage.",
    };
  }
}

export async function bulkLearningCardsAction(input: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = bulkContentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }
  const { ids, action } = parsed.data;

  try {
    const where = { id: { in: ids } };
    let count: number;
    if (action === "delete") {
      // Les étapes de leçon pointant sur ces cartes deviendraient vides
      const [, deleted] = await prisma.$transaction([
        prisma.progressionNodeExercise.deleteMany({
          where: { learningCardId: { in: ids } },
        }),
        prisma.learningCard.deleteMany({ where }),
      ]);
      count = deleted.count;
    } else {
      ({ count } = await prisma.learningCard.updateMany({
        where,
        data: { archivedAt: action === "archive" ? new Date() : null },
      }));
    }

    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return { success: true, count };
  } catch (error) {
    logger.error("Failed to bulk update learning cards:", error);
    return {
      success: false,
      error: "Impossible de traiter les cartes d'apprentissage.",
    };
  }
}

const bulkUpdateLearningCardsSchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(MAX_BULK_IDS),
    // Seuls les champs présents sont modifiés ; null retire le référentiel
    referencielId: z.number().int().positive().nullable().optional(),
    niveau: z.string().trim().min(1).optional(),
    theme: z.string().trim().min(1).optional(),
  })
  .refine(
    (d) =>
      d.referencielId !== undefined ||
      d.niveau !== undefined ||
      d.theme !== undefined,
    "Aucun champ à modifier"
  );

export async function bulkUpdateLearningCardsAction(input: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = bulkUpdateLearningCardsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }
  const { ids, referencielId, niveau, theme } = parsed.data;

  try {
    const where = { id: { in: ids } };
    const [{ count }] = await prisma.$transaction([
      prisma.learningCard.updateMany({
        where,
        data: {
          ...(referencielId !== undefined && { referencielId }),
          ...(niveau !== undefined && { niveau }),
          ...(theme !== undefined && { theme }),
        },
      }),
      // Un sujet appartient à un référentiel : on détache ceux devenus incohérents
      ...(referencielId !== undefined
        ? [
            prisma.learningCard.updateMany({
              where: {
                ...where,
                topicId: { not: null },
                ...(referencielId !== null && {
                  topic: { referencielId: { not: referencielId } },
                }),
              },
              data: { topicId: null },
            }),
          ]
        : []),
    ]);

    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return { success: true, count };
  } catch (error) {
    logger.error("Failed to bulk edit learning cards:", error);
    return {
      success: false,
      error: "Impossible de modifier les cartes d'apprentissage.",
    };
  }
}

const bulkLearningCardsSchema = z.object({
  referencielId: z.number().nullable().optional(),
  cards: z.array(
    z.object({
      theme: z.string().min(1, "Le thème est requis"),
      niveau: z.string().min(1, "Le niveau est requis"),
      info: z.string().min(1, "Les informations sont requises"),
      reference: z.string().min(1, "La référence est requise"),
      topicId: z.string().optional().nullable(),
    })
  ),
});

export async function bulkCreateLearningCardsAction(jsonData: unknown) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = bulkLearningCardsSchema.safeParse(jsonData);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }

  try {
    const { referencielId, cards } = parsed.data;

    await prisma.$transaction(
      cards.map((c) =>
        prisma.learningCard.create({
          data: {
            theme: c.theme,
            niveau: c.niveau,
            info: c.info,
            reference: c.reference,
            referencielId: referencielId || null,
            topicId: c.topicId ?? null,
          },
        })
      )
    );

    revalidatePath("/admin/cards");
    revalidatePath("/learning");
    return { success: true, count: cards.length };
  } catch (error) {
    logger.error("Failed to bulk create learning cards:", error);
    return {
      success: false,
      error: "Impossible d'importer les cartes d'apprentissage.",
    };
  }
}
