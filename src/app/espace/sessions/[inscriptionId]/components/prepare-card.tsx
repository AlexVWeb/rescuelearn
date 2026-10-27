"use client";

import { useOptimistic, useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toggleChecklistItem } from "../../../welcome-actions";
import type { ReadinessView } from "../types";
import { ACTION_BUTTON_CLASS, ActionShell } from "./action-shell";

const ANCHORS = { terms: "#conditions", preread: "#pre-lecture" } as const;

export function PrepareCard({
  inscriptionId,
  readiness,
  eyebrow,
}: {
  inscriptionId: string;
  readiness: ReadinessView;
  /** « À faire avant le lun. 19 oct. » */
  eyebrow: string;
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
  const termsPending = items.some(
    (item) => item.kind === "terms" && !item.done
  );

  function toggle(id: string, value: boolean) {
    startTransition(async () => {
      setOptimistic({ id, done: value });
      const result = await toggleChecklistItem(inscriptionId, id, value);
      if (!result.ok) toast.error("Impossible d'enregistrer, réessayez");
    });
  }

  return (
    <ActionShell eyebrow={eyebrow} title="Préparer ma venue">
      <div className="flex items-center gap-3">
        <Progress
          value={readiness.total ? (done / readiness.total) * 100 : 0}
          aria-label="Progression de la préparation"
          className="bg-brand-foreground/25 [&>[data-slot=progress-indicator]]:bg-brand-foreground flex-1"
        />
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {done} sur {readiness.total}
        </span>
      </div>

      <ul className="grid gap-x-6 sm:grid-cols-2">
        {items.map((item) =>
          item.kind === "manual" ? (
            <li key={item.id} className="flex min-h-11 items-center gap-3">
              <Checkbox
                id={`prepare-${item.id}`}
                checked={item.done}
                onCheckedChange={(value) => toggle(item.id, value === true)}
                className="border-brand-foreground/70 data-[state=checked]:border-brand-foreground data-[state=checked]:bg-brand-foreground data-[state=checked]:text-brand size-5"
              />
              <Label
                htmlFor={`prepare-${item.id}`}
                className={`flex-1 py-2 text-sm font-normal ${item.done ? "text-brand-foreground/75 line-through" : ""}`}
              >
                {item.label}
              </Label>
            </li>
          ) : (
            <li key={item.id} className="flex min-h-11 items-center gap-3">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : (
                <Circle
                  className="text-brand-foreground/70 h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <a
                href={ANCHORS[item.kind]}
                className={`flex-1 py-2 text-sm underline-offset-4 hover:underline ${item.done ? "text-brand-foreground/75 line-through" : "font-medium"}`}
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

      {termsPending && (
        <Button asChild className={ACTION_BUTTON_CLASS}>
          <a href={ANCHORS.terms}>Lire et accepter les conditions</a>
        </Button>
      )}
    </ActionShell>
  );
}
