import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }),
    { expiresIn }
  );
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
  type: "logo" | "external-trainings",
  filename: string
): string {
  const mode = process.env.APP_MODE || "dev";
  return `${mode}/organisme/${organismeId}/${type}/${filename}`;
}
