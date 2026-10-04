import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
const mockUpload = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        files: {
          upload: mockUpload,
          get: mockGet,
          delete: mockDelete,
        },
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
      INTEGER: "INTEGER",
      BOOLEAN: "BOOLEAN",
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  buildPrompt,
  buildProgressionPrompt,
  buildLearningCardPrompt,
  generateLearningCardsFromPdf,
  generateQuizFromPdf,
  retryWithBackoff,
} from "@/lib/gemini";

const smallPdf = new Uint8Array(1024);
const largePdf = new Uint8Array(16 * 1024 * 1024);

describe("gemini business logic", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("buildPrompt", () => {
    it("should build prompt with basic parameters", () => {
      const prompt = buildPrompt("ACR", 10);
      expect(prompt).toContain('sujet "ACR"');
      expect(prompt).toContain("Génère exactement 10 questions");
    });

    it("should build prompt with level, existing questions and tags", () => {
      const prompt = buildPrompt(
        "AVC",
        5,
        "PSE2",
        ["Question existante 1 ?"],
        ["Neurologie", "AVC"]
      );
      expect(prompt).toContain('sujet "AVC"');
      expect(prompt).toContain("Génère exactement 5 questions");
      expect(prompt).toContain('Le niveau ciblé est "PSE2"');
      expect(prompt).toContain("Question existante 1 ?");
      expect(prompt).toContain("Neurologie");
    });

    it("should add a targeted context when topics are provided", () => {
      const prompt = buildPrompt(
        "Garrot",
        5,
        undefined,
        [],
        [],
        [
          {
            id: "t1",
            title: "Garrot",
            summary: "Pose du garrot.",
            keyPoints: ["Au-dessus de la plaie", "Noter l'heure"],
            pageStart: 45,
            pageEnd: 46,
          },
        ]
      );
      expect(prompt).toContain("CONTEXTE CIBLÉ");
      expect(prompt).toContain(
        "- [id: t1] Garrot (pages 45-46) : Pose du garrot. Points clés : Au-dessus de la plaie ; Noter l'heure"
      );
      expect(prompt).toContain('renseigne "topicId"');
    });

    it("should not mention topicId without topics", () => {
      expect(buildPrompt("ACR", 10)).not.toContain("topicId");
    });
  });

  describe("buildProgressionPrompt", () => {
    const structure = { microCourseCount: 1, quizCount: 3, flashcardCount: 1 };

    it("should target the lesson on the given topics without topicId", () => {
      const prompt = buildProgressionPrompt("Hémorragies", structure, "PSE1", [
        {
          id: "t1",
          title: "Garrot",
          summary: "Pose du garrot.",
          keyPoints: ["Heure de pose"],
          pageStart: 45,
          pageEnd: 46,
        },
      ]);
      expect(prompt).toContain("CONTEXTE CIBLÉ");
      expect(prompt).toContain("[id: t1] Garrot (pages 45-46)");
      expect(prompt).not.toContain("topicId");
    });

    it("should keep the free-topic prompt unchanged without topics", () => {
      expect(
        buildProgressionPrompt("Hémorragies", structure, "PSE1")
      ).not.toContain("CONTEXTE CIBLÉ");
    });
  });

  describe("learning cards", () => {
    const garrot = {
      id: "t1",
      title: "Garrot",
      summary: "Pose du garrot.",
      keyPoints: ["Heure de pose"],
      pageStart: 45,
      pageEnd: 46,
    };

    it("should target the cards on the given topics", () => {
      const prompt = buildLearningCardPrompt("Garrot", 5, "PSE1", [garrot]);
      expect(prompt).toContain("CONTEXTE CIBLÉ");
      expect(prompt).toContain("[id: t1] Garrot (pages 45-46)");
      expect(prompt).toContain('renseigne "topicId"');
    });

    it("should send the in-memory PDF and constrain topicId", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ cards: [] }),
      });

      await generateLearningCardsFromPdf({
        pdf: smallPdf,
        topic: "Garrot",
        cardCount: 5,
        topics: [garrot],
      });

      const config = mockGenerateContent.mock.calls[0][0].config;
      const items = config.responseSchema.properties.cards.items;
      expect(items.properties.topicId.enum).toEqual(["t1"]);
      expect(items.required).toContain("topicId");
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should not require topicId without topics", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ cards: [] }),
      });

      await generateLearningCardsFromPdf({
        pdf: smallPdf,
        topic: "ACR",
        cardCount: 5,
      });

      const items =
        mockGenerateContent.mock.calls[0][0].config.responseSchema.properties
          .cards.items;
      expect(items.properties.topicId).toBeUndefined();
    });
  });

  describe("retryWithBackoff", () => {
    it("should retry on 503 transient error and succeed", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ status: 503, message: "Service Unavailable" })
        .mockResolvedValueOnce("success");

      const result = await retryWithBackoff(mockFn, 2, 1);
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should fail after maximum retries on persistent transient error", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValue({ status: 503, message: "Service Unavailable" });

      await expect(retryWithBackoff(mockFn, 2, 1)).rejects.toThrow(
        "Service Unavailable"
      );
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should not retry on non-transient errors", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("Fatal Error"));

      await expect(retryWithBackoff(mockFn, 2, 1)).rejects.toThrow(
        "Fatal Error"
      );
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateQuizFromPdf", () => {
    it("should throw error if API key is not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      await expect(
        generateQuizFromPdf({
          pdf: smallPdf,
          topic: "ACR",
          questionCount: 10,
        })
      ).rejects.toThrow("GEMINI_API_KEY is not configured");
    });

    it("should process small PDF inline", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          title: "Quiz ACR",
          timePerQuestion: 30,
          passingScore: 70,
          modeRandom: false,
          questions: [],
        }),
      });

      const result = await generateQuizFromPdf({
        pdf: smallPdf,
        topic: "ACR",
        questionCount: 5,
      });

      expect(result.title).toBe("Quiz ACR");
      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should process large PDF using Files API and poll state", async () => {
      mockUpload.mockResolvedValue({
        name: "files/abc-123",
        state: "PROCESSING",
      });
      mockGet
        .mockResolvedValueOnce({ state: "PROCESSING" })
        .mockResolvedValueOnce({ state: "ACTIVE" });
      mockDelete.mockResolvedValue({ success: true });
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          title: "Quiz Large PDF",
          timePerQuestion: 30,
          passingScore: 70,
          modeRandom: false,
          questions: [],
        }),
      });

      const result = await generateQuizFromPdf({
        pdf: largePdf,
        topic: "ACR",
        questionCount: 10,
        level: "PSE1",
      });

      expect(result.title).toBe("Quiz Large PDF");
      expect(mockUpload).toHaveBeenCalledWith({
        file: expect.any(Blob),
        config: { mimeType: "application/pdf" },
      });
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenCalledWith({ name: "files/abc-123" });
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should throw error if large PDF upload state becomes failed", async () => {
      mockUpload.mockResolvedValue({
        name: "files/abc-123",
        state: "PROCESSING",
      });
      mockGet.mockResolvedValue({ state: "FAILED" });
      mockDelete.mockResolvedValue({});

      await expect(
        generateQuizFromPdf({
          pdf: largePdf,
          topic: "ACR",
          questionCount: 10,
        })
      ).rejects.toThrow("Uploaded file is not active: FAILED");

      expect(mockDelete).toHaveBeenCalledWith({ name: "files/abc-123" });
    });

    it("should constrain topicId to the provided topics", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ title: "Quiz", questions: [] }),
      });

      await generateQuizFromPdf({
        pdf: smallPdf,
        topic: "Garrot",
        questionCount: 5,
        topics: [
          {
            id: "t1",
            title: "Garrot",
            summary: "",
            keyPoints: [],
            pageStart: 1,
            pageEnd: 2,
          },
        ],
      });

      const items =
        mockGenerateContent.mock.calls[0][0].config.responseSchema.properties
          .questions.items;
      expect(items.properties.topicId.enum).toEqual(["t1"]);
      expect(items.required).toContain("topicId");
    });

    it("should throw error if generateContent returns empty text", async () => {
      mockGenerateContent.mockResolvedValue({ text: "" });

      await expect(
        generateQuizFromPdf({
          pdf: smallPdf,
          topic: "ACR",
          questionCount: 10,
        })
      ).rejects.toThrow("No text response received from Gemini");
    });
  });
});
