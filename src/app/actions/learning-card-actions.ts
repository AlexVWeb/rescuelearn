"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { z } from "zod";

const learningCardSchema = z.object({
  theme: z.string().min(1, "Le thème est requis"),
  niveau: z.string().min(1, "Le niveau est requis"),
  info: z.string().min(1, "Les informations sont requises"),
  reference: z.string().min(1, "La référence est requise"),
  referencielId: z.number().nullable().optional(),
});

export async function getAdminLearningCardsAction(
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
        OR: [
          { theme: { contains: search, mode: "insensitive" as const } },
          { info: { contains: search, mode: "insensitive" as const } },
          { reference: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

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
    await prisma.learningCard.delete({
      where: { id },
    });

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

const bulkLearningCardsSchema = z.object({
  referencielId: z.number().nullable().optional(),
  cards: z.array(
    z.object({
      theme: z.string().min(1, "Le thème est requis"),
      niveau: z.string().min(1, "Le niveau est requis"),
      info: z.string().min(1, "Les informations sont requises"),
      reference: z.string().min(1, "La référence est requise"),
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
