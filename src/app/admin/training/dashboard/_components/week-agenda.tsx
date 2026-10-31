import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/fr";
import { Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AgendaColumn,
  AgendaRow,
  WeekAgenda as WeekAgendaData,
} from "../../lib/dashboard-agenda";

dayjs.extend(utc);

export interface NextSessionHint {
  id: string;
  title: string;
  startDate: Date;
}

/** Colonne des sessions, puis la frise des 7 jours, alignées d'une ligne à l'autre */
const ROW_GRID =
  "grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)]";

/**
 * Seul bloc en couleur de la page : ce qui se passe en salle cette semaine.
 * Une ligne par session, même quand elle dure toute la semaine.
 */
export function WeekAgenda({
  week,
  nextSession,
  className,
}: {
  week: WeekAgendaData;
  /** Première session datée, pour orienter quand la semaine est vide */
  nextSession: NextSessionHint | null;
  className?: string;
}) {
  const { columns, rows } = week;

  return (
    <section
      aria-labelledby="agenda-title"
      className={cn(
        "bg-brand text-brand-foreground rounded-2xl p-5 sm:p-6",
        className
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2
            id="agenda-title"
            className="text-xl font-semibold tracking-tight"
          >
            Les 7 prochains jours
          </h2>
          {rows.length > 0 && (
            <p className="text-brand-foreground/75 text-sm">
              {rows.length} session{rows.length > 1 ? "s" : ""} en cours ou à
              venir
            </p>
          )}
        </div>
        <Link
          href="/admin/training/sessions"
          className="text-brand-foreground/85 hover:text-brand-foreground focus-visible:ring-brand-foreground rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Toutes les sessions
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyWeek nextSession={nextSession} />
      ) : (
        <div className="mt-5">
          <div className={ROW_GRID} aria-hidden="true">
            <span className="hidden sm:block" />
            <DayHeader columns={columns} />
          </div>
          <ul className="mt-1 divide-y divide-white/15">
            {rows.map((row) => (
              <li key={row.sessionId}>
                <AgendaLine row={row} columns={columns} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DayHeader({ columns }: { columns: AgendaColumn[] }) {
  return (
    <div className="grid grid-cols-7 text-center">
      {columns.map((column) => (
        <span
          key={column.key}
          className={cn(
            "mx-auto flex w-9 flex-col items-center rounded-md py-1 leading-tight",
            column.isToday
              ? "bg-brand-foreground text-brand"
              : "text-brand-foreground/70"
          )}
        >
          <span className="text-[11px]">{column.weekday}</span>
          <span className="text-sm font-semibold tabular-nums">
            {column.dayNumber}
          </span>
        </span>
      ))}
    </div>
  );
}

function AgendaLine({
  row,
  columns,
}: {
  row: AgendaRow;
  columns: AgendaColumn[];
}) {
  const activeDays = columns
    .filter((_, i) => row.dayTimes[i] !== null)
    .map((column) => column.fullLabel);

  return (
    <Link
      href={`/admin/training/sessions/${row.sessionId}`}
      className={cn(
        ROW_GRID,
        "focus-visible:ring-brand-foreground -mx-2 items-center rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:outline-none"
      )}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold">{row.title}</span>
        <span className="text-brand-foreground/80 mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {row.schedule ?? "Horaires selon le jour"}
          </span>
          <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{row.location}</span>
          </span>
          <span>{row.type}</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {row.enrolled} / {row.maxTrainees} inscrits
          </span>
        </span>
        <span className="sr-only">. Les jours : {activeDays.join(", ")}.</span>
      </span>

      <span className="grid grid-cols-7" aria-hidden="true">
        {columns.map((column, i) => {
          const times = row.dayTimes[i];
          return (
            <span
              key={column.key}
              title={times ? `${column.fullLabel} : ${times}` : undefined}
              className="px-0.5"
            >
              <span
                className={cn(
                  "block h-6 rounded",
                  times ? "bg-brand-foreground" : "bg-white/10"
                )}
              />
            </span>
          );
        })}
      </span>
    </Link>
  );
}

function EmptyWeek({ nextSession }: { nextSession: NextSessionHint | null }) {
  return (
    <p className="text-brand-foreground/85 mt-5 max-w-prose">
      Aucun créneau prévu cette semaine.
      {nextSession && (
        <>
          {" "}
          Prochaine session :{" "}
          <Link
            href={`/admin/training/sessions/${nextSession.id}`}
            className="text-brand-foreground font-semibold underline underline-offset-4"
          >
            {nextSession.title}
          </Link>
          , le {dayjs.utc(nextSession.startDate).locale("fr").format("D MMMM")}.
        </>
      )}
    </p>
  );
}
