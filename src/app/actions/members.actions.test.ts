import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrganismeMembersAction,
  updateMemberRoleAction,
  removeMemberFromOrganismeAction,
} from "./members.actions";
import { getUserContext, requireOrganisme } from "@/lib/context";

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
  requireOrganisme: vi.fn(),
}));

const {
  mockFindMany,
  mockUpdate,
  mockFindUnique,
  mockUpdateMany,
  mockMemberFindMany,
  mockUserUpdate,
  mockMemberDeleteMany,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockMemberFindMany: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockMemberDeleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      update: mockUserUpdate,
    },
    member: {
      updateMany: mockUpdateMany,
      findMany: mockMemberFindMany,
      deleteMany: mockMemberDeleteMany,
    },
  },
  withOrganisme: vi.fn(() => ({
    user: {
      findMany: mockFindMany,
      update: mockUpdate,
    },
  })),
}));

describe("members.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrganismeMembersAction", () => {
    it("should fail if no organismeId is resolved or passed", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "user-1",
        roles: ["FORMATEUR"],
        organismeId: null,
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      const result = await getOrganismeMembersAction();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Aucun organisme associé");
    });

    it("should allow a SuperAdmin to fetch members of any organisme", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "super-1",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockMemberFindMany.mockResolvedValue([
        {
          createdAt: new Date(),
          user: { id: "member-1", name: "Alice", roles: ["FORMATEUR"] },
        },
      ]);

      const result = await getOrganismeMembersAction("target-org-id");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe("Alice");
      expect(mockMemberFindMany).toHaveBeenCalledWith({
        where: { organizationId: "target-org-id" },
        include: expect.any(Object),
        orderBy: { createdAt: "asc" },
      });
    });

    it("should allow a regular member to fetch members of their own organisme", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "user-2",
        roles: ["FORMATEUR"],
        organismeId: "my-org-id",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockMemberFindMany.mockResolvedValue([
        {
          createdAt: new Date(),
          user: { id: "member-2", name: "Bob", roles: ["FORMATEUR"] },
        },
      ]);

      const result = await getOrganismeMembersAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe("Bob");
      expect(mockMemberFindMany).toHaveBeenCalledWith({
        where: { organizationId: "my-org-id" },
        include: expect.any(Object),
        orderBy: { createdAt: "asc" },
      });
    });

    it("should fail (Forbidden) if a regular member tries to fetch members of a different organisme", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "user-2",
        roles: ["FORMATEUR"],
        organismeId: "my-org-id",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      const result = await getOrganismeMembersAction("other-org-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden");
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });

  describe("updateMemberRoleAction", () => {
    it("should update member roles and member table, preserving SUPER_ADMIN", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "admin-1",
        roles: ["ADMIN_ORGANISME"],
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockFindUnique.mockResolvedValue({
        id: "target-user",
        roles: ["SUPER_ADMIN", "FORMATEUR"],
      });

      const result = await updateMemberRoleAction("target-user", ["FORMATEUR"]);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { roles: ["FORMATEUR", "SUPER_ADMIN"] },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId: "target-user", organizationId: "org-1" },
        data: { role: "member" },
      });
    });

    it("should allow a SUPER_ADMIN with null active organism to update member roles with explicit organismId", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "superadmin-1",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockFindUnique.mockResolvedValue({
        id: "target-user",
        roles: ["FORMATEUR"],
      });

      const result = await updateMemberRoleAction(
        "target-user",
        ["FORMATEUR"],
        "org-1"
      );

      expect(result.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { roles: ["FORMATEUR"] },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId: "target-user", organizationId: "org-1" },
        data: { role: "member" },
      });
    });
  });

  describe("removeMemberFromOrganismeAction", () => {
    it("should remove member and reset their active organismeId", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "admin-1",
        roles: ["ADMIN_ORGANISME"],
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockFindUnique.mockResolvedValue({
        id: "target-user",
        organismeId: "org-1",
      });

      const result = await removeMemberFromOrganismeAction("target-user");

      expect(result.success).toBe(true);
      expect(mockMemberDeleteMany).toHaveBeenCalledWith({
        where: { userId: "target-user", organizationId: "org-1" },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { organismeId: null },
      });
    });

    it("should allow a SUPER_ADMIN with null active organism to remove member", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "superadmin-1",
        roles: ["SUPER_ADMIN"],
        organismeId: null,
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockFindUnique.mockResolvedValue({
        id: "target-user",
        organismeId: "org-1",
      });

      const result = await removeMemberFromOrganismeAction(
        "target-user",
        "org-1"
      );

      expect(result.success).toBe(true);
      expect(mockMemberDeleteMany).toHaveBeenCalledWith({
        where: { userId: "target-user", organizationId: "org-1" },
      });
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { organismeId: null },
      });
    });
  });
});
