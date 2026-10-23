"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { logger } from "@/lib/logger";
import {
  DOCUMENT_TYPES,
  defaultDocumentTitle,
  matchesDocumentSignature,
  MAX_DOCUMENT_BYTES,
  safeFileBaseName,
  validateDocumentUpload,
} from "../lib/session-documents";

async function findOwnSession(sessionId: string) {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");
  return { user, session };
}

async function findOwnDocument(documentId: string) {
  const user = await requireOrganisme();
  const document = await prisma.sessionDocument.findUnique({
    where: { id: documentId },
    include: { trainingSession: true },
  });
  if (!document || document.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Document introuvable ou non autorisé");
  }
  return document;
}

async function sessionKeyPrefix(organismeId: string, sessionId: string) {
  const { getStorageKey } = await import("@/lib/r2");
  return getStorageKey(organismeId, "session-documents", `${sessionId}/`);
}

/**
 * Étape 1 : URL d'envoi direct vers R2. Le fichier ne transite pas par le
 * serveur (limite de 4,5 Mo des fonctions Vercel).
 */
export async function createDocumentUpload(
  sessionId: string,
  file: { fileName: string; mimeType: string; size: number }
) {
  const { user, session } = await findOwnSession(sessionId);

  const error = validateDocumentUpload(file);
  if (error) throw new Error(error);

  const { extension } = DOCUMENT_TYPES[file.mimeType];
  const prefix = await sessionKeyPrefix(user.organismeId, session.id);
  const key = `${prefix}${Date.now()}-${safeFileBaseName(file.fileName)}.${extension}`;

  const { getPresignedUploadUrl } = await import("@/lib/r2");
  // Court : tant qu'elle est valide, l'URL permet aussi de remplacer l'objet
  const uploadUrl = await getPresignedUploadUrl(key, file.mimeType, 5 * 60);

  return { key, uploadUrl };
}

/**
 * Étape 2 : une URL présignée ne borne ni la taille ni le contenu. On revérifie
 * donc l'objet réellement déposé et on le supprime s'il ne convient pas.
 */
export async function confirmDocumentUpload(
  sessionId: string,
  upload: { key: string; fileName: string; mimeType: string }
) {
  const { user, session } = await findOwnSession(sessionId);

  // La clé doit appartenir à cette session : pas de rattachement d'un objet tiers
  const prefix = await sessionKeyPrefix(user.organismeId, session.id);
  if (!upload.key.startsWith(prefix) || upload.key.includes("..")) {
    throw new Error("Fichier non autorisé");
  }
  if (!DOCUMENT_TYPES[upload.mimeType]) {
    throw new Error("Format non supporté");
  }

  const { deleteFile, getFileHead, getFileSize } = await import("@/lib/r2");
  const size = await getFileSize(upload.key);
  if (size === null) throw new Error("Le fichier n'a pas été reçu");
  // Une lecture de plage sur un objet vide échoue (416) : on tranche avant
  if (size === 0) {
    await deleteFile(upload.key);
    throw new Error("Le fichier est vide.");
  }

  const head = await getFileHead(upload.key);
  if (
    size > MAX_DOCUMENT_BYTES ||
    !matchesDocumentSignature(upload.mimeType, head)
  ) {
    await deleteFile(upload.key);
    throw new Error(
      size > MAX_DOCUMENT_BYTES
        ? "Fichier trop volumineux (25 Mo maximum)."
        : "Le contenu du fichier ne correspond pas à son format."
    );
  }

  return prisma.sessionDocument.create({
    data: {
      trainingSessionId: session.id,
      title: defaultDocumentTitle(upload.fileName),
      fileKey: upload.key,
      mimeType: upload.mimeType,
      size,
    },
  });
}

export async function updateDocument(
  documentId: string,
  data: { title: string; visibleFrom: Date | null }
) {
  const document = await findOwnDocument(documentId);

  const title = data.title.trim().slice(0, 120);
  if (!title) throw new Error("Le titre est obligatoire");

  return prisma.sessionDocument.update({
    where: { id: document.id },
    data: { title, visibleFrom: data.visibleFrom },
  });
}

export async function deleteDocument(documentId: string) {
  const document = await findOwnDocument(documentId);

  await prisma.sessionDocument.delete({ where: { id: document.id } });

  const { deleteFile } = await import("@/lib/r2");
  try {
    await deleteFile(document.fileKey);
  } catch (error) {
    // La ligne est supprimée : le fichier orphelin n'est plus accessible
    logger.error("Suppression R2 du support impossible", error);
  }
}
