import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/fr";
import { SLOT_TIMEZONE } from "@/lib/slot-window";
import { formatTimeLabel } from "@/app/espace/lib/format";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Fenêtre de l'agenda du tableau de bord, aujourd'hui compris */
export const AGENDA_DAYS = 7;
/** Une session qui démarre dans ce délai avec peu d'inscrits est signalée */
export const LOW_FILL_HORIZON_DAYS = 14;
const LOW_FILL_RATIO = 0.5;

export interface AgendaSlotRow {
  date: Date;
  startTime: string;
  endTime: string;
  session: {
    id: string;
    title: string;
    type: string;
    location: string;
    maxTrainees: number;
    enrolled: number;
  };
}

/** Un jour de la frise : « dim. » + « 1 » */
export interface AgendaColumn {
  key: string;
  weekday: string;
  dayNumber: string;
  /** « dimanche 1 novembre », pour les lecteurs d'écran */
  fullLabel: string;
  isToday: boolean;
}

/** Une session sur la semaine, une seule ligne quel que soit le nombre de jours */
export interface AgendaRow {
  sessionId: string;
  title: string;
  type: string;
  location: string;
  maxTrainees: number;
  enrolled: number;
  /** Horaires de chaque colonne, null si la session n'a pas lieu ce jour */
  dayTimes: (string | null)[];
  /** Horaires communs à tous ses jours, null s'ils varient */
  schedule: string | null;
}

export interface WeekAgenda {
  columns: AgendaColumn[];
  rows: AgendaRow[];
}

/** Jour calendaire à Paris, « 2026-10-31 » : le serveur tourne en UTC */
export function parisDayKey(now: Date = new Date()): string {
  return dayjs(now).tz(SLOT_TIMEZONE).format("YYYY-MM-DD");
}

/** Bornes des @db.Date (minuit UTC) couvrant `days` jours depuis aujourd'hui */
export function dayRange(now: Date = new Date(), days: number = AGENDA_DAYS) {
  const start = dayjs.utc(parisDayKey(now));
  return { start: start.toDate(), end: start.add(days, "day").toDate() };
}

const timeRange = (start: string, end: string) =>
  `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;

export function agendaColumns(
  todayKey: string,
  days: number = AGENDA_DAYS
): AgendaColumn[] {
  return Array.from({ length: days }, (_, i) => {
    const day = dayjs.utc(todayKey).add(i, "day").locale("fr");
    return {
      key: day.format("YYYY-MM-DD"),
      weekday: day.format("ddd"),
      dayNumber: day.format("D"),
      fullLabel: day.format("dddd D MMMM"),
      isToday: i === 0,
    };
  });
}

/**
 * Une ligne par session, une colonne par jour. Les créneaux en double (même
 * horaire le même jour) ne comptent qu'une fois.
 */
export function buildWeekAgenda(
  slots: AgendaSlotRow[],
  todayKey: string,
  days: number = AGENDA_DAYS
): WeekAgenda {
  const columns = agendaColumns(todayKey, days);
  const columnIndex = new Map(columns.map((c, i) => [c.key, i]));

  const sorted = [...slots].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.startTime.localeCompare(b.startTime)
  );

  const rows = new Map<string, { row: AgendaRow; ranges: Set<string>[] }>();
  for (const slot of sorted) {
    const index = columnIndex.get(dayjs.utc(slot.date).format("YYYY-MM-DD"));
    if (index === undefined) continue;

    let entry = rows.get(slot.session.id);
    if (!entry) {
      entry = {
        row: {
          sessionId: slot.session.id,
          title: slot.session.title,
          type: slot.session.type,
          location: slot.session.location,
          maxTrainees: slot.session.maxTrainees,
          enrolled: slot.session.enrolled,
          dayTimes: columns.map(() => null),
          schedule: null,
        },
        ranges: columns.map(() => new Set<string>()),
      };
      rows.set(slot.session.id, entry);
    }
    entry.ranges[index].add(timeRange(slot.startTime, slot.endTime));
  }

  return {
    columns,
    rows: Array.from(rows.values(), ({ row, ranges }) => {
      const dayTimes = ranges.map((set) =>
        set.size > 0 ? Array.from(set).join(", ") : null
      );
      const distinct = new Set(dayTimes.filter((t) => t !== null));
      return {
        ...row,
        dayTimes,
        schedule: distinct.size === 1 ? Array.from(distinct)[0] : null,
      };
    }),
  };
}

export function isLowFill(enrolled: number, maxTrainees: number): boolean {
  return maxTrainees > 0 && enrolled < maxTrainees * LOW_FILL_RATIO;
}

export interface OverdueSessionRow {
  id: string;
  title: string;
  endDate: Date;
  /** Inscrits sans résultat acquis / non acquis */
  missingResults: number;
}

export interface LowFillSessionRow {
  id: string;
  title: string;
  startDate: Date;
  enrolled: number;
  maxTrainees: number;
}

export type DashboardTodoKind = "close" | "fill";

export interface DashboardTodo {
  id: string;
  kind: DashboardTodoKind;
  title: string;
  detail: string;
  href: string;
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? "s" : ""}`;

const dayMonth = (date: Date) => dayjs.utc(date).locale("fr").format("D MMMM");

const sessionHref = (id: string, phase: string, section: string) =>
  `/admin/training/sessions/${id}?phase=${phase}&section=${section}`;

/**
 * Ce que l'organisme doit faire : clôturer les sessions passées d'abord
 * (résultats, attestations), puis remplir celles qui approchent.
 */
export function buildTodos(
  overdue: OverdueSessionRow[],
  lowFill: LowFillSessionRow[]
): DashboardTodo[] {
  const close = overdue.map<DashboardTodo>((session) => ({
    id: `close-${session.id}`,
    kind: "close",
    title: session.title,
    detail:
      session.missingResults > 0
        ? `Terminée le ${dayMonth(session.endDate)}, ${plural(session.missingResults, "stagiaire")} sans résultat`
        : `Terminée le ${dayMonth(session.endDate)}, prête à être clôturée`,
    href: sessionHref(session.id, "close", "resultats"),
  }));

  const fill = lowFill
    .filter((session) => isLowFill(session.enrolled, session.maxTrainees))
    .map<DashboardTodo>((session) => ({
      id: `fill-${session.id}`,
      kind: "fill",
      title: session.title,
      detail: `Débute le ${dayMonth(session.startDate)}, ${session.enrolled} inscrit${session.enrolled > 1 ? "s" : ""} sur ${session.maxTrainees} places`,
      href: sessionHref(session.id, "prepare", "stagiaires"),
    }));

  return [...close, ...fill];
}

/** Sessions datées d'abord, de la plus proche à la plus lointaine */
export function sortByStartDate<T extends { startDate: Date | null }>(
  sessions: T[]
): T[] {
  return [...sessions].sort((a, b) => {
    if (!a.startDate) return b.startDate ? 1 : 0;
    if (!b.startDate) return -1;
    return a.startDate.getTime() - b.startDate.getTime();
  });
}
