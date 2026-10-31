import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/fr";
import { CalendarPlus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

dayjs.extend(utc);

const MAX_ROWS = 6;

interface SessionData {
  id: string;
  title: string;
  type: string;
  location: string;
  startDate: Date | null;
  maxTrainees: number;
  _count: {
    inscriptions: number;
  };
}

/** Jour et mois du premier jour, lus en UTC (@db.Date) */
function DateBlock({ date }: { date: Date | null }) {
  if (!date) {
    return (
      <span className="text-muted-foreground flex w-12 shrink-0 flex-col items-center text-xs leading-tight">
        Date
        <br />à fixer
      </span>
    );
  }
  const day = dayjs.utc(date).locale("fr");
  return (
    <time
      dateTime={day.format("YYYY-MM-DD")}
      className="flex w-12 shrink-0 flex-col items-center leading-none"
    >
      <span className="text-foreground text-xl font-semibold tabular-nums">
        {day.format("D")}
      </span>
      <span className="text-muted-foreground mt-1 text-xs">
        {day.format("MMM")}
      </span>
    </time>
  );
}

function Fill({ enrolled, max }: { enrolled: number; max: number }) {
  const ratio = max > 0 ? Math.min(100, (enrolled / max) * 100) : 0;
  const isFull = max > 0 && enrolled >= max;
  return (
    <span className="hidden w-32 shrink-0 sm:block">
      <span className="flex items-baseline justify-between text-sm">
        <span className={cn(isFull ? "text-success font-medium" : "sr-only")}>
          {isFull ? "Complet" : "Inscrits"}
        </span>
        <span className="text-foreground ml-auto tabular-nums">
          {enrolled} / {max}
        </span>
      </span>
      <span
        className="bg-muted mt-1.5 block h-1.5 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <span
          className={cn(
            "block h-full rounded-full",
            isFull ? "bg-success" : "bg-brand"
          )}
          style={{ width: `${ratio}%` }}
        />
      </span>
    </span>
  );
}

export function UpcomingSessionsList({
  sessions,
  className,
}: {
  /** Déjà triées par date de début */
  sessions: SessionData[];
  className?: string;
}) {
  const rows = sessions.slice(0, MAX_ROWS);

  return (
    <section aria-labelledby="upcoming-title" className={className}>
      <SectionHeading
        id="upcoming-title"
        title="Sessions à venir"
        action={
          sessions.length > MAX_ROWS
            ? {
                href: "/admin/training/sessions",
                label: `Voir les ${sessions.length} sessions`,
              }
            : undefined
        }
      />

      {rows.length === 0 ? (
        <div className="bg-card flex flex-col items-start gap-3 rounded-2xl border border-dashed p-6">
          <p className="font-medium">Aucune session planifiée</p>
          <p className="text-muted-foreground max-w-prose text-sm">
            Une session réunit les dates, le lieu et les stagiaires. Créez-la
            pour lancer les inscriptions et l&apos;émargement.
          </p>
          <Button asChild size="sm">
            <Link href="/admin/training/sessions/new">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Créer une session
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-2xl border">
          {rows.map((session) => (
            <li key={session.id}>
              <Link
                href={`/admin/training/sessions/${session.id}`}
                className="hover:bg-muted/60 focus-visible:bg-muted flex items-center gap-4 px-4 py-3 transition-colors focus-visible:outline-none"
              >
                <DateBlock date={session.startDate} />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate font-medium">
                    {session.title}
                  </span>
                  <span className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-sm">
                    <span>{session.type}</span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{session.location}</span>
                    </span>
                    <span className="tabular-nums sm:hidden">
                      {session._count.inscriptions} / {session.maxTrainees}{" "}
                      inscrits
                    </span>
                  </span>
                </span>
                <Fill
                  enrolled={session._count.inscriptions}
                  max={session.maxTrainees}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
