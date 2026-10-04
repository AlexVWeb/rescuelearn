import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  referenciel: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  referencielTopic: {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/services/referenciel-analysis.service", () => ({
  runReferencielAnalysis: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getUserContext } from "@/lib/context";
import { runReferencielAnalysis } from "@/services/referenciel-analysis.service";
import {
  startReferencielAnalysisAction,
  getReferencielAnalysisAction,
  updateReferencielTopicAction,
  setTopicValidatedAction,
  deleteReferencielTopicAction,
} from "@/app/actions/referenciel-topic-actions";

const mockUser = (roles: string[]) => {
  vi.mocked(getUserContext).mockResolvedValue({
    id: "user-1",
    roles,
  } as never);
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

describe("referenciel-topic-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser([UserRole.SUPER_ADMIN]);
    vi.mocked(runReferencielAnalysis).mockResolvedValue(undefined);
  });

  it("refuse les utilisateurs non SUPER_ADMIN", async () => {
    mockUser([UserRole.FORMATEUR]);
    expect(await startReferencielAnalysisAction(1)).toEqual({
      success: false,
      error: "Forbidden",
    });
    expect((await getReferencielAnalysisAction(1)).success).toBe(false);
    expect((await updateReferencielTopicAction("t1", {})).success).toBe(false);
    expect((await setTopicValidatedAction("t1", true)).success).toBe(false);
    expect((await deleteReferencielTopicAction("t1")).success).toBe(false);
    expect(mockPrisma.referenciel.update).not.toHaveBeenCalled();
  });

  describe("startReferencielAnalysisAction", () => {
    it("refuse un double lancement", async () => {
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        analysisStatus: "PROCESSING",
        analysisStartedAt: minutesAgo(2),
      });

      const res = await startReferencielAnalysisAction(1);

      expect(res).toEqual({ success: false, error: "Analyse déjà en cours" });
      expect(runReferencielAnalysis).not.toHaveBeenCalled();
    });

    it("relance une analyse périmée", async () => {
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        analysisStatus: "PROCESSING",
        analysisStartedAt: minutesAgo(30),
      });

      const res = await startReferencielAnalysisAction(1);

      expect(res.success).toBe(true);
      expect(runReferencielAnalysis).toHaveBeenCalledWith(1);
    });

    it("passe en PROCESSING et lance le service en arrière-plan", async () => {
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        analysisStatus: "NONE",
        analysisStartedAt: null,
      });

      const res = await startReferencielAnalysisAction(1);

      expect(res.success).toBe(true);
      expect(mockPrisma.referenciel.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          analysisStatus: "PROCESSING",
          analysisError: null,
          analysisDoneChapters: 0,
        }),
      });
      expect(runReferencielAnalysis).toHaveBeenCalledWith(1);
    });

    it("marque l'analyse en échec si le service plante", async () => {
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        analysisStatus: "DONE",
        analysisStartedAt: null,
      });
      vi.mocked(runReferencielAnalysis).mockRejectedValue(new Error("PDF KO"));

      await startReferencielAnalysisAction(1);
      await vi.waitFor(() =>
        expect(mockPrisma.referenciel.update).toHaveBeenLastCalledWith({
          where: { id: 1 },
          data: { analysisStatus: "FAILED", analysisError: "PDF KO" },
        })
      );
    });
  });

  describe("getReferencielAnalysisAction", () => {
    it("renvoie une analyse périmée comme interrompue", async () => {
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        analysisStatus: "PROCESSING",
        analysisStartedAt: minutesAgo(45),
        analysisError: null,
      });
      mockPrisma.referencielTopic.findMany.mockResolvedValue([]);

      const res = await getReferencielAnalysisAction(1);

      expect(res.success && res.data.referenciel).toMatchObject({
        analysisStatus: "FAILED",
        analysisError: "Analyse interrompue",
      });
    });

    it("renvoie les sujets triés avec leur couverture", async () => {
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        analysisStatus: "DONE",
        analysisStartedAt: minutesAgo(45),
      });
      mockPrisma.referencielTopic.findMany.mockResolvedValue([{ id: "t1" }]);

      const res = await getReferencielAnalysisAction(1);

      expect(res.success && res.data.topics).toEqual([{ id: "t1" }]);
      expect(mockPrisma.referencielTopic.findMany).toHaveBeenCalledWith({
        where: { referencielId: 1 },
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: {
              questions: true,
              progressionNodes: true,
              learningCards: true,
            },
          },
        },
      });
    });
  });

  describe("updateReferencielTopicAction", () => {
    it("force validated et filtre les niveaux", async () => {
      mockPrisma.referencielTopic.update.mockResolvedValue({
        id: "t1",
        referencielId: 1,
      });

      const res = await updateReferencielTopicAction("t1", {
        title: "Garrot",
        summary: "Résumé",
        keyPoints: ["A"],
        levels: ["PSE1", "INCONNU"],
        questionCapacity: 6,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.referencielTopic.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: {
          title: "Garrot",
          summary: "Résumé",
          keyPoints: ["A"],
          levels: ["PSE1"],
          questionCapacity: 6,
          validated: true,
        },
      });
    });

    it("rejette des données invalides", async () => {
      const res = await updateReferencielTopicAction("t1", { title: "" });
      expect(res).toEqual({ success: false, error: "Invalid parameters" });
    });
  });
});
