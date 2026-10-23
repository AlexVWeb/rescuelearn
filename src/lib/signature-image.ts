// Tracé du formateur envoyé par le navigateur (canvas → toDataURL). On ne
// reçoit qu'une image statique : ni points ni vitesses, donc pas de donnée
// biométrique.

const DATA_URL_PREFIX = "data:image/png;base64,";
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const MAX_SIGNATURE_BYTES = 200 * 1024;

export function parseSignaturePng(dataUrl: string): Buffer {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Signature invalide.");
  }
  const base64 = dataUrl.slice(DATA_URL_PREFIX.length);
  // Tranché avant décodage : pas d'allocation pour une charge démesurée
  if ((base64.length * 3) / 4 > MAX_SIGNATURE_BYTES + 2) {
    throw new Error("Signature trop volumineuse.");
  }
  if (!BASE64_PATTERN.test(base64)) throw new Error("Signature invalide.");

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    throw new Error("Signature trop volumineuse.");
  }
  if (!buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    throw new Error("Signature invalide.");
  }
  return buffer;
}
