"use server";

import { prisma, withOrganisme } from "@/lib/prisma";
import { UserRole, hasRole } from "@/lib/roles";
import { requireOrganisme, getUserContext } from "@/lib/context";
import { logger } from "@/lib/logger";

export async function getOrganismeMembersAction(organismeId?: string) {
  try {
    const user = await getUserContext();
    const targetOrganismeId = organismeId || user.organismeId;

    if (!targetOrganismeId) {
      return { success: false, error: "Aucun organisme associé" };
    }

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
    if (!isSuperAdmin && user.organismeId !== targetOrganismeId) {
      return { success: false, error: "Forbidden" };
    }

    const memberships = await prisma.member.findMany({
      where: { organizationId: targetOrganismeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const typedMembers = memberships
      .filter((m) => m.user !== null)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.name,
        firstName: m.user!.firstName,
        lastName: m.user!.lastName,
        email: m.user!.email,
        roles: (Array.isArray(m.user!.roles)
          ? m.user!.roles
          : []) as UserRole[],
        createdAt: m.createdAt,
      }));

    return { success: true, data: typedMembers };
  } catch (error) {
    logger.error("Failed to fetch members:", error);
    return { success: false, error: "Failed to fetch members" };
  }
}

export async function updateMemberRoleAction(
  userId: string,
  roles: string[],
  organismeId?: string
) {
  try {
    const user = await getUserContext();
    const targetOrganismeId = organismeId || user.organismeId;

    if (!targetOrganismeId) {
      return { success: false, error: "Aucun organisme associé" };
    }

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
    const isOrgAdmin =
      hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
      user.organismeId === targetOrganismeId;

    if (!isSuperAdmin && !isOrgAdmin) {
      return { success: false, error: "Forbidden" };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    let newRoles = [...roles];
    if (targetUser && hasRole(targetUser.roles, UserRole.SUPER_ADMIN)) {
      if (!newRoles.includes(UserRole.SUPER_ADMIN)) {
        newRoles.push(UserRole.SUPER_ADMIN);
      }
    }

    const client = isSuperAdmin ? prisma : withOrganisme(targetOrganismeId);

    await client.user.update({
      where: { id: userId },
      data: { roles: newRoles },
    });

    const memberRole = roles.includes(UserRole.ADMIN_ORGANISME)
      ? "admin"
      : "member";

    await prisma.member.updateMany({
      where: {
        userId,
        organizationId: targetOrganismeId,
      },
      data: {
        role: memberRole,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to update member role:", error);
    return { success: false, error: "Failed to update member role" };
  }
}

export async function removeMemberFromOrganismeAction(
  userId: string,
  organismeId?: string
) {
  try {
    const user = await getUserContext();
    const targetOrganismeId = organismeId || user.organismeId;

    if (!targetOrganismeId) {
      return { success: false, error: "Aucun organisme associé" };
    }

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
    const isOrgAdmin =
      hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
      user.organismeId === targetOrganismeId;

    if (!isSuperAdmin && !isOrgAdmin) {
      return { success: false, error: "Forbidden" };
    }

    await prisma.member.deleteMany({
      where: {
        userId,
        organizationId: targetOrganismeId,
      },
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organismeId: true },
    });

    if (targetUser && targetUser.organismeId === targetOrganismeId) {
      const client = isSuperAdmin ? prisma : withOrganisme(targetOrganismeId);
      await client.user.update({
        where: { id: userId },
        data: { organismeId: null },
      });
    }

    return { success: true };
  } catch (error) {
    logger.error("Failed to remove member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}

export async function addMemberToOrganismeAction(
  userId: string,
  organismeId: string
) {
  const user = await getUserContext();
  const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

  if (!isSuperAdmin) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { organismeId },
    });
    return { success: true };
  } catch (error) {
    logger.error("Failed to add member:", error);
    return { success: false, error: "Failed to add member" };
  }
}

export async function searchUsersAction(query: string) {
  try {
    const user = await getUserContext();
    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    const client = isSuperAdmin ? prisma : withOrganisme(user.organismeId!);

    const users = await client.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        organismeId: true,
      },
      take: 10,
    });
    return { success: true, data: users };
  } catch (error) {
    logger.error("Failed to search users:", error);
    return { success: false, error: "Failed to search users" };
  }
}
