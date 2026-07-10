import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---
const mockPrisma = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  levelQuestion: {
    findMany: vi.fn(),
  },
  question: {
    findMany: vi.fn(),
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

const mockSend = vi.fn();
vi.mock("@/lib/email", () => ({
  EmailService: {
    send: (...args: unknown[]) => mockSend(...args),
  },
}));

import { GET } from "@/app/api/cron/daily-quiz/route";

describe("Daily Quiz Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authorizes request in production with proper bearer token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.CRON_SECRET = "secret-key";

    const request = new NextRequest("http://localhost/api/cron/daily-quiz", {
      headers: {
        authorization: "Bearer secret-key",
      },
    });

    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([]);

    const response = await GET(request);
    expect(response.status).toBe(200);

    vi.unstubAllEnvs();
  });

  it("selects correct level questions and emails user", async () => {
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([
      {
        id: "user-1",
        email: "user1@example.com",
        name: "Alice",
        onboardingExperience: "beginner",
        questionSubscriptionEnabled: true,
        questionSubscriptionFrequency: "daily",
        lastQuestionSentAt: null,
      },
    ] as unknown as never);

    vi.mocked(mockPrisma.levelQuestion.findMany).mockResolvedValue([
      {
        id: 1,
        name: "Niveau 1",
        quizzes: [
          {
            id: 1,
            questions: [
              {
                id: 101,
                text: "Que faire en cas d'hémorragie ?",
                options: [{ text: "Compresser" }, { text: "Rien" }],
              },
            ],
          },
        ],
      },
    ] as unknown as never);

    mockSend.mockResolvedValue({ success: true });

    const request = new NextRequest("http://localhost/api/cron/daily-quiz");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user1@example.com",
        subject: expect.stringContaining("Défi Secourisme"),
      })
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        lastQuestionSentAt: expect.any(Date),
      },
    });
  });
});
