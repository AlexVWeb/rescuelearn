import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setEvaluationReminders } from "../evaluations/actions";
import type { EvaluationView } from "../evaluations/view";

function StatusBadge({ view }: { view: EvaluationView }) {
  switch (view.status) {
    case "todo":
      return (
        <Badge>
          <ClipboardList aria-hidden="true" />À faire
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="outline">
          <PencilLine aria-hidden="true" />
          Commencée
        </Badge>
      );
    case "submitted":
    case "submitted_closed":
      return (
        <Badge variant="success">
          <CheckCircle2 aria-hidden="true" />
          Envoyée
        </Badge>
      );
    case "upcoming":
      return (
        <Badge variant="secondary">
          <Clock aria-hidden="true" />À venir
        </Badge>
      );
  }
}

export const EVALUATION_DETAIL: Record<
  EvaluationView["status"],
  (view: EvaluationView) => string
> = {
  todo: (v) => `Environ ${v.estimatedMinutes} min · jusqu'au ${v.dateLabel}`,
  draft: (v) => `Vos réponses sont enregistrées · jusqu'au ${v.dateLabel}`,
  submitted: (v) => `Merci ! Modifiable jusqu'au ${v.dateLabel}`,
  submitted_closed: () => "Merci pour votre participation.",
  upcoming: (v) => `Ouvrira le ${v.dateLabel}`,
};

export const EVALUATION_CTA: Partial<Record<EvaluationView["status"], string>> =
  {
    todo: "Répondre",
    draft: "Reprendre",
    submitted: "Modifier mes réponses",
    submitted_closed: "Voir mes réponses",
  };

/** Rappels par email : utiles tant qu'une évaluation reste à envoyer */
export function RemindersForm({
  inscriptionId,
  enabled,
  inverted = false,
}: {
  inscriptionId: string;
  enabled: boolean;
  /** Sur la carte d'action, fond inversé */
  inverted?: boolean;
}) {
  return (
    <form
      action={setEvaluationReminders.bind(null, inscriptionId, !enabled)}
      className="flex flex-wrap items-center gap-x-2 text-sm"
    >
      <span
        className={
          inverted ? "text-brand-foreground/85" : "text-muted-foreground"
        }
      >
        {enabled
          ? "Vous recevez un rappel par email tant que l'évaluation n'est pas envoyée."
          : "Rappels par email désactivés."}
      </span>
      <Button
        type="submit"
        variant="link"
        className={cn(
          "h-11 px-0",
          inverted && "text-brand-foreground underline"
        )}
      >
        {enabled ? "Ne plus recevoir de rappels" : "Réactiver les rappels"}
      </Button>
    </form>
  );
}

export function EvaluationsCard({
  inscriptionId,
  evaluations,
  remindersEnabled,
  showReminders,
}: {
  inscriptionId: string;
  evaluations: EvaluationView[];
  remindersEnabled: boolean;
  /** Faux quand la carte d'action porte déjà le réglage */
  showReminders: boolean;
}) {
  const pending = evaluations.some((v) =>
    ["todo", "draft", "upcoming"].includes(v.status)
  );

  return (
    <section aria-labelledby="evaluations-title" className="space-y-3">
      <h2 id="evaluations-title" className="text-lg font-semibold">
        Évaluations
      </h2>
      <ul className="bg-card divide-y rounded-xl border">
        {evaluations.map((view) => {
          const cta = EVALUATION_CTA[view.status];
          return (
            <li key={view.type} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{view.label}</p>
                <StatusBadge view={view} />
              </div>
              <p className="text-muted-foreground text-sm">
                {EVALUATION_DETAIL[view.status](view)}
              </p>
              {cta && (
                <Button
                  asChild
                  variant={
                    view.status.startsWith("submitted") ? "outline" : "default"
                  }
                  className="h-11 w-full sm:w-auto"
                >
                  <Link
                    href={`/espace/sessions/${inscriptionId}/evaluations/${view.type}`}
                  >
                    {cta}
                    <span className="sr-only">
                      {" "}
                      : {view.label.toLowerCase()}
                    </span>
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {showReminders && pending && (
        <RemindersForm
          inscriptionId={inscriptionId}
          enabled={remindersEnabled}
        />
      )}
    </section>
  );
}
