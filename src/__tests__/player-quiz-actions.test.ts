import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

const mockGetSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  question: {
    findUnique: vi.fn(),
  },
  dailyQuestionAnswer: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
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

import {
  submitDailyQuestionAnswerAction,
  getDailyQuestionStatsAction,
  getQuestionForPlayerAction,
} from "@/app/actions/player-quiz-actions";

describe("Player Quiz Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitDailyQuestionAnswerAction", () => {
    it("fails if not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await submitDailyQuestionAnswerAction({
        questionId: 1,
        optionIndex: "0",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("fails on validation error", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

      const res = await submitDailyQuestionAnswerAction({
        questionId: "invalid-id",
        optionIndex: "0",
      });

      expect(res.success).toBe(false);
    });

    it("fails if question does not exist", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(mockPrisma.question.findUnique).mockResolvedValue(null);

      const res = await submitDailyQuestionAnswerAction({
        questionId: 99,
        optionIndex: "0",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Question introuvable.");
    });

    it("returns previous result if already answered", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(mockPrisma.question.findUnique).mockResolvedValue({
        id: 1,
        correctAnswer: "B",
        explanation: "Some explanation",
      } as unknown as never);

      vi.mocked(mockPrisma.dailyQuestionAnswer.findFirst).mockResolvedValue({
        id: "ans-1",
        userId: "user-1",
        questionId: 1,
        isCorrect: true,
      } as unknown as never);

      const res = await submitDailyQuestionAnswerAction({
        questionId: 1,
        optionIndex: "1",
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        isCorrect: true,
        correctAnswer: "1",
        explanation: "Some explanation",
        alreadyAnswered: true,
      });
      expect(mockPrisma.dailyQuestionAnswer.create).not.toHaveBeenCalled();
    });

    it("submits correct answer successfully", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", email: "player@example.com" },
      });
      vi.mocked(mockPrisma.question.findUnique).mockResolvedValue({
        id: 1,
        correctAnswer: "A",
        explanation: "Some explanation",
        tags: ["hemorragie"],
      } as unknown as never);
      vi.mocked(mockPrisma.dailyQuestionAnswer.findFirst).mockResolvedValue(
        null
      );
      vi.mocked(mockPrisma.dailyQuestionAnswer.create).mockResolvedValue(
        {} as unknown as never
      );

      const res = await submitDailyQuestionAnswerAction({
        questionId: 1,
        optionIndex: "0",
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        isCorrect: true,
        correctAnswer: "0",
        explanation: "Some explanation",
        alreadyAnswered: false,
      });
      expect(mockPrisma.dailyQuestionAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          questionId: 1,
          isCorrect: true,
          tags: ["hemorragie"],
        },
      });
    });

    it("submits incorrect answer successfully", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", email: "player@example.com" },
      });
      vi.mocked(mockPrisma.question.findUnique).mockResolvedValue({
        id: 1,
        correctAnswer: "A",
        explanation: "Some explanation",
        tags: ["hemorragie"],
      } as unknown as never);
      vi.mocked(mockPrisma.dailyQuestionAnswer.findFirst).mockResolvedValue(
        null
      );
      vi.mocked(mockPrisma.dailyQuestionAnswer.create).mockResolvedValue(
        {} as unknown as never
      );

      const res = await submitDailyQuestionAnswerAction({
        questionId: 1,
        optionIndex: "2",
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        isCorrect: false,
        correctAnswer: "0",
        explanation: "Some explanation",
        alreadyAnswered: false,
      });
      expect(mockPrisma.dailyQuestionAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          questionId: 1,
          isCorrect: false,
          tags: ["hemorragie"],
        },
      });
    });
  });

  describe("getDailyQuestionStatsAction", () => {
    it("fails if not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await getDailyQuestionStatsAction();

      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("returns correct stats and tag aggregates", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(mockPrisma.dailyQuestionAnswer.findMany).mockResolvedValue([
        { isCorrect: true, tags: ["tag1", "tag2"] },
        { isCorrect: false, tags: ["tag1"] },
        { isCorrect: true, tags: ["tag2"] },
      ] as unknown as never);

      const res = await getDailyQuestionStatsAction();

      expect(res.success).toBe(true);
      expect(res.data?.total).toBe(3);
      expect(res.data?.correct).toBe(2);
      expect(res.data?.successRate).toBe(67);
      expect(res.data?.tagStats).toEqual(
        expect.arrayContaining([
          { tag: "tag1", total: 2, correct: 1, rate: 50 },
          { tag: "tag2", total: 2, correct: 2, rate: 100 },
        ])
      );
    });
  });

  describe("getQuestionForPlayerAction", () => {
    it("fails if not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await getQuestionForPlayerAction(1);

      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("returns question without correctAnswer and with custom options structure", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(mockPrisma.question.findUnique).mockResolvedValue({
        id: 1,
        text: "What is this?",
        options: [
          { id: 10, text: "Opt 1" },
          { id: 11, text: "Opt 2" },
        ],
      } as unknown as never);

      const res = await getQuestionForPlayerAction(1);

      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        id: 1,
        text: "What is this?",
        options: [
          { id: 10, text: "Opt 1" },
          { id: 11, text: "Opt 2" },
        ],
      });
      // Ensure correctAnswer is not in select
      expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          text: true,
          options: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      });
    });
  });
});
