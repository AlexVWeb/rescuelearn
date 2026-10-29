import { describe, it, expect } from "vitest";
import type { EvaluationView } from "./evaluations/view";
import type { SlotView } from "./types";
import {
  attendanceSummary,
  getNextAction,
  getSessionPhase,
  getSessionStatus,
  groupSlotsByDay,
  shortLocation,
  summarizeSchedule,
} from "./view-model";

function slot(overrides: Partial<SlotView> = {}): SlotView {
  return {
    id: "s1",
    label: "Jour 1 - Matin",
    dayLabel: "lun. 19 oct.",
    timeRange: "9h00–12h30",
    state: "upcoming",
    signedAtLabel: null,
    opensAtLabel: "8h45",
    isToday: false,
    ...overrides,
  };
}

function evaluation(overrides: Partial<EvaluationView> = {}): EvaluationView {
  return {
    type: "chaud",
    label: "Évaluation à chaud",
    status: "todo",
    dateLabel: "23 novembre",
    estimatedMinutes: 3,
    ...overrides,
  };
}

describe("getSessionPhase", () => {
  const now = new Date("2026-10-21T10:00:00Z");

  it("avant la session", () => {
    expect(
      getSessionPhase({ before: true, lastClosesAt: null, endDate: null, now })
    ).toBe("before");
  });

  it("pendant tant que le dernier créneau n'est pas fermé", () => {
    expect(
      getSessionPhase({
        before: false,
        lastClosesAt: new Date("2026-10-24T15:00:00Z"),
        endDate: null,
        now,
      })
    ).toBe("during");
  });

  it("après la fermeture du dernier créneau, même sans clôture", () => {
    expect(
      getSessionPhase({
        before: false,
        lastClosesAt: new Date("2026-10-21T09:59:00Z"),
        endDate: null,
        now,
      })
    ).toBe("after");
  });

  it("sans créneau : après la fin du dernier jour, à Paris", () => {
    const endDate = new Date("2026-10-21T00:00:00Z");
    expect(
      getSessionPhase({ before: false, lastClosesAt: null, endDate, now })
    ).toBe("during");
    expect(
      getSessionPhase({
        before: false,
        lastClosesAt: null,
        endDate,
        // 22 octobre, 0h30 à Paris
        now: new Date("2026-10-21T22:30:00Z"),
      })
    ).toBe("after");
  });
});

describe("getNextAction", () => {
  const base = {
    phase: "during" as const,
    currentSlot: null,
    nextSlot: null,
    readiness: { done: 0, total: 0 },
    evaluations: [],
    attestation: "pending" as const,
  };

  it("émarger passe avant tout", () => {
    const current = slot({ state: "open" });
    expect(
      getNextAction({
        ...base,
        currentSlot: current,
        evaluations: [evaluation()],
        attestation: "available",
      })
    ).toEqual({ kind: "sign", slot: current });
  });

  it("avant la session : préparer sa venue tant que tout n'est pas fait", () => {
    expect(
      getNextAction({
        ...base,
        phase: "before",
        readiness: { done: 2, total: 4 },
      })
    ).toEqual({ kind: "prepare" });
  });

  it("préparation terminée : rendez-vous au premier créneau", () => {
    const next = slot();
    expect(
      getNextAction({
        ...base,
        phase: "before",
        readiness: { done: 4, total: 4 },
        nextSlot: next,
      })
    ).toEqual({ kind: "next-slot", slot: next });
  });

  it("une évaluation à faire ou commencée passe avant l'attestation", () => {
    const draft = evaluation({ status: "draft" });
    expect(
      getNextAction({
        ...base,
        phase: "after",
        evaluations: [evaluation({ type: "froid", status: "upcoming" }), draft],
        attestation: "available",
      })
    ).toEqual({ kind: "evaluation", evaluation: draft });
  });

  it("créneau déjà signé : l'évaluation ouverte prend la place", () => {
    const todo = evaluation();
    expect(
      getNextAction({
        ...base,
        currentSlot: slot({ state: "signed" }),
        evaluations: [todo],
      })
    ).toEqual({ kind: "evaluation", evaluation: todo });
  });

  it("créneau signé sans autre tâche : la confirmation reste visible", () => {
    const signed = slot({ state: "signed", signedAtLabel: "9h04" });
    expect(getNextAction({ ...base, currentSlot: signed })).toEqual({
      kind: "sign",
      slot: signed,
    });
  });

  it("attestation disponible", () => {
    expect(
      getNextAction({
        ...base,
        phase: "after",
        evaluations: [evaluation({ status: "submitted" })],
        attestation: "available",
      })
    ).toEqual({ kind: "attestation" });
  });

  it("pendant la session, entre deux créneaux : le prochain", () => {
    const next = slot({ isToday: true });
    expect(getNextAction({ ...base, nextSlot: next })).toEqual({
      kind: "next-slot",
      slot: next,
    });
  });

  it("après la session, rien à faire", () => {
    expect(getNextAction({ ...base, phase: "after" })).toBeNull();
  });
});

describe("getSessionStatus", () => {
  const days = ["2026-10-19", "2026-10-20", "2026-10-21"];

  it("compte à rebours avant la session", () => {
    expect(
      getSessionStatus({ phase: "before", days, today: "2026-10-16" })
    ).toEqual({ tone: "upcoming", label: "Dans 3 jours" });
    expect(
      getSessionStatus({ phase: "before", days, today: "2026-10-18" }).label
    ).toBe("Demain");
    expect(
      getSessionStatus({ phase: "before", days, today: "2026-10-19" }).label
    ).toBe("Aujourd'hui");
    expect(
      getSessionStatus({ phase: "before", days: [], today: "2026-10-19" }).label
    ).toBe("À venir");
  });

  it("jour en cours sur une session de plusieurs jours", () => {
    expect(
      getSessionStatus({ phase: "during", days, today: "2026-10-20" })
    ).toEqual({ tone: "live", label: "En cours · jour 2 sur 3" });
  });

  it("en cours, sans numéro de jour quand il n'a pas de sens", () => {
    expect(
      getSessionStatus({
        phase: "during",
        days: ["2026-10-19"],
        today: "2026-10-19",
      }).label
    ).toBe("En cours");
    expect(
      getSessionStatus({ phase: "during", days, today: "2026-10-22" }).label
    ).toBe("En cours");
  });

  it("terminée", () => {
    expect(
      getSessionStatus({ phase: "after", days, today: "2026-10-26" })
    ).toEqual({ tone: "done", label: "Formation terminée" });
  });
});

describe("groupSlotsByDay / attendanceSummary", () => {
  const slots = [
    slot({ id: "a", state: "signed" }),
    slot({ id: "b", label: "Jour 1 - Après-midi", state: "missed" }),
    slot({ id: "c", dayLabel: "mar. 20 oct.", isToday: true, state: "open" }),
  ];

  it("regroupe les créneaux par jour, dans l'ordre", () => {
    expect(groupSlotsByDay(slots)).toEqual([
      { dayLabel: "lun. 19 oct.", isToday: false, slots: [slots[0], slots[1]] },
      { dayLabel: "mar. 20 oct.", isToday: true, slots: [slots[2]] },
    ]);
  });

  it("compte les créneaux signés", () => {
    expect(attendanceSummary(slots)).toEqual({ signed: 1, total: 3 });
  });
});

describe("summarizeSchedule", () => {
  const ranges = ["9h00–12h30", "13h30–17h00"];

  it("mêmes horaires chaque jour : une seule ligne", () => {
    expect(
      summarizeSchedule([
        { dayLabel: "lun. 19 oct.", ranges },
        { dayLabel: "mar. 20 oct.", ranges },
        { dayLabel: "mer. 21 oct.", ranges },
      ])
    ).toEqual([{ dayLabel: "Du lun. 19 oct. au mer. 21 oct.", ranges }]);
  });

  it("horaires différents ou jour unique : détail par jour", () => {
    const days = [
      { dayLabel: "lun. 19 oct.", ranges },
      { dayLabel: "mar. 20 oct.", ranges: ["9h00–12h30"] },
    ];
    expect(summarizeSchedule(days)).toEqual(days);
    expect(summarizeSchedule(days.slice(0, 1))).toEqual(days.slice(0, 1));
  });
});

describe("shortLocation", () => {
  it("garde la ville d'une adresse complète", () => {
    expect(
      shortLocation("Internat Adolphe Favre, Impasse Chazière 69004 Lyon")
    ).toBe("Lyon");
    expect(shortLocation("12 rue de la Paix, 75002 Paris, France")).toBe(
      "Paris"
    );
  });

  it("lieu libre : inchangé", () => {
    expect(shortLocation("  Chazière ")).toBe("Chazière");
  });
});
