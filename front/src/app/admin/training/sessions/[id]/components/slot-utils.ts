import dayjs from "dayjs";
import { Slot } from "../types";

export interface SlotSuggestion {
  label: string;
  startTime: string;
  endTime: string;
  date: string; // ISO format yyyy-MM-dd
}

export function getNextSlotSuggestion(
  slots: Slot[],
  sessionStartDate: Date | null,
  sessionEndDate: Date | null
): SlotSuggestion | null {
  // Par défaut, on commence à la date de début de session ou aujourd'hui
  const defaultDate = sessionStartDate
    ? dayjs(sessionStartDate).startOf("day").format("YYYY-MM-DD")
    : dayjs().startOf("day").format("YYYY-MM-DD");

  if (slots.length === 0) {
    return {
      label: "Jour 1 - Matin",
      date: defaultDate,
      startTime: "09:00",
      endTime: "12:30",
    };
  }

  // Trier les créneaux par date et heure de début
  const sortedSlots = [...slots].sort((a, b) => {
    const aDate = dayjs(a.date);
    const bDate = dayjs(b.date);
    if (!aDate.isSame(bDate, "day")) {
      return aDate.isBefore(bDate) ? -1 : 1;
    }
    return a.startTime.localeCompare(b.startTime);
  });

  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const lastSlotDate = dayjs(lastSlot.date).startOf("day");
  const lastSlotDateStr = lastSlotDate.format("YYYY-MM-DD");

  // Compter combien de créneaux on a pour cette dernière date
  const slotsOnLastDate = sortedSlots.filter((s) =>
    dayjs(s.date).startOf("day").isSame(lastSlotDate, "day")
  );

  // Si on a déjà un créneau le matin (avant 13h), on propose l'après-midi
  const hasMorning = slotsOnLastDate.some(
    (s) => parseInt(s.startTime.split(":")[0]) < 13
  );
  const hasAfternoon = slotsOnLastDate.some(
    (s) => parseInt(s.startTime.split(":")[0]) >= 13
  );

  if (hasMorning && !hasAfternoon) {
    const dayNumber = Math.ceil(sortedSlots.length / 2) || 1;
    return {
      label: `Jour ${dayNumber} - Après-midi`,
      date: lastSlotDateStr,
      startTime: "13:30",
      endTime: "17:00",
    };
  }

  // Si on dépasse la date de fin, on propose quand même une date, mais sans limitation
  // pour permettre à l'utilisateur de s'étendre
  const nextDate = lastSlotDate.add(1, "day");
  const nextDateStr = nextDate.format("YYYY-MM-DD");
  const nextDayNumber = Math.floor(sortedSlots.length / 2) + 1;

  return {
    label: `Jour ${nextDayNumber} - Matin`,
    date: nextDateStr,
    startTime: "09:00",
    endTime: "12:30",
  };
}

export function isDateWithinSession(
  dateStr: string,
  sessionStartDate: Date | null,
  sessionEndDate: Date | null
): boolean {
  if (!sessionStartDate || !sessionEndDate) return true;

  const date = dayjs(dateStr).startOf("day");
  const start = dayjs(sessionStartDate).startOf("day");
  const end = dayjs(sessionEndDate).startOf("day");

  return (
    (date.isSame(start) || date.isAfter(start)) &&
    (date.isSame(end) || date.isBefore(end))
  );
}
