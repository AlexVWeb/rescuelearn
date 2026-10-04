import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/roles";

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
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
  },
  question: {
    createManyAndReturn: vi.fn(),
  },
  questionOption: {
    createMany: vi.fn(),
  },
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
  importQuizAction,
  getQuestionsAction,
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  getAllQuizzesSimpleAction,
} from "@/app/actions/quiz-actions";

describe("quiz-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = (
    user: { id: string } | null,
    roles: string[] = [UserRole.SUPER_ADMIN]
  ) => {
    const getSessionMock = auth.api.getSession as unknown as ReturnType<
      typeof vi.fn
    >;
    if (user) {
      getSessionMock.mockResolvedValue({ user });
      mockPrisma.user.findUnique.mockResolvedValue({ roles });
    } else {
      getSessionMock.mockResolvedValue(null);
    }
  };

  describe("authorization", () => {
    it("should forbid every quiz action to non SUPER_ADMIN users", async () => {
      mockSession({ id: "player-1" }, [UserRole.FORMATEUR]);
      const forbidden = { success: false, error: "Forbidden" };

      expect(await getQuizzesAction()).toEqual(forbidden);
      expect(await createQuizAction({ title: "Q" } as never)).toEqual(
        forbidden
      );
      expect(await updateQuizAction(1, { title: "Q" } as never)).toEqual(
        forbidden
      );
      expect(await deleteQuizAction(1)).toEqual(forbidden);
      expect(await importQuizAction({})).toEqual(forbidden);
      expect(await getQuestionsAction()).toEqual(forbidden);
      expect(await createQuestionAction({} as never)).toEqual(forbidden);
      expect(await updateQuestionAction(1, {} as never)).toEqual(forbidden);
      expect(await deleteQuestionAction(1)).toEqual(forbidden);
      expect(await getAllQuizzesSimpleAction()).toEqual([]);

      expect(mockPrisma.quiz.create).not.toHaveBeenCalled();
      expect(mockPrisma.quiz.update).not.toHaveBeenCalled();
      expect(mockPrisma.quiz.delete).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should forbid users whose account no longer exists", async () => {
      mockSession({ id: "ghost" });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await deleteQuizAction(1)).toEqual({
        success: false,
        error: "Forbidden",
      });
    });
  });

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

  describe("importQuizAction", () => {
    it("should persist the topicId of each question", async () => {
      mockSession({ id: "user-1" });
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
      mockPrisma.quiz.create.mockResolvedValue({ id: 7 });
      mockPrisma.question.createManyAndReturn.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      const res = await importQuizAction({
        title: "Quiz ciblé",
        referencielId: 1,
        questions: [
          {
            question: "Q1 ?",
            options: ["A", "B"],
            correctAnswer: 1,
            topicId: "t1",
          },
          { question: "Q2 ?", options: ["A", "B"], correctAnswer: 0 },
        ],
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.question.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ text: "Q1 ?", topicId: "t1" }),
          expect.objectContaining({ text: "Q2 ?", topicId: null }),
        ],
        select: { id: true },
      });
    });
  });
});
