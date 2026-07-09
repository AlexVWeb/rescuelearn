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
});
