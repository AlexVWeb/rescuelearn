import { prisma } from "@/lib/prisma";
import { EMARGEMENT_STATUS } from "@/app/admin/training/types";

export type SignedVia = "portail" | "pin" | "formateur";

/**
 * Signature d'un émargement par le stagiaire (portail ou /validation).
 * Idempotent : un double envoi sur réseau faible ne réécrit pas l'heure.
 */
export async function markEmargementSigned(
  emargement: { id: string; inscriptionId: string; status: string },
  signedVia: SignedVia
) {
  if (emargement.status === EMARGEMENT_STATUS.VALIDE) return;

  await prisma.emargement.update({
    where: { id: emargement.id },
    data: {
      status: EMARGEMENT_STATUS.VALIDE,
      validatedAt: new Date(),
      signedVia,
    },
  });
  await prisma.inscription.update({
    where: { id: emargement.inscriptionId },
    data: { status: "présent" },
  });
}
