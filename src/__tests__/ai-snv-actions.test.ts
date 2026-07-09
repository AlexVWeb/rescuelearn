import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
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
  generateSNVScenarioFromPdf: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { generateSNVScenarioFromPdf } from "@/lib/gemini";
import { generateSNVScenarioWithAiAction } from "@/app/actions/ai-snv-actions";

describe("generateSNVScenarioWithAiAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = (user: { id: string } | null) => {
    if (user) {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          ...user,
          email: "user@example.com",
          emailVerified: true,
          name: "User",
          roles: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: "session-1",
          userId: user.id,
          token: "token",
          expiresAt: new Date(),
          userAgent: "agent",
          ipAddress: "127.0.0.1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
    }
  };

  it("should return Unauthorized if session is missing", async () => {
    mockSession(null);

    const result = await generateSNVScenarioWithAiAction({
      referencielId: 1,
      topic: "Accident de train",
      victimCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("should return error if input parameters are invalid", async () => {
    mockSession({ id: "user-1" });

    const result = await generateSNVScenarioWithAiAction({
      referencielId: "not-a-number",
      topic: "",
      victimCount: 50,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid parameters");
  });

  it("should return error if Referenciel is not found", async () => {
    mockSession({ id: "user-1" });
    mockPrisma.referenciel.findUnique.mockResolvedValue(null);

    const result = await generateSNVScenarioWithAiAction({
      referencielId: 99,
      topic: "Accident",
      victimCount: 5,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Referenciel introuvable");
  });

  it("should successfully generate and validate SNV scenario with AI", async () => {
    mockSession({ id: "user-1" });
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "PSE 1",
      pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
    });

    const validAiResponse = {
      title: "Accident de train",
      level: "PSE 1",
      description: "Déraillement d'un train régional",
      victimes: [
        {
          description: "Victime inconsciente qui respire",
          correctAnswer: 2,
          explanation:
            "Tri Rouge car inconsciente et respire (urgence absolue)",
        },
      ],
    };

    vi.mocked(generateSNVScenarioFromPdf).mockResolvedValue(validAiResponse);

    const result = await generateSNVScenarioWithAiAction({
      referencielId: 1,
      topic: "Accident de train",
      victimCount: 5,
      level: "PSE 1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Accident de train");
    expect(result.data?.victimes).toHaveLength(1);
    expect(result.data?.victimes[0].correctAnswer).toBe(2);
    expect(generateSNVScenarioFromPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "Accident de train",
        victimCount: 5,
        level: "PSE 1",
      })
    );
  });

  it("should return error if AI output is malformed", async () => {
    mockSession({ id: "user-1" });
    mockPrisma.referenciel.findUnique.mockResolvedValue({
      id: 1,
      title: "PSE 1",
      pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
    });

    const malformedAiResponse = {
      title: "Accident",
      // missing victimes array
    };

    vi.mocked(generateSNVScenarioFromPdf).mockResolvedValue(
      malformedAiResponse
    );

    const result = await generateSNVScenarioWithAiAction({
      referencielId: 1,
      topic: "Accident",
      victimCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "La réponse de l'IA est malformée ou incomplète."
    );
  });
});
