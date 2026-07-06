import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
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

describe("GET /api/cron/keep-alive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "super-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should respond with 401 Unauthorized in production if no authorization header is provided", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new NextRequest("http://localhost/api/cron/keep-alive");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toBe("Unauthorized");
  });

  it("should respond with 200 OK in production if valid authorization header is provided", async () => {
    vi.stubEnv("NODE_ENV", "production");

    mockPrisma.$queryRaw.mockResolvedValueOnce([1]);

    const request = new NextRequest("http://localhost/api/cron/keep-alive", {
      headers: {
        authorization: "Bearer super-secret",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ success: true, message: "Database is awake" });
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it("should respond with 200 OK in development even without authorization header", async () => {
    vi.stubEnv("NODE_ENV", "development");

    mockPrisma.$queryRaw.mockResolvedValueOnce([1]);

    const request = new NextRequest("http://localhost/api/cron/keep-alive");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ success: true, message: "Database is awake" });
  });

  it("should respond with 500 if database query fails", async () => {
    vi.stubEnv("NODE_ENV", "development");

    mockPrisma.$queryRaw.mockRejectedValueOnce(
      new Error("Database connection error")
    );

    const request = new NextRequest("http://localhost/api/cron/keep-alive");
    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data).toEqual({ success: false, error: "Failed to ping database" });
  });
});
