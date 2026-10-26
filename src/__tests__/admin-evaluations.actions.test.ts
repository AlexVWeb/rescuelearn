import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  trainingSession: { findFirst: vi.fn(), findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn().mockResolvedValue({ organismeId: "org-1" }),
}));
const mockModules = vi.hoisted(() => ({ isModuleActive: vi.fn() }));
vi.mock("@/lib/organisme-modules/service", () => mockModules);

import {
  getEvaluationQuality,
  getSessionEvaluations,
} from "@/app/admin/training/actions/evaluations";

const SLOTS = [
  {
    date: new Date("2026-10-21T00:00:00Z"),
    startTime: "13:30",
    endTime: "17:30",
  },
];

function inscription(
  emargement: string,
  responses: { type: string; version: string; answers: unknown }[] = []
) {
  return {
    trainee: { isAnonymized: false },
    emargements: [{ status: emargement }],
    evaluationResponses: responses,
  };
}

const hotAnswer = (nps: number) => ({
  type: "chaud",
  version: "chaud-v1",
  answers: { satisfaction_globale: 4, nps },
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T10:00:00Z"));
  mockPrisma.trainingSession.findFirst.mockReset();
  mockPrisma.trainingSession.findMany.mockClear();
  mockModules.isModuleActive.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getSessionEvaluations", () => {
  it("cherche la session dans l'organisme de l'utilisateur uniquement", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
    await expect(getSessionEvaluations("s1")).rejects.toThrow(
      "Session introuvable"
    );
    expect(mockPrisma.trainingSession.findFirst.mock.calls[0][0].where).toEqual(
      { id: "s1", organismeId: "org-1" }
    );
  });

  it("null pour une session sans créneau", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue({
      status: "planifiée",
      slots: [],
      inscriptions: [],
    });
    expect(await getSessionEvaluations("s1")).toBeNull();
  });

  it("masque le détail sous 5 réponses et ne compte que les présents", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue({
      status: "terminée",
      slots: SLOTS,
      inscriptions: [
        inscription("validé", [hotAnswer(10)]),
        inscription("validé"),
        // Absent : ni éligible ni compté, même avec une réponse
        inscription("absent", [hotAnswer(0)]),
      ],
    });

    const [hot, cold] = (await getSessionEvaluations("s1")) ?? [];
    expect(hot).toMatchObject({
      type: "chaud",
      state: "open",
      aggregates: {
        eligibleCount: 2,
        submittedCount: 1,
        responseRate: 0.5,
        detailed: false,
        questions: [],
      },
    });
    expect(cold).toMatchObject({ type: "froid", state: "upcoming" });
  });

  it("donne le détail à partir de 5 réponses de la version courante", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue({
      status: "terminée",
      slots: SLOTS,
      inscriptions: [
        ...[10, 9, 8, 6, 3].map((nps) =>
          inscription("validé", [hotAnswer(nps)])
        ),
        inscription("validé", [
          { type: "chaud", version: "chaud-v0", answers: { nps: 0 } },
        ]),
      ],
    });

    const [hot] = (await getSessionEvaluations("s1")) ?? [];
    expect(hot.aggregates.detailed).toBe(true);
    expect(hot.aggregates.submittedCount).toBe(5);
    expect(hot.aggregates.questions.find((q) => q.id === "nps")).toMatchObject({
      kind: "nps",
      score: 0,
    });
  });
});

describe("module évaluation inactif", () => {
  it("getSessionEvaluations renvoie null sans requête", async () => {
    mockModules.isModuleActive.mockResolvedValueOnce(false);
    expect(await getSessionEvaluations("s-1")).toBeNull();
    expect(mockModules.isModuleActive).toHaveBeenCalledWith(
      "org-1",
      "evaluation"
    );
    expect(mockPrisma.trainingSession.findFirst).not.toHaveBeenCalled();
  });

  it("getEvaluationQuality vide", async () => {
    mockModules.isModuleActive.mockResolvedValueOnce(false);
    const quality = await getEvaluationQuality();
    expect(quality.bySession).toEqual({});
    expect(mockPrisma.trainingSession.findMany).not.toHaveBeenCalled();
  });
});

describe("getEvaluationQuality", () => {
  it("ne lit que les sessions de l'organisme et les réponses soumises", async () => {
    mockPrisma.trainingSession.findMany.mockResolvedValue([]);
    const quality = await getEvaluationQuality();

    const query = mockPrisma.trainingSession.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ organismeId: "org-1" });
    expect(query.select.inscriptions.select.evaluationResponses.where).toEqual({
      status: "soumise",
    });
    expect(quality.bySession).toEqual({});
  });
});
