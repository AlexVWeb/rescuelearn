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
} from "@/app/actions/system-settings-actions";

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
});
