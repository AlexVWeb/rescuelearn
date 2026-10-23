"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { getAttestationState } from "@/lib/trainee-attestation";
import { deliverAccessToAll } from "@/lib/trainee-access-delivery";

async function findOwnSession(sessionId: string) {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    include: { organisme: true, inscriptions: { include: { trainee: true } } },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");
  return session;
}

/**
 * Rend les attestations téléchargeables dans l'espace stagiaire. Avec `notify`,
 * seuls les stagiaires dont l'attestation est disponible reçoivent un mail
 * (avec un nouveau lien : l'ancien n'est pas stocké). Les autres ne sont pas
 * prévenus : l'organisme reprend contact avec eux.
 */
export async function publishAttestations(
  sessionId: string,
  options: { notify: boolean }
) {
  const session = await findOwnSession(sessionId);
  const publishedAt = new Date();

  await prisma.trainingSession.update({
    where: { id: session.id },
    data: { attestationsPublishedAt: publishedAt },
  });

  if (!options.notify) return { sent: 0, missingEmail: 0, failed: 0 };

  const available = session.inscriptions.filter(
    (inscription) =>
      getAttestationState(publishedAt, inscription) === "available"
  );
  return deliverAccessToAll(available, session, "attestation");
}

export async function unpublishAttestations(sessionId: string) {
  const session = await findOwnSession(sessionId);
  await prisma.trainingSession.update({
    where: { id: session.id },
    data: { attestationsPublishedAt: null },
  });
}
