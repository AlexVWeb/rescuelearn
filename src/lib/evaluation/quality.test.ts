import { describe, it, expect } from "vitest";
import { buildEvaluationQuality, type QualitySessionInput } from "./quality";

// Fin de session : 21/10/2026 17h30 à Paris
const SLOTS = [
  {
    date: new Date("2026-10-21T00:00:00Z"),
    startTime: "13:30",
    endTime: "17:30",
  },
];
const DURING_HOT = new Date("2026-10-30T10:00:00Z");
const BETWEEN_WINDOWS = new Date("2026-12-15T10:00:00Z");
const DURING_COLD = new Date("2027-01-25T10:00:00Z");

type Response = { type: string; version: string; answers: unknown };

const hot = (satisfaction: number): Response => ({
  type: "chaud",
  version: "chaud-v1",
  answers: { satisfaction_globale: satisfaction },
});
const cold = (utilite: number): Response => ({
  type: "froid",
  version: "froid-v1",
  answers: { utilite },
});

function present(responses: Response[] = []) {
  return {
    trainee: { isAnonymized: false },
    emargements: [{ status: "validé" }],
    evaluationResponses: responses,
  };
}

const answering = (notes: number[], make = hot) =>
  notes.map((n) => present([make(n)]));

function session(
  id: string,
  inscriptions: QualitySessionInput["inscriptions"],
  overrides: Partial<QualitySessionInput> = {}
): QualitySessionInput {
  return {
    id,
    title: `Session ${id}`,
    status: "terminée",
    slots: SLOTS,
    inscriptions,
    ...overrides,
  };
}

describe("buildEvaluationQuality — par session", () => {
  it("part de satisfaits (notes 3 et 4) à partir de 5 réponses", () => {
    const { bySession } = buildEvaluationQuality(
      [session("s1", answering([4, 4, 3, 2, 1]))],
      DURING_HOT
    );
    expect(bySession.s1).toEqual({ count: 5, positive: 3, share: 0.6 });
  });

  it("sous le seuil : nombre de réponses, pas de pourcentage", () => {
    const { bySession } = buildEvaluationQuality(
      [session("s1", [...answering([1, 4]), present()])],
      DURING_HOT
    );
    expect(bySession.s1).toEqual({ count: 2, positive: 1, share: null });
  });

  it("aucune entrée pour une session sans réponse à chaud", () => {
    const { bySession } = buildEvaluationQuality(
      [session("s1", [present([cold(4)])])],
      DURING_COLD
    );
    expect(bySession).toEqual({});
  });

  it("ignore les réponses des stagiaires non présents", () => {
    const absent = {
      ...present([hot(1)]),
      emargements: [{ status: "absent" }],
    };
    const { bySession } = buildEvaluationQuality(
      [session("s1", [...answering([4, 4, 4, 4, 4]), absent])],
      DURING_HOT
    );
    expect(bySession.s1).toEqual({ count: 5, positive: 5, share: 1 });
  });
});

describe("buildEvaluationQuality — avis des stagiaires (12 mois)", () => {
  it("satisfaction et utilité en nombre de personnes", () => {
    const inscriptions = [
      present([hot(4), cold(4)]),
      present([hot(4), cold(3)]),
      present([hot(3), cold(3)]),
      present([hot(3), cold(2)]),
      present([hot(2), cold(4)]),
    ];
    const { overview } = buildEvaluationQuality(
      [session("s1", inscriptions)],
      DURING_COLD
    );
    expect(overview.satisfaction).toEqual({
      count: 5,
      positive: 4,
      share: 0.8,
    });
    expect(overview.usefulness).toEqual({ count: 5, positive: 4, share: 0.8 });
  });

  it("exclut les sessions de plus de 12 mois et celles pas encore finies", () => {
    const old = session("old", answering([1, 1, 1, 1, 1]), {
      slots: [{ ...SLOTS[0], date: new Date("2025-06-01T00:00:00Z") }],
    });
    const future = session("future", [present()], {
      slots: [{ ...SLOTS[0], date: new Date("2026-12-01T00:00:00Z") }],
    });
    const { overview } = buildEvaluationQuality([old, future], DURING_HOT);
    expect(overview.satisfaction.count).toBe(0);
  });
});

describe("buildEvaluationQuality — en attente de réponse", () => {
  const inscriptions = [present([hot(4)]), present(), present()];

  it("compte les présents sans réponse tant que la fenêtre est ouverte", () => {
    const { overview } = buildEvaluationQuality(
      [session("s1", inscriptions)],
      DURING_HOT
    );
    expect(overview.awaitingAnswer).toBe(2);
  });

  it("personne en attente entre les deux fenêtres", () => {
    const { overview } = buildEvaluationQuality(
      [session("s1", inscriptions)],
      BETWEEN_WINDOWS
    );
    expect(overview.awaitingAnswer).toBe(0);
  });

  it("pendant la fenêtre à froid, compte ceux sans réponse à froid", () => {
    const { overview } = buildEvaluationQuality(
      [session("s1", [present([hot(4), cold(4)]), present([hot(4)])])],
      DURING_COLD
    );
    expect(overview.awaitingAnswer).toBe(1);
  });
});

describe("buildEvaluationQuality — sessions à regarder", () => {
  it("signale dès qu'un stagiaire sur 4 n'est pas satisfait, la pire d'abord", () => {
    const sessions = [
      // 1 sur 5 = 20 % : pas signalée
      session("ok", answering([4, 4, 4, 3, 2])),
      // 2 sur 6 ≈ 33 %
      session("moyenne", answering([4, 4, 3, 3, 2, 1])),
      // 3 sur 5 = 60 %
      session("mauvaise", answering([1, 2, 2, 3, 4])),
      // Sous le seuil : jamais signalée, même avec des notes basses
      session("petite", answering([1, 1])),
    ];
    const { overview } = buildEvaluationQuality(sessions, DURING_HOT);
    expect(overview.sessionsToReview).toEqual([
      { id: "mauvaise", title: "Session mauvaise", dissatisfied: 3, count: 5 },
      { id: "moyenne", title: "Session moyenne", dissatisfied: 2, count: 6 },
    ]);
  });

  it("signale à partir de 25 % exactement", () => {
    const { overview } = buildEvaluationQuality(
      [session("limite", answering([4, 4, 4, 3, 3, 3, 1, 2]))],
      DURING_HOT
    );
    expect(overview.sessionsToReview.map((s) => s.id)).toEqual(["limite"]);
  });
});
