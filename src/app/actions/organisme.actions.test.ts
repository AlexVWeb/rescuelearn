import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrganismesAction,
  getOrganismeByIdAction,
  createOrganismeAction,
  getMyOrganismeAction,
  updateOrganismeAction,
  deleteOrganismeAction,
} from "./organisme.actions";
import { withOrganisme } from "@/lib/prisma";
import { requireOrganisme, getUserContext } from "@/lib/context";
import { hasRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { inviteMemberAction } from "./invitation.actions";

// --- Mocks ---

vi.mock("./invitation.actions", () => ({
  inviteMemberAction: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  organisme: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
  getUserContext: vi.fn(),
}));

vi.mock("@/lib/roles", () => ({
  hasRole: vi.fn(),
  UserRole: {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN_ORGANISME: "ADMIN_ORGANISME",
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Organisme Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrganismesAction", () => {
    it("returns a paginated list of organismes", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.findMany.mockResolvedValue([
        { id: "o1", name: "Org 1" },
      ]);
      mockPrisma.organisme.count.mockResolvedValue(1);

      const result = await getOrganismesAction(1, 10, "search");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta?.total).toBe(1);
      expect(mockPrisma.organisme.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it("handles errors", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.findMany.mockRejectedValue(new Error("DB Error"));

      const result = await getOrganismesAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch organismes");
    });
  });

  describe("getOrganismeByIdAction", () => {
    it("returns organisme for super admin using global prisma", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
        organismeId: "any",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.findUnique.mockResolvedValue({ id: "o1" });

      const result = await getOrganismeByIdAction("o1");

      expect(result.success).toBe(true);
      expect(withOrganisme).not.toHaveBeenCalled();
    });

    it("returns organisme for regular admin using withOrganisme", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["ADMIN"],
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(false);
      mockPrisma.organisme.findUnique.mockResolvedValue({ id: "o1" });

      const result = await getOrganismeByIdAction("o1");

      expect(result.success).toBe(true);
      expect(withOrganisme).toHaveBeenCalledWith("org-1");
    });

    it("handles fetch errors", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
        organismeId: "any",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.findUnique.mockRejectedValue(
        new Error("Fetch fail")
      );

      const result = await getOrganismeByIdAction("o1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch organisme");
    });
  });

  describe("createOrganismeAction", () => {
    it("creates an organisme if super admin", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.create.mockResolvedValue({ id: "new-o" });

      const result = await createOrganismeAction({
        name: "New",
      } as unknown as Parameters<typeof createOrganismeAction>[0]);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/admin/organismes");
    });

    it("returns unauthorized if not super admin", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["USER"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(false);

      const result = await createOrganismeAction({
        name: "New",
      } as unknown as Parameters<typeof createOrganismeAction>[0]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles create errors", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.create.mockRejectedValue(new Error("Create fail"));

      const result = await createOrganismeAction({
        name: "New",
      } as unknown as Parameters<typeof createOrganismeAction>[0]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create organisme");
    });

    it("invites an admin on creation if createAdmin is true", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.create.mockResolvedValue({ id: "new-o" });
      vi.mocked(inviteMemberAction).mockResolvedValue({
        success: true,
        message: "Invitation envoyée avec succès.",
      });

      const result = await createOrganismeAction({
        name: "New",
        createAdmin: true,
        useContactEmailAsAdmin: false,
        adminEmail: "admin@test.com",
      } as unknown as Parameters<typeof createOrganismeAction>[0]);

      expect(result.success).toBe(true);
      expect(inviteMemberAction).toHaveBeenCalledWith({
        email: "admin@test.com",
        role: "ADMIN_ORGANISME",
        organismeId: "new-o",
      });
    });

    it("invites contact email on creation if createAdmin and useContactEmailAsAdmin are true", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.create.mockResolvedValue({ id: "new-o" });
      vi.mocked(inviteMemberAction).mockResolvedValue({
        success: true,
        message: "Invitation envoyée avec succès.",
      });

      const result = await createOrganismeAction({
        name: "New",
        email: "contact@test.com",
        createAdmin: true,
        useContactEmailAsAdmin: true,
      } as unknown as Parameters<typeof createOrganismeAction>[0]);

      expect(result.success).toBe(true);
      expect(inviteMemberAction).toHaveBeenCalledWith({
        email: "contact@test.com",
        role: "ADMIN_ORGANISME",
        organismeId: "new-o",
      });
    });
  });

  describe("getMyOrganismeAction", () => {
    it("returns own organisme", async () => {
      vi.mocked(requireOrganisme).mockResolvedValue({
        organismeId: "org-1",
        roles: ["ADMIN_ORGANISME"],
      } as unknown as Awaited<ReturnType<typeof requireOrganisme>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.findUnique.mockResolvedValue({ id: "org-1" });

      const result = await getMyOrganismeAction();

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("org-1");
    });

    it("handles authorized error from requireOrganisme", async () => {
      vi.mocked(requireOrganisme).mockRejectedValue(new Error("Non autorisé"));
      const result = await getMyOrganismeAction();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("handles other errors in getMyOrganismeAction", async () => {
      vi.mocked(requireOrganisme).mockResolvedValue({
        organismeId: "org-1",
        roles: ["ADMIN_ORGANISME"],
      } as unknown as Awaited<ReturnType<typeof requireOrganisme>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.findUnique.mockRejectedValue(
        new Error("Random Error")
      );

      const result = await getMyOrganismeAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch organisme");
    });
  });

  describe("updateOrganismeAction", () => {
    it("updates organisme if super admin", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValueOnce(true); // isSuperAdmin
      mockPrisma.organisme.update.mockResolvedValue({ id: "o1" });

      const result = await updateOrganismeAction("o1", {
        name: "Updated",
      } as unknown as Parameters<typeof updateOrganismeAction>[1]);

      expect(result.success).toBe(true);
    });

    it("updates own organisme if admin", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["ADMIN"],
        organismeId: "o1",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValueOnce(false); // isSuperAdmin
      mockPrisma.organisme.update.mockResolvedValue({ id: "o1" });

      const result = await updateOrganismeAction("o1", {
        name: "Updated",
      } as unknown as Parameters<typeof updateOrganismeAction>[1]);

      expect(result.success).toBe(true);
    });

    it("returns forbidden if updating another organisme", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["ADMIN"],
        organismeId: "o2",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValueOnce(false); // isSuperAdmin

      const result = await updateOrganismeAction("o1", {
        name: "Updated",
      } as unknown as Parameters<typeof updateOrganismeAction>[1]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden");
    });

    it("handles update errors", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValueOnce(true);
      mockPrisma.organisme.update.mockRejectedValue(new Error("Update fail"));

      const result = await updateOrganismeAction("o1", {
        name: "Updated",
      } as unknown as Parameters<typeof updateOrganismeAction>[1]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update organisme");
    });
  });

  describe("deleteOrganismeAction", () => {
    it("deletes if super admin", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);

      const result = await deleteOrganismeAction("o1");

      expect(result.success).toBe(true);
      expect(mockPrisma.organisme.delete).toHaveBeenCalled();
    });

    it("returns forbidden if not super admin", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(false);

      const result = await deleteOrganismeAction("o1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden");
    });

    it("handles delete errors", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      vi.mocked(hasRole).mockReturnValue(true);
      mockPrisma.organisme.delete.mockRejectedValue(new Error("Delete fail"));

      const result = await deleteOrganismeAction("o1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete organisme");
    });
  });
});
