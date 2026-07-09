import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockPrisma = vi.hoisted(() => ({
  quiz: {
    findUnique: vi.fn(),
  },
  quizSession: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  quizParticipant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  quizAnswer: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  question: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((calls) => Promise.all(calls)),
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
  createQuizSessionAction,
  joinQuizSessionAction,
  startQuizSessionAction,
  submitAnswerAction,
  nextQuestionAction,
  getLeaderboardAction,
  getQuizSessionStateAction,
  checkServerSaturationAction,
} from "@/app/actions/quiz-session-actions";

describe("quiz-session-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.quizSession.count.mockResolvedValue(0);
    mockPrisma.quizParticipant.count.mockResolvedValue(0);
  });

  describe("createQuizSessionAction", () => {
    it("should fail if quiz is not found", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      const result = await createQuizSessionAction(1);
      expect(result).toEqual({ success: false, error: "Quiz introuvable" });
    });

    it("should create a quiz session successfully with a unique code", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.quizSession.findFirst.mockResolvedValue(null); // No collision
      mockPrisma.quizSession.create.mockResolvedValue({
        id: "session-1",
        code: "ABCD",
      });

      const result = await createQuizSessionAction(1);
      expect(result.success).toBe(true);
      expect(result.code).toHaveLength(4);
      expect(mockPrisma.quizSession.create).toHaveBeenCalled();
    });

    it("should fail if maximum active sessions count is reached", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.quizSession.count.mockResolvedValue(8);

      const result = await createQuizSessionAction(1);
      expect(result).toEqual({
        success: false,
        error:
          "Limite de sessions simultanées atteinte. Veuillez réessayer plus tard.",
      });
    });
  });

  describe("joinQuizSessionAction", () => {
    it("should fail if nickname is empty", async () => {
      const result = await joinQuizSessionAction("ABCD", "  ");
      expect(result).toEqual({
        success: false,
        error: "Le pseudo ne peut pas être vide",
      });
    });

    it("should fail if session is not found or not in LOBBY status", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue(null);

      const result = await joinQuizSessionAction("ABCD", "Alex");
      expect(result).toEqual({
        success: false,
        error: "Salon introuvable ou déjà démarré",
      });
    });

    it("should fail if session participant count limit is reached", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue({ id: "session-1" });
      mockPrisma.quizParticipant.count.mockResolvedValueOnce(20); // First count call inside action: session count

      const result = await joinQuizSessionAction("ABCD", "Alex");
      expect(result).toEqual({
        success: false,
        error: "Ce salon est complet (maximum 20 participants).",
      });
    });

    it("should fail if total global active participants limit is reached", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue({ id: "session-1" });
      mockPrisma.quizParticipant.count
        .mockResolvedValueOnce(10) // first call: session count (10)
        .mockResolvedValueOnce(160); // second call: global count (160)

      const result = await joinQuizSessionAction("ABCD", "Alex");
      expect(result).toEqual({
        success: false,
        error: "Le serveur de jeu est saturé. Veuillez réessayer plus tard.",
      });
    });

    it("should fail if nickname is already taken", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue({ id: "session-1" });
      mockPrisma.quizParticipant.findUnique.mockResolvedValue({
        id: "participant-1",
      });

      const result = await joinQuizSessionAction("ABCD", "Alex");
      expect(result).toEqual({
        success: false,
        error: "Ce pseudo est déjà pris dans ce salon",
      });
    });

    it("should join successfully if all checks pass", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue({ id: "session-1" });
      mockPrisma.quizParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.quizParticipant.create.mockResolvedValue({
        id: "participant-1",
        nickname: "Alex",
      });

      const result = await joinQuizSessionAction("ABCD", "Alex");
      expect(result.success).toBe(true);
      expect(result.participantId).toBe("participant-1");
    });
  });

  describe("startQuizSessionAction", () => {
    it("should fail if session is not found", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue(null);

      const result = await startQuizSessionAction("session-1");
      expect(result).toEqual({ success: false, error: "Session introuvable" });
    });

    it("should fail if session status is not LOBBY", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "IN_PROGRESS",
      });

      const result = await startQuizSessionAction("session-1");
      expect(result).toEqual({
        success: false,
        error: "La session a déjà démarré",
      });
    });

    it("should start successfully and set first question", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "LOBBY",
        quiz: {
          timePerQuestion: 30,
          questions: [{ id: 101 }],
        },
      });

      const result = await startQuizSessionAction("session-1");
      expect(result.success).toBe(true);
      expect(result.currentQuestionId).toBe(101);
      expect(mockPrisma.quizSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          currentQuestionId: 101,
        }),
      });
    });
  });

  describe("submitAnswerAction", () => {
    it("should fail if session is not in progress", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "LOBBY",
      });

      const result = await submitAnswerAction("session-1", "part-1", 1, 10);
      expect(result.success).toBe(false);
    });

    it("should fail if participant is not authorized", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "IN_PROGRESS",
        currentQuestionId: 1,
      });
      mockPrisma.quizParticipant.findUnique.mockResolvedValue(null);

      const result = await submitAnswerAction("session-1", "part-1", 1, 10);
      expect(result).toEqual({
        success: false,
        error: "Participant non autorisé pour cette session",
      });
    });

    it("should record answer as incorrect or correct and award points", async () => {
      const now = Date.now();
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "IN_PROGRESS",
        currentQuestionId: 1,
        currentQuestionStartedAt: new Date(now - 5000), // 5s ago
        quiz: { timePerQuestion: 30 },
      });
      mockPrisma.quizParticipant.findUnique.mockResolvedValue({
        id: "part-1",
        sessionId: "session-1",
      });
      mockPrisma.quizAnswer.findUnique.mockResolvedValue(null);
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 1,
        correctAnswer: "B",
        options: [{ id: 10 }, { id: 11 }, { id: 12 }], // 11 is B (index 1)
      });

      // Submit correct answer (11)
      const resultCorrect = await submitAnswerAction(
        "session-1",
        "part-1",
        1,
        11
      );
      expect(resultCorrect.success).toBe(true);
      expect(resultCorrect.isCorrect).toBe(true);
      expect(resultCorrect.points).toBeGreaterThan(500); // Has speed bonus

      // Submit incorrect answer (10)
      const resultIncorrect = await submitAnswerAction(
        "session-1",
        "part-1",
        1,
        10
      );
      expect(resultIncorrect.success).toBe(true);
      expect(resultIncorrect.isCorrect).toBe(false);
      expect(resultIncorrect.points).toBe(0);
    });
  });

  describe("nextQuestionAction", () => {
    it("should transition to the next question", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "IN_PROGRESS",
        currentQuestionId: 101,
        quiz: {
          questions: [{ id: 101 }, { id: 102 }],
        },
      });

      const result = await nextQuestionAction("session-1");
      expect(result.success).toBe(true);
      expect(result.finished).toBe(false);
      expect(result.currentQuestionId).toBe(102);
    });

    it("should finish session if no more questions", async () => {
      mockPrisma.quizSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "IN_PROGRESS",
        currentQuestionId: 102,
        quiz: {
          questions: [{ id: 101 }, { id: 102 }],
        },
      });

      const result = await nextQuestionAction("session-1");
      expect(result.success).toBe(true);
      expect(result.finished).toBe(true);
    });
  });

  describe("getLeaderboardAction", () => {
    it("should return sorted leaderboard", async () => {
      mockPrisma.quizParticipant.findMany.mockResolvedValue([
        { id: "p1", nickname: "Alex", score: 1200 },
        { id: "p2", nickname: "Bob", score: 800 },
      ]);

      const result = await getLeaderboardAction("session-1");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].score).toBe(1200);
    });
  });

  describe("getQuizSessionStateAction", () => {
    it("should fail if session is not found", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue(null);

      const result = await getQuizSessionStateAction("ABCD");
      expect(result).toEqual({ success: false, error: "Session introuvable" });
    });

    it("should strip correct answers for participants", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue({
        id: "session-uuid",
        code: "ABCD",
        status: "IN_PROGRESS",
        quiz: {
          title: "Secourisme",
          timePerQuestion: 30,
          questions: [
            {
              id: 1,
              text: "Question ?",
              correctAnswer: "A",
              explanation: "Explication de la réponse",
            },
          ],
        },
      });

      const result = await getQuizSessionStateAction("ABCD");
      expect(result.success).toBe(true);
      expect(result.data?.questions[0].correctAnswer).toBe("");
      expect(result.data?.questions[0].explanation).toBeNull();
    });

    it("should include correct answers for the host", async () => {
      mockPrisma.quizSession.findFirst.mockResolvedValue({
        id: "session-uuid",
        code: "ABCD",
        status: "IN_PROGRESS",
        quiz: {
          title: "Secourisme",
          timePerQuestion: 30,
          questions: [
            {
              id: 1,
              text: "Question ?",
              correctAnswer: "A",
              explanation: "Explication de la réponse",
            },
          ],
        },
      });

      const result = await getQuizSessionStateAction("ABCD", "session-uuid"); // matching hostToken
      expect(result.success).toBe(true);
      expect(result.data?.questions[0].correctAnswer).toBe("A");
      expect(result.data?.questions[0].explanation).toBe(
        "Explication de la réponse"
      );
    });
  });

  describe("checkServerSaturationAction", () => {
    it("should return isSaturated: true if active sessions are >= 8", async () => {
      mockPrisma.quizSession.count.mockResolvedValue(8);
      const result = await checkServerSaturationAction();
      expect(result).toEqual({ success: true, isSaturated: true });
    });

    it("should return isSaturated: false if active sessions are < 8", async () => {
      mockPrisma.quizSession.count.mockResolvedValue(3);
      const result = await checkServerSaturationAction();
      expect(result).toEqual({ success: true, isSaturated: false });
    });
  });
});
