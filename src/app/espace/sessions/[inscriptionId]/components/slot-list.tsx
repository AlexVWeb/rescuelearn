import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SlotView } from "../types";

function SlotBadge({ slot }: { slot: SlotView }) {
  switch (slot.state) {
    case "signed":
      return (
        <Badge variant="success">
          <CheckCircle2 aria-hidden="true" />
          {slot.signedAtLabel ? `Signé à ${slot.signedAtLabel}` : "Signé"}
        </Badge>
      );
    case "open":
      return <Badge>En cours</Badge>;
    case "upcoming":
      return (
        <Badge variant="outline">
          {slot.isToday ? `Ouvre à ${slot.opensAtLabel}` : "À venir"}
        </Badge>
      );
    // Ni rouge ni alerte : un créneau manqué n'est pas une erreur du stagiaire
    case "missed":
      return <Badge variant="secondary">Non émargé</Badge>;
    case "absent":
      return <Badge variant="secondary">Absent</Badge>;
  }
}

export function SlotList({ slots }: { slots: SlotView[] }) {
  return (
    <section aria-labelledby="planning-title" className="space-y-3">
      <h2 id="planning-title" className="text-lg font-semibold">
        Planning et émargement
      </h2>
      {slots.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Le planning n&apos;est pas encore publié.
        </p>
      ) : (
        <ol className="bg-card divide-y rounded-xl border">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium first-letter:uppercase">
                  {slot.dayLabel}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {slot.label} · {slot.timeRange}
                </p>
              </div>
              <SlotBadge slot={slot} />
            </li>
          ))}
        </ol>
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
