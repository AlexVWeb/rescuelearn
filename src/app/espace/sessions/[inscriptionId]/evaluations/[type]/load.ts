import { notFound } from "next/navigation";
import { isEvaluationType } from "@/lib/evaluation/questionnaires";
import { getEvaluationContext } from "@/lib/evaluation/service";
import { getTraineeInscription, requireTrainee } from "@/lib/trainee-session";

/**
 * Inscription du stagiaire connecté et état de l'évaluation. Introuvable pour
 * toute inscription d'un autre stagiaire comme pour un stagiaire non éligible :
 * aucune différence observable entre les deux cas.
 */
export async function loadEvaluation(inscriptionId: string, type: string) {
  if (!isEvaluationType(type)) notFound();
  const access = await requireTrainee();
  const inscription = await getTraineeInscription(access, inscriptionId);
  if (!inscription) notFound();

  const context = await getEvaluationContext(inscription, type);
  if (context.denial || !context.window || !context.state) notFound();

  return { inscription, context, window: context.window, state: context.state };
}
