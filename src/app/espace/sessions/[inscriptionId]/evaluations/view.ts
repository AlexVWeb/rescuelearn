import {
  EVALUATION_TYPE_LABELS,
  type EvaluationType,
} from "@/lib/evaluation/questionnaires";
import {
  RESPONSE_STATUS,
  type EvaluationContext,
} from "@/lib/evaluation/service";
import { formatParisDay } from "../../../lib/format";

// Ce que l'espace affiche d'une évaluation, sans rien exposer d'autre au client

export type EvaluationViewStatus =
  "todo" | "draft" | "submitted" | "submitted_closed" | "upcoming";

export interface EvaluationView {
  type: EvaluationType;
  label: string;
  status: EvaluationViewStatus;
  /** « 20 novembre » : fermeture si ouverte, ouverture si à venir */
  dateLabel: string;
  estimatedMinutes: number;
}

export function toEvaluationView(
  context: EvaluationContext
): EvaluationView | null {
  if (context.denial || !context.window || !context.state) return null;

  const submitted = context.response?.status === RESPONSE_STATUS.SOUMISE;
  const base = {
    type: context.type,
    label: EVALUATION_TYPE_LABELS[context.type],
    estimatedMinutes: context.questionnaire.estimatedMinutes,
  };

  if (context.state === "upcoming") {
    return {
      ...base,
      status: "upcoming",
      dateLabel: formatParisDay(context.window.opensAt),
    };
  }
  const closesLabel = formatParisDay(context.window.closesAt);
  if (context.state === "closed") {
    return submitted
      ? { ...base, status: "submitted_closed", dateLabel: closesLabel }
      : null;
  }
  return {
    ...base,
    status: submitted ? "submitted" : context.response ? "draft" : "todo",
    dateLabel: closesLabel,
  };
}

/**
 * Évaluations à montrer sur la page de session. L'évaluation à froid à venir
 * n'apparaît qu'une fois celle à chaud ouverte : le stagiaire sait qu'elle viendra.
 */
export function visibleEvaluations(
  contexts: EvaluationContext[]
): EvaluationView[] {
  const views = contexts
    .map(toEvaluationView)
    .filter((view): view is EvaluationView => view !== null);
  const hasActive = views.some((view) => view.status !== "upcoming");
  return hasActive ? views : [];
}
