import { prisma } from "@/lib/prisma";

// Une session a au plus une signature active (index unique partiel en base).
// Tant qu'elle existe, les données qui alimentent l'attestation sont figées.

export const SIGNED_LOCK_MESSAGE =
  "Attestations signées : dépubliez-les pour modifier.";

export function getActiveSignature(trainingSessionId: string) {
  return prisma.attestationSignature.findFirst({
    where: { trainingSessionId, revokedAt: null },
    include: { attestations: true },
  });
}

export async function assertAttestationsNotSigned(trainingSessionId: string) {
  const active = await prisma.attestationSignature.findFirst({
    where: { trainingSessionId, revokedAt: null },
    select: { id: true },
  });
  if (active) throw new Error(SIGNED_LOCK_MESSAGE);
}
