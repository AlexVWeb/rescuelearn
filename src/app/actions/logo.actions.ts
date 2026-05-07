"use server";
import { logger } from "@/lib/logger";

import { prisma, withOrganisme } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UserRole, hasRole } from "@/lib/roles";
import {
  uploadFile,
  deleteFile,
  getPresignedUrl,
  getStorageKey,
} from "@/lib/r2";
import { getUserContext } from "@/lib/context";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function uploadOrganismeLogoAction(
  id: string,
  formData: FormData
) {
  try {
    const user = await getUserContext();
    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    if (!isSuperAdmin && user.organismeId !== id) {
      return { success: false, error: "Forbidden" };
    }

    const client = isSuperAdmin ? prisma : withOrganisme(user.organismeId!);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "Fichier manquant" };
    }

    const ext = ALLOWED_MIME_TYPES[file.type];
    if (!ext) {
      return {
        success: false,
        error: "Format non supporté. Utilisez PNG, JPG, SVG ou WebP.",
      };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, error: "Fichier trop volumineux (max 2 Mo)." };
    }

    const organisme = await client.organisme.findUnique({
      where: { id },
      select: { logo: true },
    });
    if (!organisme) {
      return { success: false, error: "Organisme introuvable" };
    }
    if (organisme.logo) {
      await deleteFile(organisme.logo);
    }

    const key = getStorageKey(id, "logo", `logo.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(key, buffer, file.type);

    await client.organisme.update({
      where: { id },
      data: { logo: key },
    });

    revalidatePath(`/admin/organismes/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Non autorisé") {
      return { success: false, error: "Unauthorized" };
    }
    logger.error("Failed to upload logo:", error);
    return { success: false, error: "Erreur lors de l'upload" };
  }
}

export async function deleteOrganismeLogoAction(id: string) {
  try {
    const user = await getUserContext();
    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    if (!isSuperAdmin && user.organismeId !== id) {
      return { success: false, error: "Forbidden" };
    }

    const client = isSuperAdmin ? prisma : withOrganisme(user.organismeId!);

    const organisme = await client.organisme.findUnique({
      where: { id },
      select: { logo: true },
    });
    if (!organisme) {
      return { success: false, error: "Organisme introuvable" };
    }

    if (organisme.logo) {
      await deleteFile(organisme.logo);
    }

    await client.organisme.update({
      where: { id },
      data: { logo: null },
    });

    revalidatePath(`/admin/organismes/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "Non autorisé") {
      return { success: false, error: "Unauthorized" };
    }
    logger.error("Failed to delete logo:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

export async function getOrganismeLogoUrlAction(
  id: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const user = await getUserContext();
    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    const client = isSuperAdmin ? prisma : withOrganisme(user.organismeId!);

    const organisme = await client.organisme.findUnique({
      where: { id },
      select: { logo: true },
    });
    if (!organisme?.logo) {
      return { success: false, error: "Aucun logo" };
    }
    const url = await getPresignedUrl(organisme.logo);
    return { success: true, url };
  } catch (error) {
    if (error instanceof Error && error.message === "Non autorisé") {
      return { success: false, error: "Unauthorized" };
    }
    logger.error("Failed to get logo URL:", error);
    return { success: false, error: "Erreur lors de la récupération du logo" };
  }
}
