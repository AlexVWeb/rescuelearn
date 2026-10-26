import dayjs from "dayjs";
import { getSlotWindow, SLOT_TIMEZONE } from "@/lib/slot-window";
import type { EvaluationType } from "./questionnaires";

// Fenêtres d'ouverture calculées à la volée depuis la fin du dernier créneau.
// Les jours sont comptés en heure de Paris : J+30 tombe à la même heure
// locale que la fin de session, changement d'heure compris.

interface EvaluationSchedule {
  opensAfterDays: number;
  closesAfterDays: number;
  // Paliers d'envoi, en jours après la fin de session (le premier = invitation)
  reminderDays: readonly number[];
}

export const EVALUATION_SCHEDULE: Record<EvaluationType, EvaluationSchedule> = {
  chaud: { opensAfterDays: 0, closesAfterDays: 30, reminderDays: [0, 7, 23] },
  froid: {
    opensAfterDays: 90,
    closesAfterDays: 120,
    reminderDays: [90, 97, 113],
  },
};

export type EvaluationWindowState = "upcoming" | "open" | "closed";

export interface EvaluationWindow {
  opensAt: Date;
  closesAt: Date;
}

interface SlotTiming {
  date: Date;
  startTime: string;
  endTime: string;
}

/** Fin du dernier créneau, ou null pour une session sans créneau. */
export function getSessionEnd(slots: SlotTiming[]): Date | null {
  return slots.reduce<Date | null>((latest, slot) => {
    const { closesAt } = getSlotWindow(slot);
    return !latest || closesAt > latest ? closesAt : latest;
  }, null);
}

// `tz().add(n, "day")` garde le décalage UTC de départ : on ajoute les jours
// à l'heure murale de Paris, puis on la réinterprète dans le fuseau
function addParisDays(date: Date, days: number): Date {
  const wallClock = dayjs(date).tz(SLOT_TIMEZONE).format("YYYY-MM-DDTHH:mm:ss");
  const shifted = dayjs
    .utc(wallClock)
    .add(days, "day")
    .format("YYYY-MM-DDTHH:mm:ss");
  return dayjs.tz(shifted, SLOT_TIMEZONE).toDate();
}

export function getEvaluationWindow(
  type: EvaluationType,
  sessionEnd: Date
): EvaluationWindow {
  const schedule = EVALUATION_SCHEDULE[type];
  return {
    opensAt: addParisDays(sessionEnd, schedule.opensAfterDays),
    closesAt: addParisDays(sessionEnd, schedule.closesAfterDays),
  };
}

/** Bornes incluses : ouverte à `opensAt` comme à `closesAt`. */
export function getWindowState(
  window: EvaluationWindow,
  now: Date = new Date()
): EvaluationWindowState {
  if (now < window.opensAt) return "upcoming";
  if (now <= window.closesAt) return "open";
  return "closed";
}

export function reminderKind(type: EvaluationType, day: number): string {
  return `${type}-j${day}`;
}

/** Paliers d'un type, du premier au dernier. */
export function reminderKinds(type: EvaluationType): string[] {
  return EVALUATION_SCHEDULE[type].reminderDays.map((day) =>
    reminderKind(type, day)
  );
}

/**
 * Palier le plus récent atteint, tant que la fenêtre est ouverte. Après un
 * cron manqué, seul ce palier est dû : pas de rattrapage en rafale.
 */
export function getDueReminderKind(
  type: EvaluationType,
  sessionEnd: Date,
  now: Date = new Date()
): string | null {
  if (getWindowState(getEvaluationWindow(type, sessionEnd), now) !== "open") {
    return null;
  }
  const reached = EVALUATION_SCHEDULE[type].reminderDays.filter(
    (day) => addParisDays(sessionEnd, day) <= now
  );
  if (reached.length === 0) return null;
  return reminderKind(type, reached[reached.length - 1]);
}

/** Le palier dû est-il déjà couvert par un envoi de ce palier ou d'un suivant ? */
export function isReminderCovered(
  type: EvaluationType,
  dueKind: string,
  sentKinds: string[]
): boolean {
  const kinds = reminderKinds(type);
  const dueIndex = kinds.indexOf(dueKind);
  return sentKinds.some((kind) => kinds.indexOf(kind) >= dueIndex);
}
