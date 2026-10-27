import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReadinessView } from "../types";
import type { NextAction, SessionPhase } from "../view-model";
import { ACTION_BUTTON_CLASS, ActionShell } from "./action-shell";
import {
  EVALUATION_CTA,
  EVALUATION_DETAIL,
  RemindersForm,
} from "./evaluations-card";
import { PrepareCard } from "./prepare-card";
import { SignSlotCard } from "./sign-slot-card";

export function NextActionCard({
  action,
  phase,
  inscriptionId,
  readiness,
  firstDayLabel,
  remindersEnabled,
}: {
  action: NextAction;
  phase: SessionPhase;
  inscriptionId: string;
  readiness: ReadinessView;
  /** « lun. 19 oct. », premier jour de la session */
  firstDayLabel: string | null;
  remindersEnabled: boolean;
}) {
  switch (action.kind) {
    case "sign":
      return (
        <SignSlotCard
          key={action.slot.id}
          inscriptionId={inscriptionId}
          slot={action.slot}
        />
      );

    case "prepare":
      return (
        <PrepareCard
          inscriptionId={inscriptionId}
          readiness={readiness}
          eyebrow={
            firstDayLabel
              ? `À faire avant le ${firstDayLabel}`
              : "À faire avant la session"
          }
        />
      );

    case "evaluation": {
      const { evaluation } = action;
      return (
        <ActionShell
          eyebrow={phase === "after" ? "Il vous reste une étape" : "À faire"}
          title={evaluation.label}
          description={EVALUATION_DETAIL[evaluation.status](evaluation)}
        >
          <div className="space-y-2">
            <Button asChild className={ACTION_BUTTON_CLASS}>
              <Link
                href={`/espace/sessions/${inscriptionId}/evaluations/${evaluation.type}`}
              >
                {EVALUATION_CTA[evaluation.status]}
                <span className="sr-only">
                  {" "}
                  : {evaluation.label.toLowerCase()}
                </span>
              </Link>
            </Button>
            <RemindersForm
              inscriptionId={inscriptionId}
              enabled={remindersEnabled}
              inverted
            />
          </div>
        </ActionShell>
      );
    }

    case "attestation":
      return (
        <ActionShell
          eyebrow="Formation validée"
          title="Votre attestation est disponible"
        >
          <Button asChild className={ACTION_BUTTON_CLASS}>
            <a href={`/espace/sessions/${inscriptionId}/attestation`} download>
              <Download className="h-4 w-4" aria-hidden="true" />
              Télécharger mon attestation (PDF)
            </a>
          </Button>
        </ActionShell>
      );

    case "next-slot": {
      const { slot } = action;
      return (
        <ActionShell
          eyebrow={phase === "before" ? "Vous êtes prêt" : "Prochain créneau"}
          title={`${slot.isToday ? "Aujourd'hui" : slot.dayLabel} · ${slot.timeRange}`}
          description={slot.label}
        >
          <p className="text-brand-foreground/85 text-sm">
            L&apos;émargement ouvre à {slot.opensAtLabel}, avec le code affiché
            en salle par votre formateur.
          </p>
        </ActionShell>
      );
    }
  }
}
