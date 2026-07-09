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
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/gemini", () => ({
  generateLearningCardsFromPdf: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getUserContext } from "@/lib/context";
import { generateLearningCardsFromPdf } from "@/lib/gemini";
import { generateLearningCardsWithAiAction } from "@/app/actions/ai-learning-card-actions";

describe("generateLearningCardsWithAiAction", () => {
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

    const result = await generateLearningCardsWithAiAction({
      referencielId: 1,
      topic: "ACR",
      cardCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");
  });

  it("should return error if input parameters are invalid", async () => {
    mockUser([UserRole.SUPER_ADMIN]);

    const result = await generateLearningCardsWithAiAction({
      referencielId: "not-a-number",
      topic: "",
      cardCount: 50, // max is 30 in our zod rules, but let's check
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid parameters");
  });

  it("should return error if Referenciel is not found", async () => {
    mockUser([UserRole.SUPER_ADMIN]);
    mockPrisma.referenciel.findUnique.mockResolvedValue(null);

    const result = await generateLearningCardsWithAiAction({
      referencielId: 99,
      topic: "ACR",
      cardCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Referenciel introuvable");
  });

  it("should successfully generate and validate learning cards with AI", async () => {
    mockUser([UserRole.SUPER_ADMIN]);
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "PSE 1",
      pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
    });

    const validAiResponse = {
      cards: [
        {
          theme: "Cardio",
          niveau: "PSE 1",
          info: "Geste de PLS",
          reference: "Page 25",
        },
      ],
    };

    vi.mocked(generateLearningCardsFromPdf).mockResolvedValue(validAiResponse);

    const result = await generateLearningCardsWithAiAction({
      referencielId: 1,
      topic: "ACR",
      cardCount: 5,
      level: "PSE 1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.cards).toHaveLength(1);
    expect(result.data?.cards[0].theme).toBe("Cardio");
    expect(generateLearningCardsFromPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "ACR",
        cardCount: 5,
        level: "PSE 1",
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

    const malformedAiResponse = {
      // missing cards array
      notCards: [],
    };

    vi.mocked(generateLearningCardsFromPdf).mockResolvedValue(
      malformedAiResponse
    );

    const result = await generateLearningCardsWithAiAction({
      referencielId: 1,
      topic: "ACR",
      cardCount: 10,
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

    const result = await generateLearningCardsWithAiAction({
      referencielId: 1,
      topic: "ACR",
      cardCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Database failure");
  });
});
