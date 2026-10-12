"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
// Certificats acceptés, identifiés par leur signature binaire et non par le
// type MIME déclaré par le navigateur (falsifiable).
const CERTIFICATE_TYPES = [
  {
    mime: "application/pdf",
    ext: "pdf",
    magic: [0x25, 0x50, 0x44, 0x46, 0x2d],
  },
  { mime: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
] as const;
const MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024;

function detectCertificateType(buffer: Buffer) {
  return CERTIFICATE_TYPES.find((t) =>
    t.magic.every((byte, i) => buffer[i] === byte)
  );
}

async function externalTrainingsPrefix(organismeId: string) {
  const { getStorageKey } = await import("@/lib/r2");
  return getStorageKey(organismeId, "external-trainings", "");
}

/**
 * Une clé de fichier venant du client doit désigner un fichier de son propre
 * organisme : sinon la suppression de la formation effacerait n'importe quel
 * objet du bucket (référentiel, certificat d'un autre organisme...).
 */
async function isOwnFileKey(key: string, organismeId: string) {
  const prefix = await externalTrainingsPrefix(organismeId);
  const name = key.slice(prefix.length);
  return (
    key.startsWith(prefix) &&
    name.length > 0 &&
    !name.includes("/") &&
    !name.includes("..")
  );
}

async function assertOwnFileKey(key: string, organismeId: string) {
  if (!(await isOwnFileKey(key, organismeId))) {
    throw new Error("Fichier non autorisé");
  }
}

async function deleteOwnFile(key: string, organismeId: string) {
  // Ignore les clés enregistrées avant validation qui sortiraient du dossier
  if (!(await isOwnFileKey(key, organismeId))) return;
  const { deleteFile } = await import("@/lib/r2");
  await deleteFile(key);
}

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

  if (data.fileKey) await assertOwnFileKey(data.fileKey, user.organismeId);

  return prisma.externalTraining.create({
    data: {
      traineeId: data.traineeId,
      type: data.type,
      name: data.name,
      organisme: data.organisme,
      obtainedAt: data.obtainedAt,
      isFC: data.isFC ?? false,
      certificateNumber: data.certificateNumber || null,
      fileKey: data.fileKey ?? null,
      organismeId: user.organismeId,
    },
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

  if (data.fileKey && data.fileKey !== record.fileKey) {
    await assertOwnFileKey(data.fileKey, user.organismeId);
  }

  // Handle old file cleanup if fileKey has changed or removed
  if (record.fileKey && record.fileKey !== data.fileKey) {
    await deleteOwnFile(record.fileKey, user.organismeId);
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
    await deleteOwnFile(record.fileKey, user.organismeId);
  }

  return deleted;
}

export async function uploadExternalTrainingFile(formData: FormData) {
  const user = await requireOrganisme();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Aucun fichier fourni");
  if (file.size > MAX_CERTIFICATE_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo)");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const type = detectCertificateType(buffer);
  if (!type) {
    throw new Error("Format non supporté. Utilisez PDF, JPG ou PNG.");
  }

  // Nom limité à [A-Za-z0-9_-] : pas de "/" ni ".." dans la clé R2
  const baseName =
    file.name
      .replace(/\.[^.]*$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w-]+/g, "_")
      .slice(0, 80) || "certificat";

  const { uploadFile, getStorageKey } = await import("@/lib/r2");
  const key = getStorageKey(
    user.organismeId,
    "external-trainings",
    `${Date.now()}-${baseName}.${type.ext}`
  );
  await uploadFile(key, buffer, type.mime, true);
  return { key };
}
