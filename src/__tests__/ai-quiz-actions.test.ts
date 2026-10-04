import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

// --- Mocks ---

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  getFile: vi.fn().mockResolvedValue({
    buffer: Buffer.from("pdf-data"),
    contentType: "application/pdf",
  }),
}));

const mockPrisma = vi.hoisted(() => ({
  referenciel: {
    findUnique: vi.fn(),
  },
  question: {
    findMany: vi.fn(),
  },
  referencielTopic: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/pdf/document", () => ({
  extractPages: vi.fn().mockResolvedValue(new Uint8Array([1])),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/gemini", () => ({
  generateQuizFromPdf: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getUserContext } from "@/lib/context";
import { generateQuizFromPdf } from "@/lib/gemini";
import { extractPages } from "@/lib/pdf/document";
import { generateQuizWithAiAction } from "@/app/actions/ai-quiz-actions";

describe("generateQuizWithAiAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = (roles: string[]) => {
    vi.mocked(getUserContext).mockResolvedValue({
      id: "user-1",
      roles,
    } as never);
  };

  it("should return Forbidden if user is not SUPER_ADMIN", async () => {
    mockUser([UserRole.FORMATEUR]);

    const result = await generateQuizWithAiAction({
      referencielId: 1,
      topic: "ACR",
      questionCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");
  });

  it("should return error if input parameters are invalid", async () => {
    mockUser([UserRole.SUPER_ADMIN]);

    const result = await generateQuizWithAiAction({
      referencielId: "not-a-number",
      topic: "",
      questionCount: 50, // max is 30
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid parameters");
  });

  it("should return error if Referenciel is not found", async () => {
    mockUser([UserRole.SUPER_ADMIN]);
    mockPrisma.referenciel.findUnique.mockResolvedValue(null);

    const result = await generateQuizWithAiAction({
      referencielId: 99,
      topic: "ACR",
      questionCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Referenciel introuvable");
    expect(mockPrisma.referenciel.findUnique).toHaveBeenCalledWith({
      where: { id: 99 },
    });
  });

  it("should successfully generate and validate quiz with AI", async () => {
    mockUser([UserRole.SUPER_ADMIN]);
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "PSE 1",
      pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
    });

    // Mock tags and questions in DB
    mockPrisma.question.findMany
      .mockResolvedValueOnce([{ tags: ["ACR", "Urgences"] }, { tags: ["AVC"] }]) // tags list
      .mockResolvedValueOnce([{ text: "Question existante ?" }]); // questions list

    const validAiResponse = {
      title: "Quiz Généré",
      timePerQuestion: 30,
      passingScore: 70,
      modeRandom: true,
      level: "Niveau 1",
      questions: [
        {
          question: "Quelle est la conduite à tenir devant un ACR ?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0,
          explanation: "Explication de la réponse.",
          tags: ["ACR"],
        },
      ],
    };

    vi.mocked(generateQuizFromPdf).mockResolvedValue(validAiResponse);

    const result = await generateQuizWithAiAction({
      referencielId: 1,
      topic: "ACR",
      questionCount: 5,
      level: "PSE 1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe(validAiResponse.title);
    expect(result.data?.questions[0].question).toBe(
      validAiResponse.questions[0].question
    );
    expect(result.data?.questions[0].options).toHaveLength(4);
    const correctIdx = result.data?.questions[0].correctAnswer ?? 0;
    expect(result.data?.questions[0].correctAnswer).toBeDefined();
    expect(result.data?.questions[0].options[correctIdx]).toBe("Option A");
    expect(generateQuizFromPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "ACR",
        questionCount: 5,
        level: "PSE 1",
        existingQuestions: ["Question existante ?"],
        existingTags: ["ACR", "Urgences", "AVC"],
      })
    );
  });

  it("should return error if AI output is malformed", async () => {
    mockUser([UserRole.SUPER_ADMIN]);
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "PSE 1",
      pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
    });
    mockPrisma.question.findMany.mockResolvedValue([]);

    const malformedAiResponse = {
      title: "Quiz Incomplet",
      // missing questions, passingScore, etc.
    };

    vi.mocked(generateQuizFromPdf).mockResolvedValue(malformedAiResponse);

    const result = await generateQuizWithAiAction({
      referencielId: 1,
      topic: "ACR",
      questionCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "La réponse de l'IA est malformée ou incomplète."
    );
  });

  it("should handle exceptions and log errors gracefully", async () => {
    mockUser([UserRole.SUPER_ADMIN]);
    mockPrisma.referenciel.findUnique.mockRejectedValue(
      new Error("Database failure")
    );

    const result = await generateQuizWithAiAction({
      referencielId: 1,
      topic: "ACR",
      questionCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Database failure");
  });

  describe("with topicIds", () => {
    const topics = [
      {
        id: "t1",
        title: "Garrot",
        summary: "Pose du garrot.",
        keyPoints: ["Heure de pose"],
        pageStart: 45,
        pageEnd: 46,
      },
      {
        id: "t2",
        title: "Compression manuelle",
        summary: "Appui direct.",
        keyPoints: [],
        pageStart: 43,
        pageEnd: 44,
      },
    ];

    const aiQuestion = (topicId?: string) => ({
      question: "Question ?",
      options: ["A", "B", "C", "D"],
      correctAnswer: 0,
      explanation: "Explication.",
      tags: [],
      topicId,
    });

    beforeEach(() => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.referenciel.findUnique.mockResolvedValue({
        id: 1,
        title: "PSE",
        pdfUrl: "https://r2.example.com/dev/referenciels/pse.pdf",
      });
      mockPrisma.referencielTopic.findMany.mockResolvedValue(topics);
      mockPrisma.question.findMany
        .mockResolvedValueOnce([]) // tags
        .mockResolvedValueOnce([{ text: "Déjà posée ?" }]); // anti-doublon
    });

    it("cible les pages et les sujets demandés", async () => {
      vi.mocked(generateQuizFromPdf).mockResolvedValue({
        title: "Quiz",
        questions: [aiQuestion("t1")],
      });

      const result = await generateQuizWithAiAction({
        referencielId: 1,
        topicIds: ["t1", "t2"],
        questionCount: 5,
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.referencielTopic.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["t1", "t2"] }, referencielId: 1 },
        orderBy: { order: "asc" },
      });
      expect(extractPages).toHaveBeenCalledWith(expect.any(Uint8Array), [
        { pageStart: 43, pageEnd: 46 },
      ]);
      expect(mockPrisma.question.findMany).toHaveBeenLastCalledWith({
        where: { topicId: { in: ["t1", "t2"] } },
        select: { text: true },
      });
      expect(generateQuizFromPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf: new Uint8Array([1]),
          topic: "Garrot, Compression manuelle",
          topics,
          existingQuestions: ["Déjà posée ?"],
        })
      );
      expect(result.data?.questions[0].topicId).toBe("t1");
    });

    it("refuse des sujets d'un autre référentiel", async () => {
      mockPrisma.referencielTopic.findMany.mockResolvedValue([topics[0]]);

      const result = await generateQuizWithAiAction({
        referencielId: 1,
        topicIds: ["t1", "autre"],
        questionCount: 5,
      });

      expect(result).toEqual({
        success: false,
        error: "Sujets introuvables pour ce référentiel",
      });
      expect(generateQuizFromPdf).not.toHaveBeenCalled();
    });

    it("retire un topicId inconnu renvoyé par l'IA", async () => {
      vi.mocked(generateQuizFromPdf).mockResolvedValue({
        title: "Quiz",
        questions: [aiQuestion("inconnu")],
      });

      const result = await generateQuizWithAiAction({
        referencielId: 1,
        topicIds: ["t1"],
        questionCount: 5,
      });

      expect(result.data?.questions[0].topicId).toBeUndefined();
    });

    it("exige un sujet libre ou des sujets", async () => {
      const result = await generateQuizWithAiAction({
        referencielId: 1,
        questionCount: 5,
      });
      expect(result).toEqual({ success: false, error: "Invalid parameters" });
    });
  });
});
