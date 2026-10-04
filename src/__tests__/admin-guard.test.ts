import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { auth } from "@/lib/auth";
import { checkSuperAdmin } from "@/lib/admin-guard";

const getSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

describe("checkSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne Unauthorized sans session", async () => {
    getSession.mockResolvedValue(null);
    expect(await checkSuperAdmin()).toBe("Unauthorized");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("retourne Forbidden pour un utilisateur sans rôle SUPER_ADMIN", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      roles: [UserRole.FORMATEUR],
    });
    expect(await checkSuperAdmin()).toBe("Forbidden");
  });

  it("retourne Forbidden si le compte n'existe plus", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await checkSuperAdmin()).toBe("Forbidden");
  });

  it("relit le rôle en base et autorise un SUPER_ADMIN", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({
      roles: [UserRole.SUPER_ADMIN],
    });
    expect(await checkSuperAdmin()).toBeNull();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { roles: true },
    });
  });
});
