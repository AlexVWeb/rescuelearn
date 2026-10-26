import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PracticalInfoView } from "../types";

function Details({ info }: { info: PracticalInfoView }) {
  return (
    <div className="bg-card space-y-4 rounded-xl border p-4 text-sm">
      <div className="space-y-1">
        <h3 className="font-medium">Lieu</h3>
        <p className="flex items-start gap-2">
          <MapPin
            className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          {info.location}
        </p>
        {info.accessInfo && (
          <p className="text-muted-foreground whitespace-pre-line">
            {info.accessInfo}
          </p>
        )}
        <a
          href={info.mapsUrl}
          target="_blank"
          rel="noopener"
          className="text-primary inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          Itinéraire
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      </div>

      {info.days.length > 0 && (
        <div className="space-y-1">
          <h3 className="font-medium">Horaires</h3>
          <ul className="space-y-0.5">
            {info.days.map((day) => (
              <li key={day.dayLabel}>
                <span className="first-letter:uppercase">{day.dayLabel}</span>{" "}
                <span className="text-muted-foreground">
                  {day.ranges.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {info.toBring.length > 0 && (
        <div className="space-y-1">
          <h3 className="font-medium">À apporter</h3>
          <ul className="list-disc space-y-0.5 pl-5">
            {info.toBring.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1">
        <h3 className="font-medium">Contacts</h3>
        {info.formateurs.length > 0 && (
          <p>
            <span className="text-muted-foreground">
              {info.formateurs.length > 1 ? "Formateurs" : "Formateur"} :
            </span>{" "}
            {info.formateurs.join(", ")}
          </p>
        )}
        <p>{info.organisme.name}</p>
        <div className="flex flex-wrap gap-x-4">
          {info.organisme.phone && (
            <a
              href={`tel:${info.organisme.phone.replace(/\s+/g, "")}`}
              className="text-primary inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {info.organisme.phone}
            </a>
          )}
          {info.organisme.email && (
            <a
              href={`mailto:${info.organisme.email}`}
              className="text-primary inline-flex min-h-11 items-center gap-2 break-all underline-offset-4 hover:underline"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              {info.organisme.email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function PracticalInfo({
  info,
  collapsed = false,
}: {
  info: PracticalInfoView;
  /** Après le début de la session : replié, l'émargement passe devant */
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <Collapsible className="space-y-3">
        <h2 className="text-lg font-semibold">
          <CollapsibleTrigger className="group focus-visible:ring-ring/50 flex min-h-11 w-full items-center justify-between rounded-md outline-none focus-visible:ring-[3px]">
            Infos pratiques
            <ChevronDown
              className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
        </h2>
        <CollapsibleContent>
          <Details info={info} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <section aria-labelledby="practical-title" className="space-y-3">
      <h2 id="practical-title" className="text-lg font-semibold">
        Infos pratiques
      </h2>
      <Details info={info} />
    </section>
  );
}
