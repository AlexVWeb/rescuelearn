import { EMARGEMENT_STATUS, SESSION_STATUS } from "@/app/admin/training/types";
import type { EvaluationWindowState } from "./window";

// Seuls les stagiaires présents à au moins un créneau évaluent la formation.

export type EvaluationDenial =
  "session_cancelled" | "not_attended" | "anonymized" | "no_slots";

interface EligibilityInput {
  sessionStatus: string;
  isAnonymized: boolean;
  emargementStatuses: string[];
  sessionEnd: Date | null;
}

export function checkEvaluationEligibility(
  input: EligibilityInput
): EvaluationDenial | null {
  if (input.sessionStatus === SESSION_STATUS.ANNULEE) {
    return "session_cancelled";
  }
  if (input.isAnonymized) return "anonymized";
  if (!input.sessionEnd) return "no_slots";
  if (!input.emargementStatuses.includes(EMARGEMENT_STATUS.VALIDE)) {
    return "not_attended";
  }
  return null;
}

export type EditDenial = "not_open" | "closed";

/** Brouillon comme réponse soumise : modifiables tant que la fenêtre est ouverte. */
export function checkCanEdit(state: EvaluationWindowState): EditDenial | null {
  if (state === "upcoming") return "not_open";
  if (state === "closed") return "closed";
  return null;
}
