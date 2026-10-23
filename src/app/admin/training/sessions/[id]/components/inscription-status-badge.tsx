import { Badge } from "@/components/ui/badge";
import { INSCRIPTION_STATUS } from "@/app/admin/training/types";

// `présent` valide la compétence du stagiaire : on l'affiche comme l'issue
// de la formation, pas comme une présence ponctuelle (gérée par l'émargement)
export const OUTCOME_LABELS: Record<string, string> = {
  [INSCRIPTION_STATUS.INSCRIT]: "Non défini",
  [INSCRIPTION_STATUS.PRESENT]: "Formation suivie",
  [INSCRIPTION_STATUS.ABSENT]: "Absent",
  [INSCRIPTION_STATUS.ELIMINE]: "Éliminé",
};

export function InscriptionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case INSCRIPTION_STATUS.PRESENT:
      return <Badge variant="success">Formation suivie</Badge>;
    case INSCRIPTION_STATUS.ABSENT:
      return <Badge variant="destructive">Absent</Badge>;
    case INSCRIPTION_STATUS.ELIMINE:
      return <Badge variant="destructive">Éliminé</Badge>;
    default:
      return <Badge variant="secondary">Inscrit</Badge>;
  }
}
