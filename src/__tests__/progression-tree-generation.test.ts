import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => {
  const client = {
    progressionTree: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    progressionNode: {
      deleteMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    progressionNodeExercise: { create: vi.fn(), deleteMany: vi.fn() },
    question: { create: vi.fn() },
    learningCard: { create: vi.fn() },
    quiz: { findFirst: vi.fn(), create: vi.fn() },
    referenciel: { findUnique: vi.fn() },
    referencielTopic: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? arg(client) : Promise.all(arg as unknown[])
  );
  return client;
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/gemini", () => ({
  generateProgressionNodeFromPdf: vi.fn(),
  generateEntireTreeFromPdf: vi.fn(),
}));

vi.mock("@/lib/referenciel-pdf", () => ({
  loadReferencielPdf: vi.fn().mockResolvedValue(new Uint8Array([9])),
}));

vi.mock("@/lib/pdf/document", () => ({
  extractPages: vi.fn().mockResolvedValue(new Uint8Array([1])),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { generateProgressionNodeFromPdf } from "@/lib/gemini";
import { extractPages } from "@/lib/pdf/document";
import { ProgressionAdminService } from "@/services/progression.service";

const topic = (id: string, chapter: string, order: number, extra = {}) => ({
  id,
  chapter,
  title: `Sujet ${id}`,
  summary: "Résumé.",
  keyPoints: ["Point"],
  pageStart: order * 2,
  pageEnd: order * 2 + 1,
  order,
  levels: ["PSE1"],
  questionCapacity: 6,
  ...extra,
});

const plan = [
  { title: "Hémorragies", topicIds: ["t1", "t2"] },
  { title: "DAE", topicIds: ["t3"] },
];

const processingTree = (overrides = {}) => ({
  id: "tree-1",
  level: "PSE1",
  referencielId: 5,
  generationStatus: "PROCESSING",
  generationPlan: plan,
  generationDone: 0,
  generationTotal: 2,
  generationError: null,
  ...overrides,
});

const aiLesson = {
  title: "Titre IA",
  description: "Description IA",
  exercises: [
    { type: "MICRO_COURSE", courseTitle: "Cours", courseContent: "# Cours" },
    {
      type: "QUIZ_QUESTION",
      questionText: "Question ?",
      options: ["juste", "faux 1", "faux 2", "faux 3"],
      correctAnswer: 0,
      explanation: "Parce que.",
    },
    {
      type: "FLASHCARD",
      flashcardTheme: "Thème",
      flashcardInfo: "Info",
      flashcardReference: "p.12",
    },
  ],
};

describe("ProgressionAdminService – génération depuis les sujets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 5,
      pdfUrl: "referenciels/pse.pdf",
    });
    mockPrisma.quiz.findFirst.mockResolvedValue({ id: 42 });
    mockPrisma.progressionNode.count.mockResolvedValue(3);
    mockPrisma.progressionNode.create.mockResolvedValue({ id: "node-1" });
    mockPrisma.question.create.mockResolvedValue({ id: 7 });
    mockPrisma.learningCard.create.mockResolvedValue({ id: 8 });
    mockPrisma.progressionTree.updateMany.mockResolvedValue({ count: 1 });
    vi.mocked(generateProgressionNodeFromPdf).mockResolvedValue(aiLesson);
  });

  describe("startTreeGenerationFromTopics", () => {
    it("planifie les nœuds, vide l'arbre et passe en PROCESSING", async () => {
      mockPrisma.progressionTree.findUnique.mockResolvedValue({
        id: "tree-1",
        level: "PSE1",
        generationStatus: "NONE",
      });
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t1", "Urgences", 1),
        topic("t2", "Urgences", 2),
        topic("t3", "Urgences", 3, { levels: ["PSE2"] }),
      ]);

      const result =
        await ProgressionAdminService.startTreeGenerationFromTopics({
          treeId: "tree-1",
          referencielId: 5,
        });

      expect(result).toEqual({ total: 1 });
      expect(mockPrisma.progressionNode.deleteMany).toHaveBeenCalledWith({
        where: { treeId: "tree-1" },
      });
      expect(mockPrisma.progressionTree.update).toHaveBeenCalledWith({
        where: { id: "tree-1" },
        data: expect.objectContaining({
          referencielId: 5,
          generationStatus: "PROCESSING",
          generationPlan: [{ title: "Urgences", topicIds: ["t1", "t2"] }],
          generationDone: 0,
          generationTotal: 1,
          generationError: null,
        }),
      });
    });

    it("refuse de relancer une génération en cours sans restart", async () => {
      mockPrisma.progressionTree.findUnique.mockResolvedValue(processingTree());

      await expect(
        ProgressionAdminService.startTreeGenerationFromTopics({
          treeId: "tree-1",
          referencielId: 5,
        })
      ).rejects.toThrow("Génération déjà en cours");
      expect(mockPrisma.progressionNode.deleteMany).not.toHaveBeenCalled();
    });

    it("échoue s'il n'y a aucun sujet pour le niveau", async () => {
      mockPrisma.progressionTree.findUnique.mockResolvedValue({
        id: "tree-1",
        level: "GQS",
        generationStatus: "NONE",
      });
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t1", "Urgences", 1),
      ]);

      await expect(
        ProgressionAdminService.startTreeGenerationFromTopics({
          treeId: "tree-1",
          referencielId: 5,
        })
      ).rejects.toThrow("Aucun sujet analysé pour le niveau GQS");
      expect(mockPrisma.progressionNode.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("generateNextTreeNode", () => {
    beforeEach(() => {
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t1", "Urgences", 1),
        topic("t2", "Urgences", 2),
      ]);
    });

    it("génère le nœud suivant à partir des pages de ses sujets", async () => {
      mockPrisma.progressionTree.findUnique
        .mockResolvedValueOnce(processingTree())
        .mockResolvedValueOnce(processingTree({ generationDone: 1 }));

      const result =
        await ProgressionAdminService.generateNextTreeNode("tree-1");

      // L'index est réservé avant la génération (pas de doublon entre onglets)
      expect(mockPrisma.progressionTree.updateMany).toHaveBeenCalledWith({
        where: {
          id: "tree-1",
          generationStatus: "PROCESSING",
          generationDone: 0,
        },
        data: { generationDone: 1 },
      });
      expect(extractPages).toHaveBeenCalledWith(new Uint8Array([9]), [
        { pageStart: 2, pageEnd: 5 },
      ]);
      expect(generateProgressionNodeFromPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf: new Uint8Array([1]),
          topic: "Hémorragies",
          level: "PSE1",
          topics: [
            expect.objectContaining({ id: "t1", title: "Sujet t1" }),
            expect.objectContaining({ id: "t2", title: "Sujet t2" }),
          ],
        })
      );
      expect(mockPrisma.progressionNode.create).toHaveBeenCalledWith({
        data: {
          treeId: "tree-1",
          title: "Hémorragies",
          description: "Description IA",
          xpReward: 100,
          order: 3,
          topics: { connect: [{ id: "t1" }, { id: "t2" }] },
        },
      });
      expect(result).toEqual({
        status: "PROCESSING",
        done: 1,
        total: 2,
        nodeTitle: "Hémorragies",
        error: undefined,
      });
    });

    it("enregistre les exercices avec une réponse en lettre et le sujet", async () => {
      mockPrisma.progressionTree.findUnique.mockResolvedValue(processingTree());

      await ProgressionAdminService.generateNextTreeNode("tree-1");

      const question = mockPrisma.question.create.mock.calls[0][0].data;
      expect(question).toMatchObject({
        quizId: 42,
        text: "Question ?",
        topicId: "t1",
      });
      const options = question.options.create.map(
        (o: { text: string }) => o.text
      );
      expect(
        options[["A", "B", "C", "D"].indexOf(question.correctAnswer)]
      ).toBe("juste");
      expect(
        mockPrisma.progressionNodeExercise.create.mock.calls.map(
          (c) => c[0].data
        )
      ).toEqual([
        expect.objectContaining({
          order: 0,
          type: "MICRO_COURSE",
          courseContent: "# Cours",
        }),
        expect.objectContaining({
          order: 1,
          type: "QUIZ_QUESTION",
          questionId: 7,
        }),
        expect.objectContaining({
          order: 2,
          type: "FLASHCARD",
          learningCardId: 8,
        }),
      ]);
    });

    it("note l'échec d'un nœud et continue", async () => {
      mockPrisma.progressionTree.findUnique
        .mockResolvedValueOnce(processingTree())
        .mockResolvedValueOnce(
          processingTree({ generationDone: 1, generationError: "x" })
        );
      vi.mocked(generateProgressionNodeFromPdf).mockRejectedValue(
        new Error("Gemini KO")
      );

      const result =
        await ProgressionAdminService.generateNextTreeNode("tree-1");

      expect(mockPrisma.progressionNode.create).not.toHaveBeenCalled();
      expect(mockPrisma.progressionTree.update).toHaveBeenCalledWith({
        where: { id: "tree-1" },
        data: { generationError: "Hémorragies : Gemini KO" },
      });
      expect(result.error).toBe("Gemini KO");
      expect(result.status).toBe("PROCESSING");
    });

    it("clôture en DONE après le dernier nœud sans erreur", async () => {
      mockPrisma.progressionTree.findUnique
        .mockResolvedValueOnce(processingTree({ generationDone: 1 }))
        .mockResolvedValueOnce(
          processingTree({ generationDone: 2, generationStatus: "DONE" })
        );
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t3", "Urgences", 3),
      ]);

      const result =
        await ProgressionAdminService.generateNextTreeNode("tree-1");

      expect(mockPrisma.progressionTree.update).toHaveBeenLastCalledWith({
        where: { id: "tree-1" },
        data: { generationStatus: "DONE" },
      });
      expect(result).toMatchObject({ status: "DONE", done: 2, total: 2 });
    });

    it("clôture en FAILED si des nœuds ont échoué", async () => {
      mockPrisma.progressionTree.findUnique
        .mockResolvedValueOnce(
          processingTree({ generationDone: 1, generationError: "DAE : KO" })
        )
        .mockResolvedValueOnce(
          processingTree({ generationDone: 2, generationStatus: "FAILED" })
        );
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t3", "Urgences", 3),
      ]);

      await ProgressionAdminService.generateNextTreeNode("tree-1");

      expect(mockPrisma.progressionTree.update).toHaveBeenLastCalledWith({
        where: { id: "tree-1" },
        data: { generationStatus: "FAILED" },
      });
    });

    it("ne génère rien si un autre appel a déjà pris le nœud", async () => {
      mockPrisma.progressionTree.findUnique.mockResolvedValue(processingTree());
      mockPrisma.progressionTree.updateMany.mockResolvedValue({ count: 0 });

      await ProgressionAdminService.generateNextTreeNode("tree-1");

      expect(generateProgressionNodeFromPdf).not.toHaveBeenCalled();
      expect(mockPrisma.progressionNode.create).not.toHaveBeenCalled();
    });

    it("ne fait rien si l'arbre n'est pas en cours de génération", async () => {
      mockPrisma.progressionTree.findUnique.mockResolvedValue(
        processingTree({ generationStatus: "DONE", generationDone: 2 })
      );

      const result =
        await ProgressionAdminService.generateNextTreeNode("tree-1");

      expect(mockPrisma.progressionTree.updateMany).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: "DONE", done: 2, total: 2 });
    });
  });

  describe("generateProgressionNodeWithAi (leçon unique)", () => {
    const structureConfig = {
      microCourseCount: 1,
      quizCount: 2,
      flashcardCount: 1,
    };

    it("cible les pages et le contexte des sujets choisis", async () => {
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t1", "Urgences", 1),
        topic("t2", "Urgences", 2),
      ]);

      await ProgressionAdminService.generateProgressionNodeWithAi({
        referencielId: 5,
        topicIds: ["t1", "t2"],
        level: "PSE1",
        structureConfig,
      });

      expect(mockPrisma.referencielTopic.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["t1", "t2"] }, referencielId: 5 },
        orderBy: { order: "asc" },
      });
      expect(extractPages).toHaveBeenCalledWith(new Uint8Array([9]), [
        { pageStart: 2, pageEnd: 5 },
      ]);
      expect(generateProgressionNodeFromPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf: new Uint8Array([1]),
          topic: "Sujet t1, Sujet t2",
          topics: [
            expect.objectContaining({ id: "t1" }),
            expect.objectContaining({ id: "t2" }),
          ],
        })
      );
    });

    it("refuse des sujets d'un autre référentiel", async () => {
      mockPrisma.referencielTopic.findMany.mockResolvedValue([
        topic("t1", "Urgences", 1),
      ]);

      await expect(
        ProgressionAdminService.generateProgressionNodeWithAi({
          referencielId: 5,
          topicIds: ["t1", "autre"],
          structureConfig,
        })
      ).rejects.toThrow("Sujets introuvables pour ce référentiel");
      expect(generateProgressionNodeFromPdf).not.toHaveBeenCalled();
    });

    it("garde le PDF complet en sujet libre", async () => {
      await ProgressionAdminService.generateProgressionNodeWithAi({
        referencielId: 5,
        topic: "Hémorragies",
        structureConfig,
      });

      expect(extractPages).not.toHaveBeenCalled();
      expect(generateProgressionNodeFromPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf: new Uint8Array([9]),
          topic: "Hémorragies",
          topics: undefined,
        })
      );
    });
  });

  describe("saveProgressionNodeExercises", () => {
    it("rattache les nouvelles questions et le nœud à leurs sujets", async () => {
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        tree: { level: "PSE1" },
      });

      await ProgressionAdminService.saveProgressionNodeExercises("node-1", [
        {
          type: "QUIZ_QUESTION",
          _newQuestion: {
            text: "Q ?",
            options: ["A", "B"],
            correctAnswer: "0",
            topicId: "t1",
          },
        },
      ]);

      expect(mockPrisma.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ text: "Q ?", topicId: "t1" }),
      });
      expect(mockPrisma.progressionNode.update).toHaveBeenCalledWith({
        where: { id: "node-1" },
        data: { topics: { connect: [{ id: "t1" }] } },
      });
    });
  });
});
