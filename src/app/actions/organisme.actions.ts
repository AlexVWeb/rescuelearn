"use server";
import { logger } from "@/lib/logger";

import { prisma, withOrganisme } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";
import { UserRole, hasRole } from "@/lib/roles";
import { requireOrganisme, getUserContext } from "@/lib/context";
import { Organisme } from "@/types/organisme";

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
      data: organismes as Organisme[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch organismes:", error);
    return { success: false, error: "Failed to fetch organismes" };
  }
}

export async function getOrganismeByIdAction(id: string) {
  try {
    const user = await getUserContext();
    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    const client = isSuperAdmin ? prisma : withOrganisme(user.organismeId!);

    const organisme = await client.organisme.findUnique({ where: { id } });
    if (!organisme) return { success: false, error: "Organisme introuvable" };
    return { success: true, data: organisme as Organisme };
  } catch (error) {
    logger.error("Failed to fetch organisme:", error);
    return { success: false, error: "Failed to fetch organisme" };
  }
}

export async function createOrganismeAction(data: OrganismeFormValues) {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const organisme = await prisma.organisme.create({
      data: {
        name: data.name,
        slug: data.name
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        siret: data.siret || null,
        agreementNumber: data.agreementNumber || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        postalCode: data.postalCode || null,
        city: data.city || null,
        legalRepFirstName: data.legalRepFirstName || null,
        legalRepLastName: data.legalRepLastName || null,
        legalRepJobTitle: data.legalRepJobTitle || null,
        legalStatus: data.legalStatus || null,
        tvaNumber: data.tvaNumber || null,
        federationName: data.federationName || null,
        isQualiopi: data.isQualiopi,
        qualiopiCertifiedBy: data.qualiopiCertifiedBy || null,
        retentionYearsActive: data.retentionYearsActive,
        retentionYearsArchive: data.retentionYearsArchive,
        smtpHost: data.smtpHost || null,
        smtpPort: data.smtpPort || null,
        smtpUser: data.smtpUser || null,
        smtpPassword: data.smtpPassword || null,
        smtpFrom: data.smtpFrom || null,
        smtpSecure: data.smtpSecure,
      },
    });
    revalidatePath("/admin/organismes");
    return { success: true, data: organisme as Organisme };
  } catch (error) {
    logger.error("Failed to create organisme:", error);
    return { success: false, error: "Failed to create organisme" };
  }
}

export async function getMyOrganismeAction() {
  try {
    const user = await requireOrganisme();
    const tenant = withOrganisme(user.organismeId);

    if (!hasRole(user.roles, UserRole.ADMIN_ORGANISME)) {
      return { success: false, error: "Forbidden" };
    }

    const organisme = await tenant.organisme.findUnique({
      where: { id: user.organismeId },
    });
    if (!organisme) return { success: false, error: "Organisme introuvable" };
    return { success: true, data: organisme as Organisme };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Non autorisé")
        return { success: false, error: "Unauthorized" };
      if (error.message === "Aucun organisme associé")
        return {
          success: false,
          error: "Aucun organisme associé à votre compte",
        };
    }
    logger.error("Failed to fetch my organisme:", error);
    return { success: false, error: "Failed to fetch organisme" };
  }
}

export async function updateOrganismeAction(
  id: string,
  data: OrganismeFormValues
) {
  const user = await getUserContext();
  const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

  const client = isSuperAdmin ? prisma : withOrganisme(user.organismeId!);

  if (!isSuperAdmin && user.organismeId !== id) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await client.organisme.update({
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
        legalRepFirstName: data.legalRepFirstName || null,
        legalRepLastName: data.legalRepLastName || null,
        legalRepJobTitle: data.legalRepJobTitle || null,
        legalStatus: data.legalStatus || null,
        tvaNumber: data.tvaNumber || null,
        federationName: data.federationName || null,
        isQualiopi: data.isQualiopi,
        qualiopiCertifiedBy: data.qualiopiCertifiedBy || null,
        retentionYearsActive: data.retentionYearsActive,
        retentionYearsArchive: data.retentionYearsArchive,
        smtpHost: data.smtpHost || null,
        smtpPort: data.smtpPort || null,
        smtpUser: data.smtpUser || null,
        smtpPassword: data.smtpPassword || null,
        smtpFrom: data.smtpFrom || null,
        smtpSecure: data.smtpSecure,
      },
    });
    revalidatePath("/admin/organismes");
    revalidatePath(`/admin/organismes/${id}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to update organisme:", error);
    return { success: false, error: "Failed to update organisme" };
  }
}

export async function deleteOrganismeAction(id: string) {
  const user = await getUserContext();
  const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

  if (!isSuperAdmin) {
    return { success: false, error: "Forbidden" };
  }

  try {
    await prisma.organisme.delete({
      where: { id },
    });
    revalidatePath("/admin/organismes");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete organisme:", error);
    return { success: false, error: "Failed to delete organisme" };
  }
}
