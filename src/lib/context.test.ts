import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserContext, requireOrganisme, getTenantPrisma } from "./context";
import { auth } from "./auth";
import { prisma, withOrganisme } from "./prisma";

vi.mock("./auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
  withOrganisme: vi.fn().mockReturnValue("tenant-prisma"),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

describe("Context Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserContext", () => {
    it("returns user if session and user exist", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u1" },
      } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        email: "test@test.com",
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await getUserContext();
      expect(result.id).toBe("u1");
    });

    it("throws if session is missing", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      await expect(getUserContext()).rejects.toThrow("Non autorisé");
    });

    it("throws if user is missing in DB", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u1" },
      } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(getUserContext()).rejects.toThrow("Utilisateur introuvable");
    });
  });

  describe("requireOrganisme", () => {
    it("returns user if organismeId exists", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u1" },
      } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await requireOrganisme();
      expect(result.organismeId).toBe("org-1");
    });

    it("throws if organismeId is missing", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u1" },
      } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        organismeId: null,
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);
      await expect(requireOrganisme()).rejects.toThrow(
        "Aucun organisme associé"
      );
    });
  });

  describe("getTenantPrisma", () => {
    it("returns extended prisma client", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u1" },
      } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        organismeId: "org-1",
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await getTenantPrisma();
      expect(result).toBe("tenant-prisma");
      expect(withOrganisme).toHaveBeenCalledWith("org-1");
    });
  });
});
