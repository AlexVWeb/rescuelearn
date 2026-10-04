import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      files: { upload: vi.fn(), get: vi.fn(), delete: vi.fn() },
      models: { generateContent: mockGenerateContent },
    };
  }),
  Type: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
    INTEGER: "INTEGER",
    BOOLEAN: "BOOLEAN",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  buildTopicsPrompt,
  analyzeChapterTopics,
  analyzeChapterPlan,
} from "@/lib/gemini";

const batch = {
  title: "Pages 45-60",
  pageStart: 45,
  pageEnd: 60,
  sections: [
    { title: "Hémorragie externe", pageStart: 45, pageEnd: 50 },
    { title: "Garrot", pageStart: 51, pageEnd: 60 },
  ],
};

const topic = {
  chapter: "Urgences vitales",
  title: "Garrot",
  summary: "Pose du garrot.",
  keyPoints: ["Au-dessus de la plaie"],
  pageStart: 7,
  pageEnd: 8,
  questionCapacity: 6,
  suggestedFormats: ["QUIZ", "MINI_GAME"],
};

function lastConfig() {
  return mockGenerateContent.mock.calls.at(-1)![0].config;
}

describe("gemini analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  describe("buildTopicsPrompt", () => {
    it("décrit l'extrait, ses sections en pages relatives et le niveau fiche technique", () => {
      const prompt = buildTopicsPrompt({
        referencielTitle: "PSE",
        batch,
        levels: ["PSC"],
      });
      expect(prompt).toContain("fiche technique");
      expect(prompt).toContain("pages 45 à 60");
      expect(prompt).toContain("pages 1 à 6 : Hémorragie externe");
      expect(prompt).toContain("pages 7 à 16 : Garrot");
      expect(prompt).not.toContain('"levels"');
    });

    it("liste les niveaux seulement si le référentiel en a plusieurs", () => {
      const prompt = buildTopicsPrompt({
        referencielTitle: "PSE",
        batch,
        levels: ["PSE1", "PSE2"],
      });
      expect(prompt).toContain('"levels"');
      expect(prompt).toContain('["PSE1","PSE2"]');
    });
  });

  describe("analyzeChapterTopics", () => {
    it("retourne les sujets et contraint les niveaux en multi-niveau", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ topics: [{ ...topic, levels: ["PSE1"] }] }),
      });

      const result = await analyzeChapterTopics({
        pdf: new Uint8Array(10),
        referencielTitle: "PSE",
        batch,
        levels: ["PSE1", "PSE2"],
      });

      expect(result).toEqual([{ ...topic, levels: ["PSE1"] }]);
      const item = lastConfig().responseSchema.properties.topics.items;
      expect(item.properties.levels.items.enum).toEqual(["PSE1", "PSE2"]);
      expect(item.required).toContain("levels");
      expect(item.properties.suggestedFormats.items.enum).toEqual([
        "QUIZ",
        "MICRO_COURSE",
        "FLASHCARD",
        "MINI_GAME",
      ]);
    });

    it("n'inclut pas levels dans le schéma en mono-niveau", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ topics: [topic] }),
      });

      await analyzeChapterTopics({
        pdf: new Uint8Array(10),
        referencielTitle: "PSC",
        batch,
        levels: ["PSC"],
      });

      const item = lastConfig().responseSchema.properties.topics.items;
      expect(item.properties.levels).toBeUndefined();
      expect(item.required).not.toContain("levels");
    });

    it("lève une erreur si la réponse est vide", async () => {
      mockGenerateContent.mockResolvedValue({ text: "" });
      await expect(
        analyzeChapterTopics({
          pdf: new Uint8Array(10),
          referencielTitle: "PSC",
          batch,
          levels: ["PSC"],
        })
      ).rejects.toThrow("No text response received from Gemini");
    });
  });

  describe("analyzeChapterPlan", () => {
    it("retourne les chapitres proposés par l'IA", async () => {
      const chapters = [
        { title: "Protection", pageStart: 3, pageEnd: 10 },
        { title: "Alerte", pageStart: 11, pageEnd: 15 },
      ];
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ chapters }),
      });

      expect(await analyzeChapterPlan(new Uint8Array(10))).toEqual(chapters);
    });
  });
});
