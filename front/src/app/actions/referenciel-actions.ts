"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

    return {
      success: true,
      data: referenciels,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Failed to fetch referenciels:", error);
    return { success: false, error: "Failed to fetch referenciels" };
  }
}

export async function deleteReferencielAction(id: number) {
  try {
    await prisma.referenciel.delete({
      where: { id },
    });
    revalidatePath("/admin/referenciels");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete referenciel:", error);
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

  // Ensure directory exists
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "referenciels"
  );
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  return `uploads/referenciels/${fileName}`;
}

export async function createReferencielAction(formData: FormData) {
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
    console.error("Failed to create referenciel:", error);
    return { success: false, error: "Failed to create referenciel" };
  }
}

export async function updateReferencielAction(id: number, formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const yearEdition = parseInt(formData.get("yearEdition") as string);
    const file = formData.get("file") as File | null;

    const data: any = {
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
    console.error("Failed to update referenciel:", error);
    return { success: false, error: "Failed to update referenciel" };
  }
}
