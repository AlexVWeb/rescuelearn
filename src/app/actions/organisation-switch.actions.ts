"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * Récupère les organisations disponibles pour l'utilisateur courant.
 */
export async function getAvailableOrganizations() {
  try {
    const user = await getUserContext();

    const members = await prisma.member.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: { id: true, name: true, logo: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        logo: m.organization.logo,
        role: m.role,
      })),
      currentOrganizationId: user.organismeId,
    };
  } catch (error) {
    logger.error("Failed to fetch available organizations:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des organisations",
    };
  }
}

/**
 * Change l'organisation active de l'utilisateur.
 */
export async function switchOrganization(organizationId: string) {
  try {
    const user = await getUserContext();

    // Vérifier que l'utilisateur est membre de cette organisation
    const membership = await prisma.member.findFirst({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "Vous n'êtes pas membre de cette organisation",
      };
    }

    // Mettre à jour l'organisation active de l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: { organismeId: organizationId },
    });

    // Invalider les caches pour la nouvelle organisation
    revalidatePath("/");
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    logger.error("Failed to switch organization:", error);
    return {
      success: false,
      error: "Erreur lors du changement d'organisation",
    };
  }
}
