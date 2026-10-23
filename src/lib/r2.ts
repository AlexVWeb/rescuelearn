import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { encryptBuffer, decryptBuffer } from "./encryption";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // Depuis la 3.729, le SDK ajoute par défaut des sommes de contrôle CRC32.
  // Dans une URL présignée, c'est celle d'un corps vide : R2 rejetterait le
  // fichier envoyé par le navigateur. Recommandation Cloudflare pour R2.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  shouldEncrypt = false
): Promise<string> {
  const body = shouldEncrypt ? encryptBuffer(buffer) : buffer;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  // Pour les fichiers chiffrés, l'URL publique n'est plus pertinente
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Télécharge un fichier depuis R2 et le déchiffre si nécessaire.
 */
export async function getFile(
  key: string,
  shouldDecrypt = false
): Promise<{ buffer: Buffer; contentType?: string }> {
  const response = await r2.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error("Fichier introuvable");
  }

  const bytes = await response.Body.transformToByteArray();
  const buffer = Buffer.from(bytes);

  return {
    buffer: shouldDecrypt ? decryptBuffer(buffer) : buffer,
    contentType: response.ContentType,
  };
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
  downloadName?: string
): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      // Force le téléchargement sous un nom lisible plutôt que la clé R2
      ...(downloadName && {
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      }),
    }),
    { expiresIn }
  );
}

/**
 * URL d'envoi direct navigateur → R2, pour les fichiers trop lourds pour une
 * Server Action (limite de 4,5 Mo sur Vercel). Nécessite une règle CORS
 * autorisant PUT depuis l'origine de l'application sur le bucket.
 * Le Content-Type est signé : le navigateur doit envoyer exactement le même.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

/** Taille réelle d'un objet, ou null s'il n'existe pas. */
export async function getFileSize(key: string): Promise<number | null> {
  try {
    const head = await r2.send(
      new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key })
    );
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

/** Premiers octets d'un objet, pour vérifier son type réel (magic bytes). */
export async function getFileHead(key: string, length = 8): Promise<Buffer> {
  const response = await r2.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Range: `bytes=0-${length - 1}`,
    })
  );
  if (!response.Body) throw new Error("Fichier introuvable");
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteFile(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}

export function getStorageKey(
  organismeId: string,
  type: "logo" | "external-trainings" | "session-documents",
  filename: string
): string {
  const mode = process.env.APP_MODE || "dev";
  return `${mode}/organisme/${organismeId}/${type}/${filename}`;
}
