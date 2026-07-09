import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";

// --- Mocks ---
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  quiz: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
  getQuizzesAction,
  createQuizAction,
  updateQuizAction,
  deleteQuizAction,
} from "@/app/actions/quiz-actions";

describe("quiz-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = (user: { id: string } | null) => {
    const getSessionMock = auth.api.getSession as unknown as ReturnType<
      typeof vi.fn
    >;
    if (user) {
      getSessionMock.mockResolvedValue({ user });
    } else {
      getSessionMock.mockResolvedValue(null);
    }
  };

  describe("getQuizzesAction", () => {
    it("should return Unauthorized if not logged in", async () => {
      mockSession(null);
      const res = await getQuizzesAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should fetch quizzes successfully if logged in", async () => {
      mockSession({ id: "user-1" });
      mockPrisma.quiz.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Quiz 1",
          timePerQuestion: 30,
          passingScore: 70,
          modeRandom: false,
        },
      ]);
      mockPrisma.quiz.count.mockResolvedValue(1);

      const res = await getQuizzesAction(1, 10, "Quiz");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].title).toBe("Quiz 1");
    });
  });

  describe("createQuizAction", () => {
    it("should return Unauthorized if not logged in", async () => {
      mockSession(null);
      const res = await createQuizAction({
        title: "New Quiz",
        timePerQuestion: 30,
        passingScore: 70,
        modeRandom: false,
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should create quiz successfully if logged in", async () => {
      mockSession({ id: "user-1" });
      mockPrisma.quiz.create.mockResolvedValue({ id: 1 });

      const res = await createQuizAction({
        title: "New Quiz",
        timePerQuestion: 30,
        passingScore: 70,
        modeRandom: false,
      });
      expect(res.success).toBe(true);
      expect(mockPrisma.quiz.create).toHaveBeenCalledWith({
        data: {
          title: "New Quiz",
          timePerQuestion: 30,
          passingScore: 70,
          modeRandom: false,
          status: "PUBLISHED",
        },
      });
    });
  });

  describe("updateQuizAction", () => {
    it("should return Unauthorized if not logged in", async () => {
      mockSession(null);
      const res = await updateQuizAction(1, {
        title: "Updated Title",
        timePerQuestion: 30,
        passingScore: 70,
        modeRandom: false,
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should update quiz successfully if logged in", async () => {
      mockSession({ id: "user-1" });
      mockPrisma.quiz.update.mockResolvedValue({ id: 1 });

      const res = await updateQuizAction(1, {
        title: "Updated Title",
        timePerQuestion: 30,
        passingScore: 70,
        modeRandom: false,
        status: "DRAFT",
      });
      expect(res.success).toBe(true);
      expect(mockPrisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: "Updated Title",
          timePerQuestion: 30,
          passingScore: 70,
          modeRandom: false,
          status: "DRAFT",
        },
      });
    });
  });

  describe("deleteQuizAction", () => {
    it("should return Unauthorized if not logged in", async () => {
      mockSession(null);
      const res = await deleteQuizAction(1);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("should delete quiz successfully if logged in", async () => {
      mockSession({ id: "user-1" });
      mockPrisma.quiz.delete.mockResolvedValue({ id: 1 });

      const res = await deleteQuizAction(1);
      expect(res.success).toBe(true);
      expect(mockPrisma.quiz.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
