import { getPresignedUrl } from "@/lib/r2";

export async function getLogoAsBase64(
  logoKey: string | null
): Promise<string | null> {
  if (!logoKey) return null;

  try {
    const url = await getPresignedUrl(logoKey);
    const response = await fetch(url);
    const mimeType = response.headers.get("content-type") ?? "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}
