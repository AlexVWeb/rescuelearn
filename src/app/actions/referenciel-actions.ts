"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFile } from "@/lib/r2";
import { getUserContext } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";

export type Referenciel = {
  id: number;
  title: string;
  yearEdition: number;
  pdfUrl: string;
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
    const referenciel = await prisma.referenciel.findUnique({
      where: { id },
    });
    if (referenciel) {
      const key = referenciel.pdfUrl.replace(
        `${process.env.R2_PUBLIC_URL}/`,
        ""
      );
      await deleteFile(key);
    }
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

    if (!title || !yearEdition || !file) {
      return { success: false, error: "Missing required fields" };
    }

    const pdfUrl = await saveFile(file, title, yearEdition);

    await prisma.referenciel.create({
      data: {
        title,
        yearEdition,
        pdfUrl,
      },
    });

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
