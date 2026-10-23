import { describe, expect, it } from "vitest";
import {
  computeProgress,
  defaultPhase,
  findCurrentSlotId,
  resolveView,
  suggestOutcome,
} from "./session-progress";
import type { Emargement, EmargementStatus } from "../types";

const slots = [{ id: "s1" }, { id: "s2" }];

function emargements(
  ...entries: [string, EmargementStatus][]
): Pick<Emargement, "slotId" | "status">[] {
  return entries.map(([slotId, status]) => ({ slotId, status }));
}

describe("defaultPhase", () => {
  it("suit le statut de la session", () => {
    expect(defaultPhase("planifiée")).toBe("prepare");
    expect(defaultPhase("en_cours")).toBe("animate");
    expect(defaultPhase("terminée")).toBe("close");
    expect(defaultPhase("annulée")).toBe("prepare");
  });
});

describe("resolveView", () => {
  it("utilise la phase et la section de l'URL", () => {
    expect(
      resolveView({ phase: "prepare", section: "groupes" }, "en_cours")
    ).toEqual({ phase: "prepare", section: "groupes" });
  });

  it("retombe sur la première section si la section ne correspond pas à la phase", () => {
    expect(
      resolveView({ phase: "close", section: "groupes" }, "planifiée")
    ).toEqual({ phase: "close", section: "resultats" });
  });

  it("convertit les anciens paramètres ?tab=", () => {
    expect(resolveView({ tab: "formation" }, "planifiée")).toEqual({
      phase: "close",
      section: "resultats",
    });
    expect(resolveView({ tab: "slots" }, "terminée")).toEqual({
      phase: "prepare",
      section: "programme",
    });
  });

  it("choisit la phase selon le statut sans paramètre", () => {
    expect(resolveView({}, "en_cours")).toEqual({
      phase: "animate",
      section: "emargement",
    });
    expect(resolveView({ phase: "inconnue" }, "terminée")).toEqual({
      phase: "close",
      section: "resultats",
    });
  });
});

describe("suggestOutcome", () => {
  it("suggère « suivie » quand tous les créneaux sont validés", () => {
    expect(
      suggestOutcome(
        {
          emargements: emargements(
            ["s1", "validé"],
            ["s2", "validé"]
          ) as Emargement[],
        },
        slots
      )
    ).toBe("suivie");
  });

  it("demande une vérification dès une absence", () => {
    expect(
      suggestOutcome(
        {
          emargements: emargements(
            ["s1", "validé"],
            ["s2", "absent"]
          ) as Emargement[],
        },
        slots
      )
    ).toBe("a_verifier");
  });

  it("ne suggère rien tant que des créneaux sont en attente", () => {
    expect(
      suggestOutcome(
        { emargements: emargements(["s1", "validé"]) as Emargement[] },
        slots
      )
    ).toBeNull();
    expect(suggestOutcome({ emargements: [] }, [])).toBeNull();
  });
});

describe("computeProgress", () => {
  it("calcule les compteurs de chaque phase", () => {
    const progress = computeProgress({
      slots,
      groupWarningCount: 0,
      inscriptions: [
        {
          status: "présent",
          emargements: emargements(
            ["s1", "validé"],
            ["s2", "validé"]
          ) as Emargement[],
        },
        {
          status: "inscrit",
          emargements: emargements(
            ["s1", "validé"],
            ["s2", "absent"]
          ) as Emargement[],
        },
        // Un éliminé n'est plus attendu aux émargements
        {
          status: "éliminé",
          emargements: emargements(["s1", "validé"]) as Emargement[],
        },
      ],
    });

    expect(progress.prepare).toEqual({
      slotCount: 2,
      inscriptionCount: 3,
      groupWarningCount: 0,
      ready: true,
    });
    expect(progress.animate).toEqual({ validated: 3, expected: 4 });
    expect(progress.close).toEqual({ decided: 2, total: 3 });
  });

  it("n'est pas prête sans créneau ou avec des alertes de groupe", () => {
    expect(
      computeProgress({ slots: [], inscriptions: [], groupWarningCount: 0 })
        .prepare.ready
    ).toBe(false);
    expect(
      computeProgress({
        slots,
        inscriptions: [{ status: "inscrit", emargements: [] }],
        groupWarningCount: 1,
      }).prepare.ready
    ).toBe(false);
  });
});

describe("findCurrentSlotId", () => {
  const day = new Date(2026, 9, 13);
  const daySlots = [
    { id: "pm", date: day, startTime: "13:30", endTime: "17:00" },
    { id: "am", date: day, startTime: "09:00", endTime: "12:00" },
    {
      id: "veille",
      date: new Date(2026, 9, 12),
      startTime: "09:00",
      endTime: "17:00",
    },
  ];

  it("renvoie le créneau en cours", () => {
    expect(findCurrentSlotId(daySlots, new Date(2026, 9, 13, 10, 15))).toBe(
      "am"
    );
  });

  it("renvoie le prochain créneau de la journée entre deux créneaux", () => {
    expect(findCurrentSlotId(daySlots, new Date(2026, 9, 13, 12, 30))).toBe(
      "pm"
    );
  });

  it("ne renvoie rien après le dernier créneau ou un jour sans créneau", () => {
    expect(
      findCurrentSlotId(daySlots, new Date(2026, 9, 13, 18, 0))
    ).toBeNull();
    expect(
      findCurrentSlotId(daySlots, new Date(2026, 9, 20, 10, 0))
    ).toBeNull();
  });
});
