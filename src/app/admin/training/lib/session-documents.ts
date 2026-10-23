import dayjs from "dayjs";
import "dayjs/locale/fr";

// Supports de formation déposés par le formateur, visibles dans l'espace stagiaire.
// Partagé client / serveur : aucune dépendance serveur ici.

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

type Signature = "pdf" | "png" | "jpg" | "zip";

export const DOCUMENT_TYPES: Record<
  string,
  { extension: string; signature: Signature }
> = {
  "application/pdf": { extension: "pdf", signature: "pdf" },
  "image/png": { extension: "png", signature: "png" },
  "image/jpeg": { extension: "jpg", signature: "jpg" },
  // DOCX / PPTX sont des archives ZIP : seule l'enveloppe est vérifiable
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extension: "docx",
    signature: "zip",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    extension: "pptx",
    signature: "zip",
  },
};

export const DOCUMENT_ACCEPT = [
  ...Object.keys(DOCUMENT_TYPES),
  ...Object.values(DOCUMENT_TYPES).map(({ extension }) => `.${extension}`),
].join(",");

const SIGNATURES: Record<Signature, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
  zip: [0x50, 0x4b, 0x03, 0x04], // PK..
};

export function validateDocumentUpload(file: {
  mimeType: string;
  size: number;
}): string | null {
  if (!DOCUMENT_TYPES[file.mimeType]) {
    return "Format non supporté. Utilisez PDF, JPG, PNG, DOCX ou PPTX.";
  }
  if (file.size <= 0) return "Le fichier est vide.";
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "Fichier trop volumineux (25 Mo maximum).";
  }
  return null;
}

export function matchesDocumentSignature(
  mimeType: string,
  head: Uint8Array
): boolean {
  const type = DOCUMENT_TYPES[mimeType];
  if (!type) return false;
  return SIGNATURES[type.signature].every((byte, i) => head[i] === byte);
}

/** Titre par défaut : nom du fichier sans extension, séparateurs adoucis. */
export function defaultDocumentTitle(fileName: string): string {
  return (
    fileName
      .replace(/\.[^.]*$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Document"
  );
}

/** Nom de fichier sûr pour une clé R2 : [A-Za-z0-9_-] uniquement. */
export function safeFileBaseName(fileName: string): string {
  return (
    fileName
      .replace(/\.[^.]*$/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w-]+/g, "_")
      .slice(0, 80) || "document"
  );
}

/**
 * Valeur d'un <input type="datetime-local"> (AAAA-MM-JJTHH:mm), dans le
 * fuseau du navigateur : celui du formateur qui saisit l'heure.
 */
export function toDateTimeLocalValue(date: Date | null): string {
  return date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : "";
}

/** Lit la valeur d'un <input type="datetime-local"> en heure locale. */
export function fromDateTimeLocalValue(value: string): Date | null {
  return value ? dayjs(value).toDate() : null;
}

/** « 12 nov. à 14h00 », dans le fuseau du navigateur. */
export function formatVisibleFrom(date: Date): string {
  return dayjs(date).locale("fr").format("D MMM [à] H[h]mm");
}
