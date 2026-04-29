"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";

export async function createExternalTraining(data: {
  traineeId: string;
  type: string;
  name: string;
  organisme: string;
  obtainedAt: Date;
  isFC?: boolean;
  certificateNumber?: string;
  fileUrl?: string;
  fileKey?: string;
}) {
  const user = await requireOrganisme();

  const trainee = await prisma.trainee.findUnique({
    where: { id: data.traineeId },
  });
  if (!trainee || trainee.organismeId !== user.organismeId) {
    throw new Error("Stagiaire introuvable ou non autorisé");
  }

  return prisma.externalTraining.create({
    data: { ...data, organismeId: user.organismeId },
  });
}

export async function deleteExternalTraining(id: string) {
  const user = await requireOrganisme();

  const record = await prisma.externalTraining.findUnique({ where: { id } });
  if (!record || record.organismeId !== user.organismeId) {
    throw new Error("Formation introuvable ou non autorisée");
  }

  const deleted = await prisma.externalTraining.delete({ where: { id } });

  if (record.fileKey) {
    const { deleteFile } = await import("@/lib/r2");
    await deleteFile(record.fileKey);
  }

  return deleted;
}

export async function uploadExternalTrainingFile(formData: FormData) {
  const user = await requireOrganisme();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Aucun fichier fourni");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const { uploadFile, getStorageKey } = await import("@/lib/r2");
  const key = getStorageKey(
    user.organismeId,
    "external-trainings",
    `${Date.now()}-${file.name}`
  );
  await uploadFile(key, buffer, file.type);
  return { key };
}
