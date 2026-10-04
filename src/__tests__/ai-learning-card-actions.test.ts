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
import { extractPages } from "@/lib/pdf/document";
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
    const card = (topicId?: string) => ({
      theme: "Hémorragies",
      niveau: "PSE1",
      info: "Info",
      reference: "p.45",
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
    });

    it("cible les pages des sujets et garde le topicId des cartes", async () => {
      vi.mocked(generateLearningCardsFromPdf).mockResolvedValue({
        cards: [card("t1"), card("inconnu")],
      });

      const result = await generateLearningCardsWithAiAction({
        referencielId: 1,
        topicIds: ["t1", "t2"],
        cardCount: 6,
      });

      expect(result.success).toBe(true);
      expect(extractPages).toHaveBeenCalledWith(expect.any(Uint8Array), [
        { pageStart: 43, pageEnd: 46 },
      ]);
      expect(generateLearningCardsFromPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf: new Uint8Array([1]),
          topic: "Garrot, Compression manuelle",
          topics,
        })
      );
      expect(result.data?.cards.map((c) => c.topicId)).toEqual([
        "t1",
        undefined,
      ]);
    });

    it("refuse des sujets d'un autre référentiel", async () => {
      mockPrisma.referencielTopic.findMany.mockResolvedValue([topics[0]]);

      const result = await generateLearningCardsWithAiAction({
        referencielId: 1,
        topicIds: ["t1", "autre"],
        cardCount: 6,
      });

      expect(result).toEqual({
        success: false,
        error: "Sujets introuvables pour ce référentiel",
      });
      expect(generateLearningCardsFromPdf).not.toHaveBeenCalled();
    });
  });
});
