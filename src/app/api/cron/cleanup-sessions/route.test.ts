import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockPrisma = vi.hoisted(() => ({
  quizSession: {
    updateMany: vi.fn(),
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

describe("GET /api/cron/cleanup-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "super-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should respond with 401 Unauthorized in production if no authorization header is provided", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new NextRequest(
      "http://localhost/api/cron/cleanup-sessions"
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toBe("Unauthorized");
  });

  it("should respond with 200 OK in production if valid authorization header is provided", async () => {
    vi.stubEnv("NODE_ENV", "production");

    mockPrisma.quizSession.updateMany.mockResolvedValueOnce({ count: 2 });

    const request = new NextRequest(
      "http://localhost/api/cron/cleanup-sessions",
      {
        headers: {
          authorization: "Bearer super-secret",
        },
      }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ success: true, closedSessionsCount: 2 });
    expect(mockPrisma.quizSession.updateMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["LOBBY", "IN_PROGRESS"] },
        updatedAt: { lt: expect.any(Date) },
      },
      data: {
        status: "FINISHED",
        currentQuestionId: null,
        currentQuestionStartedAt: null,
      },
    });
  });

  it("should respond with 200 OK in development even without authorization header", async () => {
    vi.stubEnv("NODE_ENV", "development");

    mockPrisma.quizSession.updateMany.mockResolvedValueOnce({ count: 0 });

    const request = new NextRequest(
      "http://localhost/api/cron/cleanup-sessions"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ success: true, closedSessionsCount: 0 });
  });

  it("should respond with 500 if database updateMany fails", async () => {
    vi.stubEnv("NODE_ENV", "development");

    mockPrisma.quizSession.updateMany.mockRejectedValueOnce(
      new Error("Database write error")
    );

    const request = new NextRequest(
      "http://localhost/api/cron/cleanup-sessions"
    );
    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: "Failed to cleanup stale sessions",
    });
  });
});
