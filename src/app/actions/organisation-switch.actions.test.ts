import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAvailableOrganizations,
  switchOrganization,
} from "./organisation-switch.actions";
import { getUserContext } from "@/lib/context";
import { revalidatePath } from "next/cache";

// --- Mocks ---
const mockPrisma = vi.hoisted(() => ({
  member: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Organization Switch Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableOrganizations", () => {
    it("should return organizations where user is a member", async () => {
      const userId = "u1";
      vi.mocked(getUserContext).mockResolvedValue({
        id: userId,
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockPrisma.member.findMany.mockResolvedValue([
        {
          id: "m1",
          userId,
          organizationId: "org-1",
          role: "admin",
          createdAt: new Date(),
          organization: {
            id: "org-1",
            name: "Organisation 1",
            logo: null,
          },
        },
        {
          id: "m2",
          userId,
          organizationId: "org-2",
          role: "member",
          createdAt: new Date(),
          organization: {
            id: "org-2",
            name: "Organisation 2",
            logo: "logo-url",
          },
        },
      ]);

      const result = await getAvailableOrganizations();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toEqual({
        id: "org-1",
        name: "Organisation 1",
        logo: null,
        role: "admin",
      });
      expect(result.currentOrganizationId).toBe("org-1");
    });

    it("should return empty array when user has no organizations", async () => {
      const userId = "u1";
      vi.mocked(getUserContext).mockResolvedValue({
        id: userId,
        organismeId: null,
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockPrisma.member.findMany.mockResolvedValue([]);

      const result = await getAvailableOrganizations();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.currentOrganizationId).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(getUserContext).mockRejectedValue(new Error("Auth error"));

      const result = await getAvailableOrganizations();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("switchOrganization", () => {
    const userId = "u1";
    const orgId = "org-1";

    beforeEach(() => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: userId,
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
    });

    it("should switch to a different organization if user is member", async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        id: "m1",
        userId,
        organizationId: orgId,
        role: "member",
      });
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        organismeId: orgId,
      });

      const result = await switchOrganization(orgId);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { organismeId: orgId },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
    });

    it("should fail if user is not member of organization", async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null);

      const result = await switchOrganization(orgId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("pas membre");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should handle errors during organization switch", async () => {
      mockPrisma.member.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await switchOrganization(orgId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
