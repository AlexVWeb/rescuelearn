import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  systemSetting: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/context", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { requireSuperAdmin } from "@/lib/context";
import { revalidateTag } from "next/cache";
import { FeatureKey } from "@/lib/features";
import {
  getSystemSettingsAction,
  updateSystemSettingAction,
  getPlayerModulesAction,
  updatePlayerModuleAction,
} from "@/app/actions/system-settings-actions";
import { PlayerModuleKey } from "@/types/player-modules";

const superAdmin = {
  id: "test-user-id",
  email: "admin@test.com",
  name: "Admin Test",
  roles: ["SUPER_ADMIN"],
  organismeId: null,
  firstName: "Admin",
  lastName: "Test",
};

describe("System Settings Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSystemSettingsAction", () => {
    it("should return forbidden if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(new Error("Non autorisé"));
      const result = await getSystemSettingsAction();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Non autorisé");
    });

    it("should return all system settings for super admin", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: "test-user-id",
        email: "admin@test.com",
        name: "Admin Test",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
        firstName: "Admin",
        lastName: "Test",
      });
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: "TEST", value: "true" },
      ]);
      const result = await getSystemSettingsAction();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ key: "TEST", value: "true" }]);
    });

    it("should handle exceptions", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: "test-user-id",
        email: "admin@test.com",
        name: "Admin Test",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
        firstName: "Admin",
        lastName: "Test",
      });
      mockPrisma.systemSetting.findMany.mockRejectedValue(
        new Error("Database error")
      );
      const result = await getSystemSettingsAction();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("updateSystemSettingAction", () => {
    it("should return forbidden if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(new Error("Non autorisé"));
      const result = await updateSystemSettingAction(
        FeatureKey.GLASGOW_SYSTEM,
        false
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Non autorisé");
    });

    it("should upsert setting and revalidate tag if super admin", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: "test-user-id",
        email: "admin@test.com",
        name: "Admin Test",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
        firstName: "Admin",
        lastName: "Test",
      });
      const result = await updateSystemSettingAction(
        FeatureKey.GLASGOW_SYSTEM,
        false
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: FeatureKey.GLASGOW_SYSTEM },
        update: { value: "false" },
        create: { key: FeatureKey.GLASGOW_SYSTEM, value: "false" },
      });
      expect(revalidateTag).toHaveBeenCalledWith("system-features", "default");
    });

    it("should handle exceptions", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue({
        id: "test-user-id",
        email: "admin@test.com",
        name: "Admin Test",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
        firstName: "Admin",
        lastName: "Test",
      });
      mockPrisma.systemSetting.upsert.mockRejectedValue(
        new Error("Upsert error")
      );
      const result = await updateSystemSettingAction(
        FeatureKey.GLASGOW_SYSTEM,
        true
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Upsert error");
    });
  });

  describe("getPlayerModulesAction", () => {
    it("should return forbidden if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(new Error("Non autorisé"));
      const result = await getPlayerModulesAction();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Non autorisé");
    });

    it("should default modules to enabled and apply stored values", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: PlayerModuleKey.LEADERBOARD, value: "false" },
      ]);
      const result = await getPlayerModulesAction();
      expect(result.success).toBe(true);
      expect(result.data?.[PlayerModuleKey.LEADERBOARD]).toBe(false);
      expect(result.data?.[PlayerModuleKey.BOUTIQUE]).toBe(true);
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith({
        where: { key: { startsWith: "MODULE_" } },
      });
    });
  });

  describe("updatePlayerModuleAction", () => {
    it("should return forbidden if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(new Error("Non autorisé"));
      const result = await updatePlayerModuleAction(
        PlayerModuleKey.BOUTIQUE,
        false
      );
      expect(result.success).toBe(false);
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("should reject unknown module keys", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
      const result = await updatePlayerModuleAction(
        FeatureKey.PLAYER_SYSTEM,
        false
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Module inconnu.");
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("should upsert module and revalidate tag", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      const result = await updatePlayerModuleAction(
        PlayerModuleKey.DAILY_QUESTS,
        false
      );
      expect(result.success).toBe(true);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: PlayerModuleKey.DAILY_QUESTS },
        update: { value: "false" },
        create: { key: PlayerModuleKey.DAILY_QUESTS, value: "false" },
      });
      expect(revalidateTag).toHaveBeenCalledWith("system-features", "default");
    });
  });
});
