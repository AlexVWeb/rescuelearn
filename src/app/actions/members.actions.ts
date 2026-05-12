"use server";

import { prisma, withOrganisme } from "@/lib/prisma";
import { UserRole, hasRole } from "@/lib/roles";
import { requireOrganisme, getUserContext } from "@/lib/context";
import { logger } from "@/lib/logger";

export async function getOrganismeMembersAction() {
  const user = await requireOrganisme();
  const tenant = withOrganisme(user.organismeId);

  try {
    const members = await tenant.user.findMany({
      where: { organismeId: user.organismeId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        roles: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const typedMembers = members.map((m) => ({
      ...m,
      roles: (Array.isArray(m.roles) ? m.roles : []) as UserRole[],
    }));

    return { success: true, data: typedMembers };
  } catch (error) {
    logger.error("Failed to fetch members:", error);
    return { success: false, error: "Failed to fetch members" };
  }
}

export async function updateMemberRoleAction(userId: string, roles: string[]) {
  const user = await requireOrganisme();

  if (
    !hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
    !hasRole(user.roles, UserRole.SUPER_ADMIN)
  ) {
    return { success: false, error: "Forbidden" };
  }

  const tenant = withOrganisme(user.organismeId);

  try {
    await tenant.user.update({
      where: { id: userId },
      data: { roles },
    });
    return { success: true };
  } catch (error) {
    logger.error("Failed to update member role:", error);
    return { success: false, error: "Failed to update member role" };
  }
}

export async function removeMemberFromOrganismeAction(userId: string) {
  const user = await requireOrganisme();

  if (
    !hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
    !hasRole(user.roles, UserRole.SUPER_ADMIN)
  ) {
    return { success: false, error: "Forbidden" };
  }

  const tenant = withOrganisme(user.organismeId);

  try {
    await tenant.user.update({
      where: { id: userId },
      data: { organismeId: null },
    });
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
