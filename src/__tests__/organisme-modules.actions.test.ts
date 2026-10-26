import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  organismeModule: { findUnique: vi.fn(), upsert: vi.fn() },
}));
const mockUser = vi.hoisted(() => ({
  current: { roles: ["ADMIN_ORGANISME"], organismeId: "org-1" } as {
    roles: string[];
    organismeId: string | null;
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(async () => mockUser.current),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  setModuleAvailabilityAction,
  setModuleEnabledAction,
} from "@/app/actions/organisme-modules.actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { roles: ["ADMIN_ORGANISME"], organismeId: "org-1" };
});

describe("setModuleAvailabilityAction", () => {
  it("refuse un admin organisme", async () => {
    const result = await setModuleAvailabilityAction(
      "org-1",
      "evaluation",
      false
    );
    expect(result.success).toBe(false);
    expect(mockPrisma.organismeModule.upsert).not.toHaveBeenCalled();
  });

  it("super admin : upsert avec défaut enabled", async () => {
    mockUser.current = { roles: ["SUPER_ADMIN"], organismeId: null };
    const result = await setModuleAvailabilityAction(
      "org-2",
      "evaluation",
      true
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.organismeModule.upsert).toHaveBeenCalledWith({
      where: {
        organismeId_module: { organismeId: "org-2", module: "evaluation" },
      },
      create: {
        organismeId: "org-2",
        module: "evaluation",
        available: true,
        enabled: false,
      },
      update: { available: true },
    });
  });

  it("refuse un module inconnu", async () => {
    mockUser.current = { roles: ["SUPER_ADMIN"], organismeId: null };
    const result = await setModuleAvailabilityAction("org-2", "nope", true);
    expect(result.success).toBe(false);
  });
});

describe("setModuleEnabledAction", () => {
  it("admin organisme : agit sur son organisme, ignore organismeId fourni", async () => {
    mockPrisma.organismeModule.findUnique.mockResolvedValue(null);
    const result = await setModuleEnabledAction(
      "evaluation",
      true,
      "org-autre"
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.organismeModule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organismeId_module: { organismeId: "org-1", module: "evaluation" },
        },
      })
    );
  });

  it("refuse si le module est indisponible", async () => {
    mockPrisma.organismeModule.findUnique.mockResolvedValue({
      module: "evaluation",
      available: false,
      enabled: false,
    });
    const result = await setModuleEnabledAction("evaluation", true);
    expect(result).toEqual({ success: false, error: "Module non disponible" });
    expect(mockPrisma.organismeModule.upsert).not.toHaveBeenCalled();
  });

  it("refuse un formateur", async () => {
    mockUser.current = { roles: ["FORMATEUR"], organismeId: "org-1" };
    const result = await setModuleEnabledAction("evaluation", true);
    expect(result.success).toBe(false);
  });

  it("super admin : organismeId obligatoire", async () => {
    mockUser.current = { roles: ["SUPER_ADMIN"], organismeId: null };
    const result = await setModuleEnabledAction("evaluation", true);
    expect(result.success).toBe(false);
  });
});
