"use client";

import { useOptimistic, useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toggleChecklistItem } from "../../../welcome-actions";
import type { ReadinessView } from "../types";
import { TermsBlock } from "./terms-block";

const ANCHORS = { terms: "#conditions", preread: "#pre-lecture" } as const;

export function PrepareCard({
  inscriptionId,
  readiness,
  termsAcceptedLabel,
}: {
  inscriptionId: string;
  readiness: ReadinessView;
  termsAcceptedLabel: string | null;
}) {
  const [, startTransition] = useTransition();
  // L'état réel revient par revalidatePath ; en cas d'échec l'optimiste se rétablit
  const [items, setOptimistic] = useOptimistic(
    readiness.items,
    (current, update: { id: string; done: boolean }) =>
      current.map((item) =>
        item.id === update.id ? { ...item, done: update.done } : item
      )
  );
  const done = items.filter((item) => item.done).length;
  const hasTerms = items.some((item) => item.kind === "terms");

  function toggle(id: string, value: boolean) {
    startTransition(async () => {
      setOptimistic({ id, done: value });
      const result = await toggleChecklistItem(inscriptionId, id, value);
      if (!result.ok) toast.error("Impossible d'enregistrer, réessayez");
    });
  }

  return (
    <section
      aria-labelledby="prepare-title"
      className="bg-card space-y-4 rounded-xl border p-4"
    >
      <div className="space-y-2">
        <h2 id="prepare-title" className="text-lg font-semibold">
          Préparer ma venue
        </h2>
        <div className="flex items-center gap-3">
          <Progress
            value={readiness.total ? (done / readiness.total) * 100 : 0}
            aria-label="Progression de la préparation"
            className="flex-1"
          />
          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
            {done} sur {readiness.total}
          </span>
        </div>
      </div>

      <ul className="space-y-1">
        {items.map((item) =>
          item.kind === "manual" ? (
            <li key={item.id} className="flex min-h-11 items-center gap-3">
              <Checkbox
                id={`prepare-${item.id}`}
                checked={item.done}
                onCheckedChange={(value) => toggle(item.id, value === true)}
                className="size-5"
              />
              <Label
                htmlFor={`prepare-${item.id}`}
                className={`flex-1 py-2 text-sm font-normal ${item.done ? "text-muted-foreground line-through" : ""}`}
              >
                {item.label}
              </Label>
            </li>
          ) : (
            <li key={item.id} className="flex min-h-11 items-center gap-3">
              {item.done ? (
                <CheckCircle2
                  className="text-success h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="text-muted-foreground h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <a
                href={ANCHORS[item.kind]}
                className={`flex-1 py-2 text-sm underline-offset-4 hover:underline ${item.done ? "text-muted-foreground" : ""}`}
              >
                <span className="sr-only">
                  {item.done ? "Fait : " : "À faire : "}
                </span>
                {item.label}
              </a>
            </li>
          )
        )}
      </ul>

      {hasTerms && (
        <TermsBlock
          inscriptionId={inscriptionId}
          acceptedAtLabel={termsAcceptedLabel}
        />
      )}
    </section>
  );
}
