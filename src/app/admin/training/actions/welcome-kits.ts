"use server";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { hasRole, UserRole } from "@/lib/roles";
import { logger } from "@/lib/logger";
import {
  MAX_CHECKLIST_ITEMS,
  parseChecklist,
  preReadVisibleFrom,
  type ChecklistItem,
  type Readiness,
} from "@/lib/welcome-kit";
import { inscriptionReadiness, loadWelcome } from "@/lib/welcome-kit-service";
import {
  DOCUMENT_TYPES,
  defaultDocumentTitle,
  matchesDocumentSignature,
  MAX_DOCUMENT_BYTES,
  safeFileBaseName,
  validateDocumentUpload,
} from "../lib/session-documents";
import { VALID_SESSION_TYPES, type SessionType } from "../types";

const MAX_TERMS_BYTES = 10 * 1024 * 1024;
const MAX_TO_BRING = 2000;
const MAX_SESSION_FIELD = 1000;
const MAX_VISIBLE_DAYS_BEFORE = 90;

type FileMeta = { fileName: string; mimeType: string; size: number };
type Upload = { key: string; fileName: string; mimeType: string };

function asSessionType(type: string): SessionType {
  if (!VALID_SESSION_TYPES.includes(type as SessionType)) {
    throw new Error("Type de formation inconnu");
  }
  return type as SessionType;
}

async function requireTermsEditor() {
  const user = await requireOrganisme();
  if (
    !hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
    !hasRole(user.roles, UserRole.SUPER_ADMIN)
  ) {
    throw new Error("Réservé aux administrateurs de l'organisme");
  }
  return user;
}

async function kitKeyPrefix(organismeId: string, type: SessionType) {
  const { getStorageKey } = await import("@/lib/r2");
  return getStorageKey(organismeId, "welcome-kits", `${type}/`);
}

async function termsKeyPrefix(organismeId: string) {
  const { getStorageKey } = await import("@/lib/r2");
  return getStorageKey(organismeId, "terms", "");
}

function assertOwnKey(key: string, prefix: string) {
  if (!key.startsWith(prefix) || key.includes("..")) {
    throw new Error("Fichier non autorisé");
  }
}

/**
 * Une URL présignée ne borne ni la taille ni le contenu : on revérifie l'objet
 * réellement déposé et on le supprime s'il ne convient pas.
 */
async function checkUploadedFile(
  key: string,
  mimeType: string,
  maxBytes: number
) {
  const { deleteFile, getFileHead, getFileSize } = await import("@/lib/r2");
  const size = await getFileSize(key);
  if (size === null) throw new Error("Le fichier n'a pas été reçu");
  if (size === 0) {
    await deleteFile(key);
    throw new Error("Le fichier est vide.");
  }

  const head = await getFileHead(key);
  if (size > maxBytes || !matchesDocumentSignature(mimeType, head)) {
    await deleteFile(key);
    throw new Error(
      size > maxBytes
        ? `Fichier trop volumineux (${maxBytes / 1024 / 1024} Mo maximum).`
        : "Le contenu du fichier ne correspond pas à son format."
    );
  }
  return size;
}

// --- Organisme : réglages d'accueil ---

export async function getWelcomeSettings() {
  const user = await requireOrganisme();
  const [organisme, kits] = await Promise.all([
    prisma.organisme.findUnique({
      where: { id: user.organismeId },
      select: { termsVersion: true, termsUpdatedAt: true, termsFileKey: true },
    }),
    prisma.welcomeKit.findMany({
      where: { organismeId: user.organismeId },
      include: { documents: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  return {
    terms:
      organisme?.termsFileKey && organisme.termsUpdatedAt
        ? {
            version: organisme.termsVersion,
            updatedAt: organisme.termsUpdatedAt,
          }
        : null,
    canEditTerms:
      hasRole(user.roles, UserRole.ADMIN_ORGANISME) ||
      hasRole(user.roles, UserRole.SUPER_ADMIN),
    kits: kits.map((kit) => ({
      type: kit.type,
      toBring: kit.toBring,
      checklist: parseChecklist(kit.checklist),
      documents: kit.documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        mimeType: doc.mimeType,
        size: doc.size,
        visibleDaysBefore: doc.visibleDaysBefore,
      })),
    })),
  };
}

export async function saveWelcomeKit(
  type: string,
  data: { toBring: string | null; checklist: ChecklistItem[] }
) {
  const user = await requireOrganisme();
  const sessionType = asSessionType(type);

  if (
    Array.isArray(data.checklist) &&
    data.checklist.length > MAX_CHECKLIST_ITEMS
  ) {
    throw new Error(`${MAX_CHECKLIST_ITEMS} éléments maximum`);
  }
  // Objets plats { id, label } : JSON valide pour Prisma
  const checklist = parseChecklist(
    data.checklist
  ) as unknown as Prisma.InputJsonArray;
  const toBring = data.toBring?.trim().slice(0, MAX_TO_BRING) || null;

  await prisma.welcomeKit.upsert({
    where: {
      organismeId_type: { organismeId: user.organismeId, type: sessionType },
    },
    create: {
      organismeId: user.organismeId,
      type: sessionType,
      toBring,
      checklist,
    },
    update: { toBring, checklist },
  });
}

export async function createKitDocumentUpload(type: string, file: FileMeta) {
  const user = await requireOrganisme();
  const sessionType = asSessionType(type);

  const error = validateDocumentUpload(file);
  if (error) throw new Error(error);

  const { extension } = DOCUMENT_TYPES[file.mimeType];
  const prefix = await kitKeyPrefix(user.organismeId, sessionType);
  const key = `${prefix}${Date.now()}-${safeFileBaseName(file.fileName)}.${extension}`;

  const { getPresignedUploadUrl } = await import("@/lib/r2");
  const uploadUrl = await getPresignedUploadUrl(key, file.mimeType, 5 * 60);

  return { key, uploadUrl };
}

export async function confirmKitDocumentUpload(type: string, upload: Upload) {
  const user = await requireOrganisme();
  const sessionType = asSessionType(type);

  assertOwnKey(upload.key, await kitKeyPrefix(user.organismeId, sessionType));
  if (!DOCUMENT_TYPES[upload.mimeType]) throw new Error("Format non supporté");

  const size = await checkUploadedFile(
    upload.key,
    upload.mimeType,
    MAX_DOCUMENT_BYTES
  );

  // Un document peut être déposé avant le premier enregistrement du modèle
  const kit = await prisma.welcomeKit.upsert({
    where: {
      organismeId_type: { organismeId: user.organismeId, type: sessionType },
    },
    create: { organismeId: user.organismeId, type: sessionType },
    update: {},
  });

  const document = await prisma.welcomeKitDocument.create({
    data: {
      welcomeKitId: kit.id,
      title: defaultDocumentTitle(upload.fileName),
      fileKey: upload.key,
      mimeType: upload.mimeType,
      size,
    },
  });
  return {
    id: document.id,
    title: document.title,
    mimeType: document.mimeType,
    size: document.size,
    visibleDaysBefore: document.visibleDaysBefore,
  };
}

async function findOwnKitDocument(documentId: string) {
  const user = await requireOrganisme();
  const document = await prisma.welcomeKitDocument.findUnique({
    where: { id: documentId },
    include: { welcomeKit: true },
  });
  if (!document || document.welcomeKit.organismeId !== user.organismeId) {
    throw new Error("Document introuvable ou non autorisé");
  }
  return document;
}

export async function updateKitDocument(
  documentId: string,
  data: { title: string; visibleDaysBefore: number | null }
) {
  const days = data.visibleDaysBefore;
  if (
    days !== null &&
    (!Number.isInteger(days) || days < 0 || days > MAX_VISIBLE_DAYS_BEFORE)
  ) {
    throw new Error(
      `Le délai doit être un nombre de jours entre 0 et ${MAX_VISIBLE_DAYS_BEFORE}`
    );
  }
  const document = await findOwnKitDocument(documentId);

  const title = data.title.trim().slice(0, 120);
  if (!title) throw new Error("Le titre est obligatoire");

  await prisma.welcomeKitDocument.update({
    where: { id: document.id },
    data: { title, visibleDaysBefore: days },
  });
}

export async function deleteKitDocument(documentId: string) {
  const document = await findOwnKitDocument(documentId);

  await prisma.welcomeKitDocument.delete({ where: { id: document.id } });

  const { deleteFile } = await import("@/lib/r2");
  try {
    await deleteFile(document.fileKey);
  } catch (error) {
    logger.error("Suppression R2 du document de kit impossible", error);
  }
}

// --- Conditions générales ---

export async function createTermsUpload(file: FileMeta) {
  const user = await requireTermsEditor();

  if (file.mimeType !== "application/pdf") {
    throw new Error("Les conditions générales doivent être un PDF.");
  }
  if (file.size <= 0) throw new Error("Le fichier est vide.");
  if (file.size > MAX_TERMS_BYTES) {
    throw new Error("Fichier trop volumineux (10 Mo maximum).");
  }

  const prefix = await termsKeyPrefix(user.organismeId);
  const key = `${prefix}${Date.now()}-${safeFileBaseName(file.fileName)}.pdf`;

  const { getPresignedUploadUrl } = await import("@/lib/r2");
  const uploadUrl = await getPresignedUploadUrl(key, file.mimeType, 5 * 60);

  return { key, uploadUrl };
}

/**
 * Les anciennes versions restent dans R2 : des inscriptions les référencent
 * comme preuve d'acceptation.
 */
export async function confirmTermsUpload(upload: Upload) {
  const user = await requireTermsEditor();

  assertOwnKey(upload.key, await termsKeyPrefix(user.organismeId));
  if (upload.mimeType !== "application/pdf") {
    throw new Error("Les conditions générales doivent être un PDF.");
  }

  await checkUploadedFile(upload.key, upload.mimeType, MAX_TERMS_BYTES);

  const { getFile } = await import("@/lib/r2");
  const { buffer } = await getFile(upload.key);
  const version = createHash("sha256").update(buffer).digest("hex");
  const updatedAt = new Date();

  await prisma.organisme.update({
    where: { id: user.organismeId },
    data: {
      termsFileKey: upload.key,
      termsVersion: version,
      termsUpdatedAt: updatedAt,
    },
  });
  return { version, updatedAt };
}

export async function getTermsPreviewUrl() {
  const user = await requireOrganisme();
  const organisme = await prisma.organisme.findUnique({
    where: { id: user.organismeId },
    select: { termsFileKey: true },
  });
  if (!organisme?.termsFileKey) throw new Error("Aucune condition déposée");

  const { getPresignedUrl } = await import("@/lib/r2");
  return getPresignedUrl(
    organisme.termsFileKey,
    5 * 60,
    "Conditions générales.pdf"
  );
}

// --- Session ---

async function findOwnSession(sessionId: string) {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");
  return session;
}

function cleanSessionField(value: string | null) {
  return value?.trim().slice(0, MAX_SESSION_FIELD) || null;
}

export async function updateSessionWelcome(
  sessionId: string,
  data: { accessInfo: string | null; toBringExtra: string | null }
) {
  const session = await findOwnSession(sessionId);
  await prisma.trainingSession.update({
    where: { id: session.id },
    data: {
      accessInfo: cleanSessionField(data.accessInfo),
      toBringExtra: cleanSessionField(data.toBringExtra),
    },
  });
}

export async function getSessionWelcome(sessionId: string) {
  const session = await findOwnSession(sessionId);
  const kit = await prisma.welcomeKit.findUnique({
    where: {
      organismeId_type: {
        organismeId: session.organismeId,
        type: session.type,
      },
    },
    include: { documents: { orderBy: { createdAt: "asc" } } },
  });

  return {
    type: session.type,
    accessInfo: session.accessInfo,
    toBringExtra: session.toBringExtra,
    kit: kit
      ? {
          toBring: kit.toBring,
          checklist: parseChecklist(kit.checklist),
          documents: kit.documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            size: doc.size,
            visibleFrom: preReadVisibleFrom(
              session.startDate,
              doc.visibleDaysBefore
            ),
          })),
        }
      : null,
  };
}

export type SessionReadiness = Readiness & { termsAcceptedAt: Date | null };

/** `null` quand la session n'a rien à préparer : la colonne est masquée. */
export async function getSessionReadiness(
  sessionId: string
): Promise<Record<string, SessionReadiness> | null> {
  const session = await findOwnSession(sessionId);
  const [welcome, inscriptions] = await Promise.all([
    loadWelcome(session),
    prisma.inscription.findMany({
      where: { trainingSessionId: session.id },
      select: {
        id: true,
        checklistDone: true,
        prereadOpenedAt: true,
        termsAcceptedAt: true,
      },
    }),
  ]);

  const result: Record<string, SessionReadiness> = {};
  for (const inscription of inscriptions) {
    result[inscription.id] = {
      ...inscriptionReadiness(welcome, inscription),
      termsAcceptedAt: inscription.termsAcceptedAt,
    };
  }
  const hasItems = Object.values(result).some((r) => r.total > 0);
  return hasItems ? result : null;
}
