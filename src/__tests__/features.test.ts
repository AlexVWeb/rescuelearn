import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  systemSetting: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn().mockImplementation((fn) => fn),
  revalidateTag: vi.fn(),
}));

import { getFeaturesState, isFeatureEnabled, FeatureKey } from "@/lib/features";

describe("Features Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return default true states when database is empty", async () => {
    mockPrisma.systemSetting.findMany.mockResolvedValue([]);
    const state = await getFeaturesState();
    expect(state).toEqual({
      [FeatureKey.PLAYER_SYSTEM]: true,
      [FeatureKey.DUOLINGO_SYSTEM]: true,
      [FeatureKey.GLASGOW_SYSTEM]: true,
      [FeatureKey.SNV_SYSTEM]: true,
      [FeatureKey.QUIZ_SYSTEM]: true,
    });
  });

  it("should return configured values from database", async () => {
    mockPrisma.systemSetting.findMany.mockResolvedValue([
      { key: FeatureKey.GLASGOW_SYSTEM, value: "false" },
      { key: FeatureKey.PLAYER_SYSTEM, value: "true" },
    ]);
    const state = await getFeaturesState();
    expect(state[FeatureKey.GLASGOW_SYSTEM]).toBe(false);
    expect(state[FeatureKey.PLAYER_SYSTEM]).toBe(true);
    expect(state[FeatureKey.DUOLINGO_SYSTEM]).toBe(true);
  });

  it("should return correct status for isFeatureEnabled", async () => {
    mockPrisma.systemSetting.findMany.mockResolvedValue([
      { key: FeatureKey.SNV_SYSTEM, value: "false" },
    ]);
    expect(await isFeatureEnabled(FeatureKey.SNV_SYSTEM)).toBe(false);
    expect(await isFeatureEnabled(FeatureKey.QUIZ_SYSTEM)).toBe(true);
  });
});
