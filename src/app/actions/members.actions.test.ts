import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrganismeMembersAction } from "./members.actions";
import { getUserContext } from "@/lib/context";
import { withOrganisme } from "@/lib/prisma";

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
  requireOrganisme: vi.fn(),
}));

const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {},
  withOrganisme: vi.fn(() => ({
    user: {
      findMany: mockFindMany,
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

      mockFindMany.mockResolvedValue([
        { id: "member-1", name: "Alice", roles: ["FORMATEUR"] },
      ]);

      const result = await getOrganismeMembersAction("target-org-id");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe("Alice");
      expect(withOrganisme).toHaveBeenCalledWith("target-org-id");
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { organismeId: "target-org-id" },
        select: expect.any(Object),
        orderBy: { createdAt: "asc" },
      });
    });

    it("should allow a regular member to fetch members of their own organisme", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "user-2",
        roles: ["FORMATEUR"],
        organismeId: "my-org-id",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockFindMany.mockResolvedValue([
        { id: "member-2", name: "Bob", roles: ["FORMATEUR"] },
      ]);

      const result = await getOrganismeMembersAction();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe("Bob");
      expect(withOrganisme).toHaveBeenCalledWith("my-org-id");
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
});
