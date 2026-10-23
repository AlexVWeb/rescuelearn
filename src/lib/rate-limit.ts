import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Réutilise la table RateLimit de Better-Auth (storage "database").
// Les clés sont préfixées pour ne pas entrer en collision avec les siennes.
// Seuls les échecs sont comptés : une salle de formation derrière une même IP
// peut saisir le bon code autant de fois que nécessaire.

export interface RateLimitRule {
  key: string;
  max: number;
  windowSeconds: number;
}

export class RateLimitError extends Error {
  constructor(
    message = "Trop de tentatives. Patientez quelques minutes avant de réessayer."
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

function isWindowActive(lastRequest: bigint, windowSeconds: number) {
  return Date.now() - Number(lastRequest) < windowSeconds * 1000;
}

export async function assertNotRateLimited(rule: RateLimitRule) {
  const record = await prisma.rateLimit.findUnique({
    where: { key: rule.key },
  });
  if (
    record &&
    isWindowActive(record.lastRequest, rule.windowSeconds) &&
    record.count >= rule.max
  ) {
    throw new RateLimitError();
  }
}

export async function registerFailure(rule: RateLimitRule) {
  const record = await prisma.rateLimit.findUnique({
    where: { key: rule.key },
  });
  const now = BigInt(Date.now());

  // lastRequest marque le début de la fenêtre courante
  if (!record || !isWindowActive(record.lastRequest, rule.windowSeconds)) {
    await prisma.rateLimit.upsert({
      where: { key: rule.key },
      update: { count: 1, lastRequest: now },
      create: { key: rule.key, count: 1, lastRequest: now },
    });
    return;
  }

  await prisma.rateLimit.update({
    where: { key: rule.key },
    data: { count: { increment: 1 } },
  });
}

export async function getClientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
