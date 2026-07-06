import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Gets the encryption key from environment variables.
 * Must be a 32-byte hex string (64 characters).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not defined in environment variables");
  }
  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypts text using AES-256-GCM.
 * Returns a string in the format: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts text in the format: iv:authTag:encryptedData
 */
export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(":");
  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getEncryptionKey();

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypts a buffer using AES-256-GCM.
 * Prepends the IV and auth tag to the buffer.
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: [IV (12)] [AuthTag (16)] [EncryptedData (...)]
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts a buffer that was encrypted with encryptBuffer.
 */
export function decryptBuffer(buffer: Buffer): Buffer {
  if (buffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Buffer too short to be valid encrypted data");
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encryptedData = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  const key = getEncryptionKey();

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * Generates a SHA-256 hash of a string for indexed lookups.
 */
export function hash(text: string): string {
  return createHash("sha256").update(text.toLowerCase().trim()).digest("hex");
}
