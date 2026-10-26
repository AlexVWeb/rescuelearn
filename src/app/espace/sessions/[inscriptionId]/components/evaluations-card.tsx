import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const DETAIL: Record<
  EvaluationView["status"],
  (view: EvaluationView) => string
> = {
  todo: (v) => `Environ ${v.estimatedMinutes} min · jusqu'au ${v.dateLabel}`,
  draft: (v) => `Vos réponses sont enregistrées · jusqu'au ${v.dateLabel}`,
  submitted: (v) => `Merci ! Modifiable jusqu'au ${v.dateLabel}`,
  submitted_closed: () => "Merci pour votre participation.",
  upcoming: (v) => `Ouvrira le ${v.dateLabel}`,
};

const CTA: Partial<Record<EvaluationView["status"], string>> = {
  todo: "Répondre",
  draft: "Reprendre",
  submitted: "Modifier mes réponses",
  submitted_closed: "Voir mes réponses",
};

export function EvaluationsCard({
  inscriptionId,
  evaluations,
  remindersEnabled,
}: {
  inscriptionId: string;
  evaluations: EvaluationView[];
  remindersEnabled: boolean;
}) {
  // Rappels utiles tant qu'une évaluation reste à envoyer
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
          const cta = CTA[view.status];
          return (
            <li key={view.type} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{view.label}</p>
                <StatusBadge view={view} />
              </div>
              <p className="text-muted-foreground text-sm">
                {DETAIL[view.status](view)}
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
      {pending && (
        <form
          action={setEvaluationReminders.bind(
            null,
            inscriptionId,
            !remindersEnabled
          )}
          className="flex flex-wrap items-center gap-x-2 text-sm"
        >
          <span className="text-muted-foreground">
            {remindersEnabled
              ? "Vous recevez un rappel par email tant que l'évaluation n'est pas envoyée."
              : "Rappels par email désactivés."}
          </span>
          <Button type="submit" variant="link" className="h-11 px-0">
            {remindersEnabled
              ? "Ne plus recevoir de rappels"
              : "Réactiver les rappels"}
          </Button>
        </form>
      )}
    </section>
  );
}
