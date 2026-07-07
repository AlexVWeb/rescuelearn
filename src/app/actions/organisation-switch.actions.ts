"use server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { UserRole, hasRole } from "@/lib/roles";

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

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
    let currentOrganizationId = user.organismeId;

    // Si aucun organisme n'est actif, que l'utilisateur n'est pas super admin, et qu'il y a un unique organisme disponible, le sélectionner par défaut
    if (!currentOrganizationId && !isSuperAdmin && members.length === 1) {
      const defaultOrgId = members[0].organization.id;

      const rawRole = members[0].role;
      let targetRole: string = UserRole.FORMATEUR;
      if (rawRole === "admin" || rawRole === UserRole.ADMIN_ORGANISME) {
        targetRole = UserRole.ADMIN_ORGANISME;
      } else if (rawRole === "member" || rawRole === UserRole.FORMATEUR) {
        targetRole = UserRole.FORMATEUR;
      }

      const newRoles = [targetRole];
      if (isSuperAdmin && !newRoles.includes(UserRole.SUPER_ADMIN)) {
        newRoles.push(UserRole.SUPER_ADMIN);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          organismeId: defaultOrgId,
          roles: newRoles,
        },
      });

      currentOrganizationId = defaultOrgId;

      revalidatePath("/");
      revalidatePath("/admin");
    }

    return {
      success: true,
      data: members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        logo: m.organization.logo,
        role: m.role,
      })),
      currentOrganizationId,
      isSuperAdmin,
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
export async function switchOrganization(organizationId: string | null) {
  try {
    const user = await getUserContext();
    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    if (organizationId === null) {
      if (!isSuperAdmin) {
        return {
          success: false,
          error: "Action non autorisée",
        };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          organismeId: null,
          roles: [UserRole.SUPER_ADMIN],
        },
      });

      revalidatePath("/");
      revalidatePath("/admin");

      return { success: true };
    }

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

    const rawRole = membership.role;
    let targetRole: string = UserRole.FORMATEUR;
    if (rawRole === "admin" || rawRole === UserRole.ADMIN_ORGANISME) {
      targetRole = UserRole.ADMIN_ORGANISME;
    } else if (rawRole === "member" || rawRole === UserRole.FORMATEUR) {
      targetRole = UserRole.FORMATEUR;
    }

    const newRoles = [targetRole];
    if (isSuperAdmin && !newRoles.includes(UserRole.SUPER_ADMIN)) {
      newRoles.push(UserRole.SUPER_ADMIN);
    }

    // Mettre à jour l'organisation active et les rôles de l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        organismeId: organizationId,
        roles: newRoles,
      },
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
