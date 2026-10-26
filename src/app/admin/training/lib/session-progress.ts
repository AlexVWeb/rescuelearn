import {
  EMARGEMENT_STATUS,
  INSCRIPTION_STATUS,
  SESSION_STATUS,
  type Inscription,
  type Slot,
} from "../types";
import { isCountedInscription } from "./group-rules";

// La page session est organisée par phase du cycle de vie de la formation
export const SESSION_PHASES = {
  prepare: {
    label: "Préparer",
    sections: {
      programme: "Programme",
      stagiaires: "Stagiaires",
      groupes: "Groupes",
      supports: "Supports",
    },
  },
  animate: {
    label: "Animer",
    sections: { emargement: "Émargement" },
  },
  close: {
    label: "Clôturer",
    sections: {
      resultats: "Résultats",
      documents: "Documents",
      evaluations: "Évaluations",
    },
  },
} as const;

export type SessionPhase = keyof typeof SESSION_PHASES;
export type SessionSection = {
  [P in SessionPhase]: keyof (typeof SESSION_PHASES)[P]["sections"];
}[SessionPhase];

export interface SessionView {
  phase: SessionPhase;
  section: SessionSection;
}

// Anciens liens `?tab=` (avant la navigation par phase)
const LEGACY_TABS: Record<string, SessionView> = {
  slots: { phase: "prepare", section: "programme" },
  inscriptions: { phase: "prepare", section: "stagiaires" },
  groups: { phase: "prepare", section: "groupes" },
  emargement: { phase: "animate", section: "emargement" },
  formation: { phase: "close", section: "resultats" },
};

function isPhase(value: string | null): value is SessionPhase {
  return !!value && value in SESSION_PHASES;
}

/** Sections d'une phase, sans celles masquées (module d'organisme inactif). */
export function sectionsOf(
  phase: SessionPhase,
  hidden: readonly SessionSection[] = []
): SessionSection[] {
  return (
    Object.keys(SESSION_PHASES[phase].sections) as SessionSection[]
  ).filter((s) => !hidden.includes(s));
}

export function defaultPhase(status: string): SessionPhase {
  if (status === SESSION_STATUS.EN_COURS) return "animate";
  if (status === SESSION_STATUS.TERMINEE) return "close";
  return "prepare";
}

export function resolveView(
  params: {
    phase?: string | null;
    section?: string | null;
    tab?: string | null;
  },
  status: string,
  hidden: readonly SessionSection[] = []
): SessionView {
  if (isPhase(params.phase ?? null)) {
    const phase = params.phase as SessionPhase;
    const sections = sectionsOf(phase, hidden);
    const section = sections.find((s) => s === params.section) ?? sections[0];
    return { phase, section };
  }
  const legacy = params.tab ? LEGACY_TABS[params.tab] : undefined;
  if (legacy) {
    return hidden.includes(legacy.section)
      ? { phase: legacy.phase, section: sectionsOf(legacy.phase, hidden)[0] }
      : legacy;
  }
  const phase = defaultPhase(status);
  return { phase, section: sectionsOf(phase, hidden)[0] };
}

export type OutcomeSuggestion = "suivie" | "a_verifier" | null;

/**
 * Suggestion d'issue à partir des émargements :
 * tous les créneaux validés → formation suivie, au moins une absence → à vérifier.
 */
export function suggestOutcome(
  inscription: Pick<Inscription, "emargements">,
  slots: Pick<Slot, "id">[]
): OutcomeSuggestion {
  if (slots.length === 0) return null;
  const bySlot = new Map(
    (inscription.emargements ?? []).map((e) => [e.slotId, e.status])
  );
  const statuses = slots.map((s) => bySlot.get(s.id));
  if (statuses.some((s) => s === EMARGEMENT_STATUS.ABSENT)) return "a_verifier";
  if (statuses.every((s) => s === EMARGEMENT_STATUS.VALIDE)) return "suivie";
  return null;
}

export function countValidatedEmargements(
  inscription: Pick<Inscription, "emargements">,
  slots: Pick<Slot, "id">[]
) {
  const slotIds = new Set(slots.map((s) => s.id));
  return (inscription.emargements ?? []).filter(
    (e) => slotIds.has(e.slotId) && e.status === EMARGEMENT_STATUS.VALIDE
  ).length;
}

export function hasOutcome(status: string) {
  return status !== INSCRIPTION_STATUS.INSCRIT;
}

export interface SessionProgress {
  prepare: {
    slotCount: number;
    inscriptionCount: number;
    groupWarningCount: number;
    ready: boolean;
  };
  animate: { validated: number; expected: number };
  close: { decided: number; total: number };
}

export function computeProgress({
  slots,
  inscriptions,
  groupWarningCount,
}: {
  slots: Pick<Slot, "id">[];
  inscriptions: Pick<Inscription, "status" | "emargements">[];
  groupWarningCount: number;
}): SessionProgress {
  const active = inscriptions.filter((i) => isCountedInscription(i.status));
  return {
    prepare: {
      slotCount: slots.length,
      inscriptionCount: inscriptions.length,
      groupWarningCount,
      ready:
        slots.length > 0 && inscriptions.length > 0 && groupWarningCount === 0,
    },
    animate: {
      validated: active.reduce(
        (sum, i) => sum + countValidatedEmargements(i, slots),
        0
      ),
      expected: active.length * slots.length,
    },
    close: {
      decided: inscriptions.filter((i) => hasOutcome(i.status)).length,
      total: inscriptions.length,
    },
  };
}

function toLocalDay(date: Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Créneau à mettre en avant pendant l'animation : celui en cours,
 * sinon le prochain de la journée (fuseau du navigateur).
 */
export function findCurrentSlotId(
  slots: Pick<Slot, "id" | "date" | "startTime" | "endTime">[],
  now: Date
): string | null {
  const today = toLocalDay(now);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todaySlots = slots
    .filter((s) => toLocalDay(s.date) === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const ongoing = todaySlots.find(
    (s) => s.startTime <= time && time < s.endTime
  );
  return (ongoing ?? todaySlots.find((s) => s.startTime > time))?.id ?? null;
}
