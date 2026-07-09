import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { stat, readFile } from "fs/promises";

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

vi.mock("fs/promises", () => ({
  stat: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  buildPrompt,
  generateQuizFromPdf,
  retryWithBackoff,
} from "@/lib/gemini";

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
          pdfPath: "dummy.pdf",
          topic: "ACR",
          questionCount: 10,
        })
      ).rejects.toThrow("GEMINI_API_KEY is not configured");
    });

    it("should process small PDF inline", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 10 * 1024 * 1024 } as never); // 10MB
      vi.mocked(readFile).mockResolvedValue(Buffer.from("dummy-pdf-content"));
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
        pdfPath: "dummy.pdf",
        topic: "ACR",
        questionCount: 5,
      });

      expect(result.title).toBe("Quiz ACR");
      expect(stat).toHaveBeenCalledWith("dummy.pdf");
      expect(readFile).toHaveBeenCalledWith("dummy.pdf");
      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should process large PDF using Files API and poll state", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 20 * 1024 * 1024 } as never); // 20MB
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
        pdfPath: "dummy.pdf",
        topic: "ACR",
        questionCount: 10,
        level: "PSE1",
      });

      expect(result.title).toBe("Quiz Large PDF");
      expect(mockUpload).toHaveBeenCalledWith({
        file: "dummy.pdf",
        config: { mimeType: "application/pdf" },
      });
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenCalledWith({ name: "files/abc-123" });
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should throw error if large PDF upload state becomes failed", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 20 * 1024 * 1024 } as never);
      mockUpload.mockResolvedValue({
        name: "files/abc-123",
        state: "PROCESSING",
      });
      mockGet.mockResolvedValue({ state: "FAILED" });
      mockDelete.mockResolvedValue({});

      await expect(
        generateQuizFromPdf({
          pdfPath: "dummy.pdf",
          topic: "ACR",
          questionCount: 10,
        })
      ).rejects.toThrow("Uploaded file is not active: FAILED");

      expect(mockDelete).toHaveBeenCalledWith({ name: "files/abc-123" });
    });

    it("should throw error if generateContent returns empty text", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 2 * 1024 * 1024 } as never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("dummy"));
      mockGenerateContent.mockResolvedValue({ text: "" });

      await expect(
        generateQuizFromPdf({
          pdfPath: "dummy.pdf",
          topic: "ACR",
          questionCount: 10,
        })
      ).rejects.toThrow("No text response received from Gemini");
    });
  });
});
