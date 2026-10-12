import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { UserRole } from "@/lib/roles";

// --- Mocks ---
vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  progressionTree: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  progressionNode: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  progressionNodeExercise: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  progressionAttempt: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  progressionAttemptAnswer: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  playerProgress: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  playerVideoWatch: {
    findMany: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  referenciel: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((arg) => Promise.all(arg)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getUserContext } from "@/lib/context";
import {
  getProgressionTreesAction,
  createProgressionNodeAction,
} from "@/app/actions/progression-admin-actions";
import {
  getPlayerProgressionPathAction,
  getPlayerStatsAction,
  getProgressionStatsAction,
  answerExerciseAction,
  startProgressionNodeSessionAction,
  submitNodeCompletionAction,
  videoCheckpointAction,
} from "@/app/actions/progression-player-actions";

describe("progression server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = (
    roles: string[],
    onboardingExperience: string = "beginner"
  ) => {
    vi.mocked(getUserContext).mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      name: "Player One",
      roles,
      organismeId: null,
      firstName: "Player",
      lastName: "One",
      onboardingExperience,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>);
  };

  describe("Admin Actions", () => {
    it("should reject getProgressionTreesAction if user is not SUPER_ADMIN", async () => {
      mockUser([UserRole.PLAYER]);
      const res = await getProgressionTreesAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Action non autorisée.");
    });

    it("should successfully fetch trees if user is SUPER_ADMIN", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.progressionTree.findMany.mockResolvedValue([
        { id: "tree-1", level: "GQS", nodes: [] },
      ]);

      const res = await getProgressionTreesAction();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it("should successfully create a new node and append it at the end", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.progressionNode.count.mockResolvedValue(2);
      mockPrisma.progressionNode.create.mockResolvedValue({
        id: "node-3",
        title: "Massage Cardiaque",
        order: 2,
      });

      const res = await createProgressionNodeAction({
        treeId: "tree-1",
        title: "Massage Cardiaque",
        xpReward: 120,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.progressionNode.create).toHaveBeenCalledWith({
        data: {
          treeId: "tree-1",
          title: "Massage Cardiaque",
          description: undefined,
          xpReward: 120,
          order: 2,
        },
      });
    });
  });

  describe("Player Actions", () => {
    it("should load the correct progression tree based on onboarding experience", async () => {
      mockUser([UserRole.PLAYER], "intermediate"); // maps to PSC
      mockPrisma.progressionTree.findMany.mockResolvedValue([
        {
          id: "tree-psc",
          level: "PSC",
          nodes: [
            { id: "node-1", title: "Hémorragies", xpReward: 100 },
            { id: "node-2", title: "Garrot", xpReward: 100 },
          ],
        },
      ]);
      mockPrisma.playerProgress.findMany.mockResolvedValue([
        { nodeId: "node-1" },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        onboardingExperience: "intermediate",
        xp: 150,
        hearts: 5,
        streak: 3,
      });

      const res = await getPlayerProgressionPathAction();
      expect(res.success).toBe(true);
      expect(res.data?.level).toBe("PSC");
      expect(res.data?.nextLevel).toBe("PSE1");
      expect(res.data?.nodes[0].status).toBe("completed");
      expect(res.data?.nodes[1].status).toBe("current");
    });

    it("should load the PSE1 progression tree for professional onboarding experience", async () => {
      mockUser([UserRole.PLAYER], "professional"); // maps to PSE1
      mockPrisma.progressionTree.findMany.mockResolvedValue([
        {
          id: "tree-pse1",
          level: "PSE1",
          nodes: [{ id: "node-1", title: "Bilan", xpReward: 100 }],
        },
      ]);
      mockPrisma.playerProgress.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        onboardingExperience: "professional",
        xp: 0,
        hearts: 5,
        streak: 0,
      });

      const res = await getPlayerProgressionPathAction();
      expect(res.success).toBe(true);
      expect(res.data?.level).toBe("PSE1");
    });

    it("should move the player to the next level once the path is completed", async () => {
      mockUser([UserRole.PLAYER], "beginner"); // démarre en GQS
      mockPrisma.progressionTree.findMany.mockResolvedValue([
        {
          id: "tree-gqs",
          level: "GQS",
          nodes: [{ id: "gqs-1", title: "Alerter", xpReward: 100 }],
        },
        {
          id: "tree-psc",
          level: "PSC",
          nodes: [{ id: "psc-1", title: "Hémorragies", xpReward: 100 }],
        },
      ]);
      mockPrisma.playerProgress.findMany.mockResolvedValue([
        { nodeId: "gqs-1" },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        onboardingExperience: "beginner",
        xp: 100,
        hearts: 5,
        streak: 1,
      });

      const res = await getPlayerProgressionPathAction();
      expect(res.success).toBe(true);
      expect(res.data?.level).toBe("PSC");
      expect(res.data?.nextLevel).toBe("PSE1");
      expect(res.data?.nodes[0].status).toBe("current");
    });

    it("should compute progression stats on the player's tree only", async () => {
      mockUser([UserRole.PLAYER], "intermediate");
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        onboardingExperience: "intermediate",
      });
      mockPrisma.progressionTree.findMany.mockResolvedValue([
        {
          id: "tree-psc",
          level: "PSC",
          nodes: [
            { id: "node-1", title: "Hémorragies" },
            { id: "node-2", title: "Garrot" },
            { id: "node-3", title: "PLS" },
          ],
        },
      ]);
      mockPrisma.playerProgress.findMany.mockResolvedValue([
        { nodeId: "node-1", score: 100, completedAt: new Date(1000) },
        { nodeId: "node-2", score: 60, completedAt: new Date(2000) },
      ]);

      const res = await getProgressionStatsAction();
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        level: "PSC",
        nextLevel: "PSE1",
        completedNodes: 2,
        totalNodes: 3,
        averageScore: 80,
        lessons: [
          { nodeId: "node-2", title: "Garrot", score: 60 },
          { nodeId: "node-1", title: "Hémorragies", score: 100 },
        ],
      });
      expect(mockPrisma.playerProgress.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", node: { treeId: "tree-psc" } },
        select: { nodeId: true, score: true, completedAt: true },
      });
    });

    it("should return real stats and drop a broken streak", async () => {
      mockUser([UserRole.PLAYER]);
      mockPrisma.user.findUnique.mockResolvedValue({
        xp: 420,
        hearts: 5,
        heartsUpdatedAt: null,
        streak: 6,
        lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });

      const res = await getPlayerStatsAction();
      expect(res.success).toBe(true);
      expect(res.data).toMatchObject({
        xp: 420,
        hearts: 5,
        maxHearts: 5,
        nextHeartAt: null,
        streak: 0,
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should refuse to start a node without hearts", async () => {
      mockUser([UserRole.PLAYER]);
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        treeId: "tree-1",
        title: "Hémorragies",
        xpReward: 100,
        exercises: [],
      });
      mockPrisma.progressionNode.findMany.mockResolvedValue([{ id: "node-1" }]);
      mockPrisma.user.findUnique.mockResolvedValue({
        xp: 0,
        hearts: 0,
        heartsUpdatedAt: new Date(),
        streak: 0,
        lastActiveAt: null,
      });

      const res = await startProgressionNodeSessionAction("node-1");
      expect(res.success).toBe(false);
    });

    it("should start a node and expose current hearts", async () => {
      mockUser([UserRole.PLAYER]);
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        treeId: "tree-1",
        title: "Hémorragies",
        xpReward: 100,
        exercises: [],
      });
      mockPrisma.progressionNode.findMany.mockResolvedValue([{ id: "node-1" }]);
      mockPrisma.user.findUnique.mockResolvedValue({
        xp: 0,
        hearts: 3,
        heartsUpdatedAt: new Date(),
        streak: 0,
        lastActiveAt: null,
      });
      mockPrisma.progressionAttempt.create.mockResolvedValue({ id: "att-1" });

      const res = await startProgressionNodeSessionAction("node-1");
      expect(res.success).toBe(true);
      expect(res.data?.hearts).toBe(3);
      expect(res.data?.attemptId).toBe("att-1");
      expect(mockPrisma.progressionAttempt.create).toHaveBeenCalledWith({
        data: { userId: "user-1", nodeId: "node-1" },
      });
    });

    it("should not leak the correct answer when starting a node", async () => {
      mockUser([UserRole.PLAYER]);
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        treeId: "tree-1",
        title: "Hémorragies",
        xpReward: 100,
        exercises: [
          {
            id: "ex-1",
            type: "QUIZ_QUESTION",
            order: 0,
            question: {
              id: 1,
              text: "Question ?",
              correctAnswer: "B",
              explanation: "Parce que.",
              options: [
                { id: 1, text: "A" },
                { id: 2, text: "B" },
              ],
            },
          },
        ],
      });
      mockPrisma.progressionNode.findMany.mockResolvedValue([{ id: "node-1" }]);
      mockPrisma.user.findUnique.mockResolvedValue({
        hearts: 3,
        heartsUpdatedAt: new Date(),
        streak: 0,
        lastActiveAt: null,
      });
      mockPrisma.progressionAttempt.create.mockResolvedValue({ id: "att-1" });

      const res = await startProgressionNodeSessionAction("node-1");
      const serialized = JSON.stringify(res.data);
      expect(serialized).not.toContain("correctAnswer");
      expect(serialized).not.toContain("Parce que.");
    });
  });

  describe("Server-side scoring", () => {
    const quizNode = {
      id: "node-1",
      title: "Hémorragies",
      xpReward: 100,
      exercises: [
        { id: "ex-1", type: "QUIZ_QUESTION" },
        { id: "ex-2", type: "QUIZ_QUESTION" },
        { id: "ex-3", type: "MICRO_COURSE" },
      ],
    };

    const mockOpenAttempt = (userId = "user-1") => {
      mockPrisma.progressionAttempt.findUnique.mockResolvedValue({
        id: "att-1",
        userId,
        nodeId: "node-1",
        completedAt: null,
      });
    };

    const mockCompletion = (
      answers: { exerciseId: string; isCorrect: boolean }[]
    ) => {
      mockOpenAttempt();
      mockPrisma.progressionNode.findUnique.mockResolvedValue(quizNode);
      mockPrisma.progressionAttemptAnswer.findMany.mockResolvedValue(answers);
      mockPrisma.progressionAttempt.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "player@example.com",
        xp: 150,
        streak: 2,
        lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      mockPrisma.user.update.mockResolvedValue({ xp: 250, streak: 3 });
    };

    const uniqueViolation = () =>
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      });

    it("grants XP and stores the server-computed score on first completion", async () => {
      mockUser([UserRole.PLAYER]);
      mockCompletion([
        { exerciseId: "ex-1", isCorrect: true },
        { exerciseId: "ex-2", isCorrect: true },
      ]);

      const res = await submitNodeCompletionAction("att-1");
      expect(res.success).toBe(true);
      expect(res.data).toMatchObject({
        xpGained: 100,
        alreadyCompleted: false,
        score: 100,
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ xp: { increment: 100 }, streak: 3 }),
        })
      );
      expect(mockPrisma.playerProgress.create).toHaveBeenCalledWith({
        data: { userId: "user-1", nodeId: "node-1", score: 100 },
      });
    });

    it("computes the score from graded answers only", async () => {
      mockUser([UserRole.PLAYER]);
      mockCompletion([
        { exerciseId: "ex-1", isCorrect: true },
        { exerciseId: "ex-2", isCorrect: false },
      ]);

      const res = await submitNodeCompletionAction("att-1");
      expect(res.data?.score).toBe(50);
    });

    it("does not grant XP again when replaying a completed node", async () => {
      mockUser([UserRole.PLAYER]);
      mockCompletion([
        { exerciseId: "ex-1", isCorrect: true },
        { exerciseId: "ex-2", isCorrect: true },
      ]);
      mockPrisma.playerProgress.create.mockRejectedValueOnce(uniqueViolation());

      const res = await submitNodeCompletionAction("att-1");
      expect(res.success).toBe(true);
      expect(res.data?.xpGained).toBe(0);
      expect(res.data?.alreadyCompleted).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ xp: { increment: 0 } }),
        })
      );
      expect(mockPrisma.playerProgress.update).toHaveBeenCalledWith({
        where: { userId_nodeId: { userId: "user-1", nodeId: "node-1" } },
        data: { score: 100 },
      });
    });

    it("refuses to complete while questions are unanswered", async () => {
      mockUser([UserRole.PLAYER]);
      mockCompletion([{ exerciseId: "ex-1", isCorrect: true }]);

      const res = await submitNodeCompletionAction("att-1");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Toutes les questions doivent être répondues.");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("refuses to complete an attempt twice", async () => {
      mockUser([UserRole.PLAYER]);
      mockCompletion([
        { exerciseId: "ex-1", isCorrect: true },
        { exerciseId: "ex-2", isCorrect: true },
      ]);
      mockPrisma.progressionAttempt.updateMany.mockResolvedValue({ count: 0 });

      const res = await submitNodeCompletionAction("att-1");
      expect(res.success).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("refuses another player's attempt", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt("someone-else");

      const res = await submitNodeCompletionAction("att-1");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Tentative introuvable.");
    });

    const mockQuizExercise = (nodeId = "node-1") => {
      mockPrisma.progressionNodeExercise.findUnique.mockResolvedValue({
        id: "ex-1",
        nodeId,
        type: "QUIZ_QUESTION",
        question: { correctAnswer: "B", explanation: "Parce que." },
      });
    };

    it("grades a correct answer without losing a heart", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockQuizExercise();
      mockPrisma.user.findUnique.mockResolvedValue({
        hearts: 5,
        heartsUpdatedAt: null,
      });

      const res = await answerExerciseAction({
        attemptId: "att-1",
        exerciseId: "ex-1",
        optionIndex: 1,
      });
      expect(res.data).toEqual({
        isCorrect: true,
        correctAnswerIndex: 1,
        explanation: "Parce que.",
        hearts: 5,
      });
      expect(mockPrisma.progressionAttemptAnswer.create).toHaveBeenCalledWith({
        data: { attemptId: "att-1", exerciseId: "ex-1", isCorrect: true },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("removes a heart server-side on a wrong answer", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockQuizExercise();
      mockPrisma.user.findUnique.mockResolvedValue({
        hearts: 5,
        heartsUpdatedAt: null,
      });

      const res = await answerExerciseAction({
        attemptId: "att-1",
        exerciseId: "ex-1",
        optionIndex: 0,
      });
      expect(res.data?.isCorrect).toBe(false);
      expect(res.data?.hearts).toBe(4);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { hearts: 4, heartsUpdatedAt: expect.any(Date) },
      });
    });

    it("refuses a second answer to the same question", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockQuizExercise();
      mockPrisma.user.findUnique.mockResolvedValue({
        hearts: 5,
        heartsUpdatedAt: null,
      });
      mockPrisma.progressionAttemptAnswer.create.mockRejectedValueOnce(
        uniqueViolation()
      );

      const res = await answerExerciseAction({
        attemptId: "att-1",
        exerciseId: "ex-1",
        optionIndex: 0,
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Question déjà répondue.");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("refuses a question from another node", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockQuizExercise("node-2");

      const res = await answerExerciseAction({
        attemptId: "att-1",
        exerciseId: "ex-1",
        optionIndex: 1,
      });
      expect(res.success).toBe(false);
      expect(mockPrisma.progressionAttemptAnswer.create).not.toHaveBeenCalled();
    });

    it("refuses to answer without hearts", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockQuizExercise();
      mockPrisma.user.findUnique.mockResolvedValue({
        hearts: 0,
        heartsUpdatedAt: new Date(),
      });

      const res = await answerExerciseAction({
        attemptId: "att-1",
        exerciseId: "ex-1",
        optionIndex: 1,
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Plus de vies disponibles.");
    });
  });
  describe("Video checkpoints", () => {
    const mockOpenAttempt = () => {
      mockPrisma.progressionAttempt.findUnique.mockResolvedValue({
        id: "att-1",
        userId: "user-1",
        nodeId: "node-1",
        completedAt: null,
      });
    };

    const mockVideoExercise = (overrides = {}) => {
      mockPrisma.progressionNodeExercise.findUnique.mockResolvedValue({
        nodeId: "node-1",
        type: "VIDEO",
        videoDurationSec: 300,
        ...overrides,
      });
    };

    it("credits only the real elapsed time on a seek ahead", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockVideoExercise();
      const lastCheckpointAt = new Date(Date.now() - 15_000);
      mockPrisma.playerVideoWatch.upsert.mockResolvedValue({
        id: "watch-1",
        watchedSec: 30,
        lastCheckpointAt,
        completedAt: null,
      });
      mockPrisma.playerVideoWatch.updateMany.mockResolvedValue({ count: 1 });

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-v",
        position: 250,
      });
      expect(res.success).toBe(true);
      expect(res.data?.rejected).toBe(true);
      expect(res.data?.completed).toBe(false);
      expect(res.data?.watchedSec).toBeLessThanOrEqual(49);
      expect(mockPrisma.playerVideoWatch.updateMany).toHaveBeenCalledWith({
        where: { id: "watch-1", lastCheckpointAt },
        data: expect.objectContaining({ completedAt: null }),
      });
    });

    it("validates the video at the end", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockVideoExercise();
      mockPrisma.playerVideoWatch.upsert.mockResolvedValue({
        id: "watch-1",
        watchedSec: 290,
        lastCheckpointAt: new Date(Date.now() - 10_000),
        completedAt: null,
      });
      mockPrisma.playerVideoWatch.updateMany.mockResolvedValue({ count: 1 });

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-v",
        position: 300,
      });
      expect(res.data).toEqual({
        watchedSec: 300,
        completed: true,
        rejected: false,
      });
    });

    it("keeps an already validated video untouched", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockVideoExercise();
      mockPrisma.playerVideoWatch.upsert.mockResolvedValue({
        id: "watch-1",
        watchedSec: 300,
        lastCheckpointAt: new Date(),
        completedAt: new Date(),
      });

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-v",
        position: 10,
      });
      expect(res.data?.completed).toBe(true);
      expect(mockPrisma.playerVideoWatch.updateMany).not.toHaveBeenCalled();
    });

    it("returns the current state when a concurrent checkpoint won", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockVideoExercise();
      mockPrisma.playerVideoWatch.upsert.mockResolvedValue({
        id: "watch-1",
        watchedSec: 30,
        lastCheckpointAt: new Date(Date.now() - 15_000),
        completedAt: null,
      });
      mockPrisma.playerVideoWatch.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.playerVideoWatch.findUniqueOrThrow.mockResolvedValue({
        watchedSec: 45,
        completedAt: null,
      });

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-v",
        position: 45,
      });
      expect(res.data).toEqual({
        watchedSec: 45,
        completed: false,
        rejected: true,
      });
    });

    it("refuses a non-video exercise", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockVideoExercise({ type: "QUIZ_QUESTION" });

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-1",
        position: 10,
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Vidéo introuvable.");
      expect(mockPrisma.playerVideoWatch.upsert).not.toHaveBeenCalled();
    });

    it("refuses a video from another node", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockVideoExercise({ nodeId: "node-2" });

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-v",
        position: 10,
      });
      expect(res.success).toBe(false);
    });

    it("rejects an invalid position", async () => {
      mockUser([UserRole.PLAYER]);

      const res = await videoCheckpointAction({
        attemptId: "att-1",
        exerciseId: "ex-v",
        position: -5,
      });
      expect(res.success).toBe(false);
      expect(mockPrisma.progressionAttempt.findUnique).not.toHaveBeenCalled();
    });

    it("refuses to complete a node with an unwatched video", async () => {
      mockUser([UserRole.PLAYER]);
      mockOpenAttempt();
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        title: "Hémorragies",
        xpReward: 100,
        exercises: [
          {
            id: "ex-v",
            type: "VIDEO",
            videoYoutubeId: "dQw4w9WgXcQ",
            videoDurationSec: 300,
          },
        ],
      });
      mockPrisma.progressionAttemptAnswer.findMany.mockResolvedValue([]);
      mockPrisma.playerVideoWatch.count.mockResolvedValue(0);

      const res = await submitNodeCompletionAction("att-1");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Toutes les vidéos doivent être visionnées.");
      expect(mockPrisma.progressionAttempt.updateMany).not.toHaveBeenCalled();
    });

    it("exposes the resume position when starting a node", async () => {
      mockUser([UserRole.PLAYER]);
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        treeId: "tree-1",
        title: "Hémorragies",
        xpReward: 100,
        exercises: [
          {
            id: "ex-v",
            type: "VIDEO",
            order: 0,
            videoYoutubeId: "dQw4w9WgXcQ",
            videoTitle: "Le garrot",
            videoDurationSec: 300,
          },
        ],
      });
      mockPrisma.progressionNode.findMany.mockResolvedValue([{ id: "node-1" }]);
      mockPrisma.user.findUnique.mockResolvedValue({
        hearts: 3,
        heartsUpdatedAt: new Date(),
      });
      mockPrisma.progressionAttempt.create.mockResolvedValue({ id: "att-1" });
      mockPrisma.playerVideoWatch.findMany.mockResolvedValueOnce([
        { exerciseId: "ex-v", watchedSec: 120, completedAt: null },
      ]);

      const res = await startProgressionNodeSessionAction("node-1");
      expect(res.data?.exercises[0]).toEqual({
        id: "ex-v",
        type: "VIDEO",
        order: 0,
        video: {
          youtubeId: "dQw4w9WgXcQ",
          title: "Le garrot",
          durationSec: 300,
          watchedSec: 120,
          completed: false,
        },
      });
    });
  });
});
