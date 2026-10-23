import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { EMARGEMENT_STATUS } from "@/app/admin/training/types";

dayjs.extend(utc);
dayjs.extend(timezone);

// Les créneaux sont saisis en heure locale de la salle de formation.
// Le serveur tourne en UTC : on interprète donc explicitement en Europe/Paris.
export const SLOT_TIMEZONE = "Europe/Paris";
export const SLOT_OPENS_MINUTES_BEFORE = 15;

export type SlotState = "upcoming" | "open" | "signed" | "missed" | "absent";

interface SlotTiming {
  date: Date;
  startTime: string;
  endTime: string;
}

export function getSlotWindow(slot: SlotTiming) {
  // Slot.date est un @db.Date (minuit UTC) : on garde le jour calendaire UTC
  const day = dayjs.utc(slot.date).format("YYYY-MM-DD");
  const start = dayjs.tz(`${day}T${slot.startTime}`, SLOT_TIMEZONE);
  const end = dayjs.tz(`${day}T${slot.endTime}`, SLOT_TIMEZONE);

  return {
    startsAt: start.toDate(),
    opensAt: start.subtract(SLOT_OPENS_MINUTES_BEFORE, "minute").toDate(),
    closesAt: end.toDate(),
  };
}

export function getSlotState(
  slot: SlotTiming,
  emargementStatus: string | undefined,
  now: Date = new Date()
): SlotState {
  if (emargementStatus === EMARGEMENT_STATUS.VALIDE) return "signed";
  if (emargementStatus === EMARGEMENT_STATUS.ABSENT) return "absent";

  const { opensAt, closesAt } = getSlotWindow(slot);
  if (now < opensAt) return "upcoming";
  if (now <= closesAt) return "open";
  return "missed";
}

/** « 9h04 », en heure de Paris. */
export function formatParisTime(date: Date): string {
  return dayjs(date).tz(SLOT_TIMEZONE).format("H[h]mm");
}
