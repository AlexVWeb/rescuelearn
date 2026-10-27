import { Check, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SlotView } from "../types";
import { attendanceSummary, groupSlotsByDay } from "../view-model";

const STATE_LABEL: Record<SlotView["state"], (slot: SlotView) => string> = {
  signed: (slot) =>
    slot.signedAtLabel ? `signé à ${slot.signedAtLabel}` : "signé",
  open: () => "émargement ouvert",
  upcoming: (slot) =>
    slot.isToday ? `ouvre à ${slot.opensAtLabel}` : "à venir",
  missed: () => "non émargé",
  absent: () => "absent",
};

// Ni rouge ni alerte : un créneau manqué n'est pas une erreur du stagiaire
const PILL_CLASS: Record<SlotView["state"], string> = {
  signed:
    "border-transparent bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  open: "bg-primary text-primary-foreground border-transparent",
  upcoming: "bg-background text-muted-foreground",
  missed: "bg-muted text-muted-foreground border-transparent",
  absent: "bg-muted text-muted-foreground border-transparent",
};

function SlotPill({ slot }: { slot: SlotView }) {
  const state = STATE_LABEL[slot.state](slot);
  // L'état reste écrit : la couleur seule ne le dit pas
  const visibleState =
    slot.state === "signed" || (slot.state === "upcoming" && !slot.isToday)
      ? null
      : state;

  return (
    <li
      title={`${slot.label} · ${state}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        PILL_CLASS[slot.state]
      )}
    >
      {slot.state === "signed" && (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="sr-only">{slot.label}, </span>
      {slot.timeRange}
      {visibleState ? (
        <span> · {visibleState}</span>
      ) : (
        <span className="sr-only">, {state}</span>
      )}
    </li>
  );
}

export function Attendance({
  slots,
  before,
  defaultOpen,
}: {
  slots: SlotView[];
  /** Avant la session : un planning, pas encore un relevé de présence */
  before: boolean;
  defaultOpen: boolean;
}) {
  const title = before ? "Planning" : "Ma présence";
  const days = groupSlotsByDay(slots);
  const { signed, total } = attendanceSummary(slots);

  return (
    <section aria-labelledby="attendance-title" className="space-y-3">
      <h2 id="attendance-title" className="text-lg font-semibold">
        {title}
      </h2>
      {slots.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Le planning n&apos;est pas encore publié.
        </p>
      ) : (
        <Collapsible
          defaultOpen={defaultOpen}
          className="bg-card overflow-hidden rounded-xl border"
        >
          <CollapsibleTrigger className="group hover:bg-accent/50 focus-visible:ring-ring/50 flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {before
                  ? `${days.length} ${days.length > 1 ? "jours" : "jour"} · ${total} ${total > 1 ? "créneaux" : "créneau"}`
                  : `${signed} ${signed > 1 ? "créneaux émargés" : "créneau émargé"} sur ${total}`}
              </span>
              {before ? (
                <span className="text-muted-foreground block text-sm">
                  Émargement par code, ouvert 15 min avant chaque créneau
                </span>
              ) : (
                <Progress
                  value={(signed / total) * 100}
                  aria-hidden="true"
                  className="bg-muted mt-2 h-1.5 [&>[data-slot=progress-indicator]]:bg-green-600"
                />
              )}
            </span>
            <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-sm">
              <span className="sr-only sm:not-sr-only">Détail</span>
              <ChevronDown
                className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="divide-y border-t">
              {days.map((day) => (
                <li
                  key={day.dayLabel}
                  aria-current={day.isToday ? "date" : undefined}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3",
                    day.isToday && "bg-brand/5 dark:bg-brand/20"
                  )}
                >
                  <p className="font-medium first-letter:uppercase">
                    {day.dayLabel}
                    {day.isToday && (
                      <span className="block text-xs font-semibold text-blue-900 dark:text-blue-300">
                        Aujourd&apos;hui
                      </span>
                    )}
                  </p>
                  <ul className="flex flex-wrap justify-end gap-1.5">
                    {day.slots.map((slot) => (
                      <SlotPill key={slot.id} slot={slot} />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
      {slots.some((slot) => slot.state === "missed") && (
        <p className="text-muted-foreground text-sm">
          Un créneau non émargé alors que vous étiez présent ? Signalez-le à
          votre formateur.
        </p>
      )}
    </section>
  );
}
