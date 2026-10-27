import dayjs from "dayjs";
import { SLOT_TIMEZONE } from "@/lib/slot-window";
import type { AttestationState } from "@/lib/trainee-attestation";
import type { EvaluationView } from "./evaluations/view";
import type { SlotView } from "./types";

// Logique d'affichage de la page de session, sans accès base : testable seule

export type SessionPhase = "before" | "during" | "after";

/**
 * « Après » dès la fermeture du dernier créneau, sans attendre la clôture par
 * l'organisme : le planning cède alors la place à l'évaluation et l'attestation.
 */
export function getSessionPhase({
  before,
  lastClosesAt,
  endDate,
  now,
}: {
  before: boolean;
  lastClosesAt: Date | null;
  endDate: Date | null;
  now: Date;
}): SessionPhase {
  if (before) return "before";
  if (lastClosesAt) return now > lastClosesAt ? "after" : "during";
  if (endDate) {
    // @db.Date à minuit UTC : fin du jour calendaire à Paris
    const day = dayjs.utc(endDate).format("YYYY-MM-DD");
    const endsAt = dayjs.tz(day, SLOT_TIMEZONE).add(1, "day").toDate();
    return now >= endsAt ? "after" : "during";
  }
  return "during";
}

export type NextAction =
  | { kind: "sign"; slot: SlotView }
  | { kind: "prepare" }
  | { kind: "evaluation"; evaluation: EvaluationView }
  | { kind: "attestation" }
  | { kind: "next-slot"; slot: SlotView };

/** La seule action mise en avant en haut de page, par ordre de priorité. */
export function getNextAction({
  phase,
  currentSlot,
  nextSlot,
  readiness,
  evaluations,
  attestation,
}: {
  phase: SessionPhase;
  currentSlot: SlotView | null;
  nextSlot: SlotView | null;
  readiness: { done: number; total: number };
  evaluations: EvaluationView[];
  attestation: AttestationState;
}): NextAction | null {
  if (currentSlot?.state === "open") return { kind: "sign", slot: currentSlot };
  if (phase === "before" && readiness.done < readiness.total) {
    return { kind: "prepare" };
  }
  const evaluation = evaluations.find(
    (view) => view.status === "todo" || view.status === "draft"
  );
  if (evaluation) return { kind: "evaluation", evaluation };
  // Créneau signé : la confirmation reste en tête jusqu'à la fin de la fenêtre
  if (currentSlot) return { kind: "sign", slot: currentSlot };
  if (attestation === "available") return { kind: "attestation" };
  if (phase !== "after" && nextSlot)
    return { kind: "next-slot", slot: nextSlot };
  return null;
}

export interface SessionStatus {
  tone: "upcoming" | "live" | "done";
  label: string;
}

/** `days` et `today` : jours calendaires à Paris, « YYYY-MM-DD », triés. */
export function getSessionStatus({
  phase,
  days,
  today,
}: {
  phase: SessionPhase;
  days: string[];
  today: string;
}): SessionStatus {
  if (phase === "after") return { tone: "done", label: "Formation terminée" };

  if (phase === "before") {
    if (days.length === 0) return { tone: "upcoming", label: "À venir" };
    const diff = dayjs.utc(days[0]).diff(dayjs.utc(today), "day");
    const label =
      diff <= 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : `Dans ${diff} jours`;
    return { tone: "upcoming", label };
  }

  const index = days.indexOf(today);
  return {
    tone: "live",
    label:
      days.length > 1 && index >= 0
        ? `En cours · jour ${index + 1} sur ${days.length}`
        : "En cours",
  };
}

export interface SlotDay {
  dayLabel: string;
  isToday: boolean;
  slots: SlotView[];
}

export function groupSlotsByDay(slots: SlotView[]): SlotDay[] {
  const days: SlotDay[] = [];
  for (const slot of slots) {
    const last = days.at(-1);
    if (last?.dayLabel === slot.dayLabel) last.slots.push(slot);
    else
      days.push({
        dayLabel: slot.dayLabel,
        isToday: slot.isToday,
        slots: [slot],
      });
  }
  return days;
}

export function attendanceSummary(slots: SlotView[]) {
  return {
    signed: slots.filter((slot) => slot.state === "signed").length,
    total: slots.length,
  };
}

interface ScheduleDay {
  dayLabel: string;
  ranges: string[];
}

/** Mêmes horaires chaque jour : « Du lun. 19 oct. au sam. 24 oct. » sur une ligne. */
export function summarizeSchedule(days: ScheduleDay[]): ScheduleDay[] {
  if (days.length < 2) return days;
  const key = days[0].ranges.join("|");
  if (days.some((day) => day.ranges.join("|") !== key)) return days;
  return [
    {
      dayLabel: `Du ${days[0].dayLabel} au ${days.at(-1)!.dayLabel}`,
      ranges: days[0].ranges,
    },
  ];
}

/** Ville d'une adresse complète (« … 69004 Lyon » → « Lyon ») ; sinon le lieu tel quel. */
export function shortLocation(location: string) {
  const city = location.match(/\b\d{5}\s+([^,\d]+)/)?.[1]?.trim();
  return city || location.trim();
}
