import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

const mockGetSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
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

import {
  getPlayerSubscriptionStatusAction,
  updateQuestionSubscriptionAction,
} from "@/app/actions/player-subscription-actions";

describe("Player Subscription Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateQuestionSubscriptionAction", () => {
    it("fails if not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await updateQuestionSubscriptionAction({
        enabled: true,
        frequency: "daily",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("fails if validation fails (e.g. invalid frequency)", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

      const res = await updateQuestionSubscriptionAction({
        enabled: true,
        frequency: "yearly",
      });

      expect(res.success).toBe(false);
    });

    it("saves subscription state successfully", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", email: "player@example.com" },
      });
      vi.mocked(mockPrisma.user.update).mockResolvedValue(
        {} as unknown as never
      );

      const res = await updateQuestionSubscriptionAction({
        enabled: true,
        frequency: "weekly",
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          questionSubscriptionEnabled: true,
          questionSubscriptionFrequency: "weekly",
        },
      });
    });
  });

  describe("getPlayerSubscriptionStatusAction", () => {
    it("fails if not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await getPlayerSubscriptionStatusAction();

      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("returns correct user subscription info", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        questionSubscriptionEnabled: true,
        questionSubscriptionFrequency: "monthly",
      } as unknown as never);

      const res = await getPlayerSubscriptionStatusAction();

      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        enabled: true,
        frequency: "monthly",
      });
    });
  });
});
