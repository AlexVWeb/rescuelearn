import { ATTESTATION_RESULT } from "@/app/admin/training/types";

export type AttestationState = "pending" | "available" | "contact";

/**
 * Ce que voit le stagiaire dans son espace. Rien avant publication par
 * l'organisme ; ensuite, jamais de résultat brut négatif : l'organisme
 * reprend contact avec le stagiaire.
 */
export function getAttestationState(
  attestationsPublishedAt: Date | null,
  inscription: {
    attestationResult: string | null;
    attestationValidatedAt: Date | null;
  }
): AttestationState {
  if (!attestationsPublishedAt) return "pending";
  if (
    inscription.attestationResult === ATTESTATION_RESULT.ACQUIS &&
    inscription.attestationValidatedAt
  ) {
    return "available";
  }
  return "contact";
}
