"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";

export type Organisme = {
  id: string;
  name: string;
  agreementNumber: string | null;
  logo: string | null;
  inviteCode: string;
  siret: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganismeMember = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  roles: unknown;
  createdAt: Date;
};

export async function getOrganismesAction(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          {
            agreementNumber: { contains: search, mode: "insensitive" as const },
          },
        ],
      }
    : {};

  try {
    const [organismes, total] = await Promise.all([
      prisma.organisme.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.organisme.count({ where }),
    ]);

    return {
      success: true,
      data: organismes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Failed to fetch organismes:", error);
    return { success: false, error: "Failed to fetch organismes" };
  }
}

export async function getOrganismeByIdAction(id: string) {
  try {
    const organisme = await prisma.organisme.findUnique({ where: { id } });
    if (!organisme) return { success: false, error: "Organisme introuvable" };
    return { success: true, data: organisme };
  } catch (error) {
    console.error("Failed to fetch organisme:", error);
    return { success: false, error: "Failed to fetch organisme" };
  }
}

export async function createOrganismeAction(data: OrganismeFormValues) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const organisme = await prisma.organisme.create({
      data: {
        name: data.name,
        siret: data.siret || null,
        agreementNumber: data.agreementNumber || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        postalCode: data.postalCode || null,
        city: data.city || null,
      },
    });
    revalidatePath("/admin/organismes");
    return { success: true, data: organisme };
  } catch (error) {
    console.error("Failed to create organisme:", error);
    return { success: false, error: "Failed to create organisme" };
  }
}

export async function getMyOrganismeAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organismeId: true, roles: true },
  });

  const roles = Array.isArray(user?.roles) ? (user.roles as string[]) : [];
  if (!roles.includes("ADMIN_ORGANISME")) {
    return { success: false, error: "Forbidden" };
  }

  if (!user?.organismeId) {
    return { success: false, error: "Aucun organisme associé à votre compte" };
  }

  try {
    const organisme = await prisma.organisme.findUnique({
      where: { id: user.organismeId },
    });
    if (!organisme) return { success: false, error: "Organisme introuvable" };
    return { success: true, data: organisme };
  } catch (error) {
    console.error("Failed to fetch my organisme:", error);
    return { success: false, error: "Failed to fetch organisme" };
  }
}

export async function updateOrganismeAction(
  id: string,
  data: OrganismeFormValues
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organismeId: true, roles: true },
  });

  const roles = Array.isArray(user?.roles) ? (user.roles as string[]) : [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  if (!isSuperAdmin && user?.organismeId !== id) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.organisme.update({
      where: { id },
      data: {
        name: data.name,
        siret: data.siret || null,
        agreementNumber: data.agreementNumber || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        postalCode: data.postalCode || null,
        city: data.city || null,
      },
    });
    revalidatePath("/admin/organismes");
    revalidatePath(`/admin/organismes/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update organisme:", error);
    return { success: false, error: "Failed to update organisme" };
  }
}

export async function deleteOrganismeAction(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.organisme.delete({
      where: { id },
    });
    revalidatePath("/admin/organismes");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete organisme:", error);
    return { success: false, error: "Failed to delete organisme" };
  }
}

export async function getOrganismeMembersAction(organismeId: string) {
  try {
    const members = await prisma.user.findMany({
      where: { organismeId },
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
    return { success: true, data: members };
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return { success: false, error: "Failed to fetch members" };
  }
}

export async function updateMemberRoleAction(userId: string, roles: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { roles },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { success: false, error: "Failed to update member role" };
  }
}

export async function removeMemberFromOrganismeAction(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { organismeId: null },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}

export async function addMemberToOrganismeAction(
  userId: string,
  organismeId: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { organismeId },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to add member:", error);
    return { success: false, error: "Failed to add member" };
  }
}

export async function searchUsersAction(query: string) {
  try {
    const users = await prisma.user.findMany({
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
    return { success: false, error: "Failed to search users" };
  }
}
