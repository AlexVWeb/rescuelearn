import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getSlotWindow, SLOT_TIMEZONE } from "@/lib/slot-window";

dayjs.extend(utc);
dayjs.extend(timezone);

// Kit d'accueil : calculs partagés par l'espace stagiaire et l'admin.
// Aucune dépendance serveur ici.

export interface ChecklistItem {
  id: string;
  label: string;
}

export const MAX_CHECKLIST_ITEMS = 20;
export const MAX_CHECKLIST_LABEL = 120;

/** JSON stocké → items valides ; tolère un contenu altéré. */
export function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: ChecklistItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, label } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof label !== "string") continue;
    const trimmed = label.trim();
    if (!id || !trimmed || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, label: trimmed.slice(0, MAX_CHECKLIST_LABEL) });
  }
  return items.slice(0, MAX_CHECKLIST_ITEMS);
}

/** `{ [id]: ISO date }` stocké en JSON → objet propre. */
export function parseDateMap(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function lines(text: string | null) {
  return (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolveToBring(
  kitToBring: string | null,
  sessionExtra: string | null
): string[] {
  return [...lines(kitToBring), ...lines(sessionExtra)];
}

const LAYOUT_SWITCH_MINUTES_BEFORE = 60;

// Le jour est calculé en UTC (@db.Date) avant l'interprétation à Paris :
// soustraire après coup décalerait d'une heure au changement d'heure.
function parisMidnight(date: Date, daysBefore = 0) {
  const day = dayjs.utc(date).subtract(daysBefore, "day").format("YYYY-MM-DD");
  return dayjs.tz(day, SLOT_TIMEZONE).toDate();
}

export function preReadVisibleFrom(
  startDate: Date | null,
  daysBefore: number | null
): Date | null {
  if (daysBefore === null || !startDate) return null;
  return parisMidnight(startDate, daysBefore);
}

interface SlotTiming {
  date: Date;
  startTime: string;
  endTime: string;
}

/** Avant la session, la page met le kit en tête ; ensuite, l'émargement. */
export function isBeforeSession(
  slots: SlotTiming[],
  startDate: Date | null,
  now: Date
): boolean {
  const firstStart = slots
    .map((slot) => getSlotWindow(slot).startsAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (firstStart) {
    const switchAt = new Date(
      firstStart.getTime() - LAYOUT_SWITCH_MINUTES_BEFORE * 60 * 1000
    );
    return now < switchAt;
  }
  if (startDate) return now < parisMidnight(startDate);
  return false;
}

export type ReadinessKind = "terms" | "preread" | "manual";

export interface ReadinessItem {
  id: string;
  label: string;
  kind: ReadinessKind;
  done: boolean;
}

export interface Readiness {
  done: number;
  total: number;
  items: ReadinessItem[];
}

export function readiness(input: {
  checklist: ChecklistItem[];
  checklistDone: Record<string, string>;
  hasTerms: boolean;
  termsAccepted: boolean;
  preReads: { id: string; title: string }[];
  prereadOpened: Record<string, string>;
}): Readiness {
  const items: ReadinessItem[] = [
    ...(input.hasTerms
      ? [
          {
            id: "terms",
            label: "Accepter les conditions générales",
            kind: "terms" as const,
            done: input.termsAccepted,
          },
        ]
      : []),
    ...input.preReads.map((doc) => ({
      id: `preread:${doc.id}`,
      label: `Lire « ${doc.title} »`,
      kind: "preread" as const,
      done: doc.id in input.prereadOpened,
    })),
    ...input.checklist.map((item) => ({
      id: item.id,
      label: item.label,
      kind: "manual" as const,
      done: item.id in input.checklistDone,
    })),
  ];
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
    items,
  };
}
