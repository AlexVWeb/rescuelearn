"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";

async function checkInitialTrainingExists(
  traineeId: string,
  type: string,
  excludeExternalId?: string
): Promise<boolean> {
  // Check internal platform valid non-FC trainings
  const platformInitial = await prisma.inscription.findFirst({
    where: {
      traineeId,
      status: "présent",
      trainingSession: {
        type,
        isFC: false,
      },
    },
  });

  if (platformInitial) return true;

  // Check external non-FC trainings
  const externalInitial = await prisma.externalTraining.findFirst({
    where: {
      traineeId,
      type,
      isFC: false,
      ...(excludeExternalId ? { id: { not: excludeExternalId } } : {}),
    },
  });

  return !!externalInitial;
}

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

  if (data.isFC) {
    const hasInitial = await checkInitialTrainingExists(
      data.traineeId,
      data.type
    );
    if (!hasInitial) {
      throw new Error(
        `Impossible d'ajouter une Formation Continue (FC) pour la filière ${data.type} : aucune formation initiale préalable n'est enregistrée.`
      );
    }
  }

  return prisma.externalTraining.create({
    data: { ...data, organismeId: user.organismeId },
  });
}

export async function updateExternalTraining(
  id: string,
  data: {
    type: string;
    name: string;
    organisme: string;
    obtainedAt: Date;
    isFC?: boolean;
    certificateNumber?: string;
    fileUrl?: string | null;
    fileKey?: string | null;
  }
) {
  const user = await requireOrganisme();

  const record = await prisma.externalTraining.findUnique({ where: { id } });
  if (!record || record.organismeId !== user.organismeId) {
    throw new Error("Formation introuvable ou non autorisée");
  }

  if (data.isFC) {
    const hasInitial = await checkInitialTrainingExists(
      record.traineeId,
      data.type,
      id
    );
    if (!hasInitial) {
      throw new Error(
        `Impossible d'ajouter une Formation Continue (FC) pour la filière ${data.type} : aucune formation initiale préalable n'est enregistrée.`
      );
    }
  }

  // Handle old file cleanup if fileKey has changed or removed
  if (record.fileKey && record.fileKey !== data.fileKey) {
    const { deleteFile } = await import("@/lib/r2");
    await deleteFile(record.fileKey);
  }

  return prisma.externalTraining.update({
    where: { id },
    data: {
      type: data.type,
      name: data.name,
      organisme: data.organisme,
      obtainedAt: data.obtainedAt,
      isFC: data.isFC ?? false,
      certificateNumber: data.certificateNumber || null,
      fileUrl: data.fileUrl ?? null,
      fileKey: data.fileKey ?? null,
    },
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
  await uploadFile(key, buffer, file.type, true);
  return { key };
}
