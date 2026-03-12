import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  organisme: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// --- Helpers ---

import { auth } from "@/lib/auth";

function mockSession(userId = "user-1") {
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue({
    user: { id: userId },
  });
}

function mockUnauthenticated() {
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue(null);
}

function mockUser(overrides: {
  id?: string;
  organismeId?: string | null;
  roles?: string[];
}) {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId: "org-1",
    roles: [UserRole.ADMIN_ORGANISME],
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Tests ---

import {
  getMyOrganismeAction,
  updateOrganismeAction,
} from "@/app/actions/organisme-actions";

describe("getMyOrganismeAction", () => {
  it("returns Unauthorized when not authenticated", async () => {
    mockUnauthenticated();

    const result = await getMyOrganismeAction();

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns Forbidden when user does not have ADMIN_ORGANISME role", async () => {
    mockSession();
    mockUser({ roles: [UserRole.FORMATEUR] });

    const result = await getMyOrganismeAction();

    expect(result).toEqual({ success: false, error: "Forbidden" });
  });

  it("returns error when user has no organisme linked", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: null });

    const result = await getMyOrganismeAction();

    expect(result).toEqual({
      success: false,
      error: "Aucun organisme associé à votre compte",
    });
  });

  it("returns the organisme when user is ADMIN_ORGANISME with an organismeId", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-1" });
    const fakeOrganisme = { id: "org-1", name: "Mon Organisme" };
    mockPrisma.organisme.findUnique.mockResolvedValue(fakeOrganisme);

    const result = await getMyOrganismeAction();

    expect(result).toEqual({ success: true, data: fakeOrganisme });
    expect(mockPrisma.organisme.findUnique).toHaveBeenCalledWith({
      where: { id: "org-1" },
    });
  });
});

describe("updateOrganismeAction - ownership check", () => {
  const validData = {
    name: "Updated",
    siret: "",
    agreementNumber: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    postalCode: "",
    city: "",
  };

  it("returns Forbidden when non-super-admin tries to update another organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-1" });

    const result = await updateOrganismeAction("org-999", validData);

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(mockPrisma.organisme.update).not.toHaveBeenCalled();
  });

  it("allows non-super-admin to update their own organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-1" });
    mockPrisma.organisme.update.mockResolvedValue({});

    const result = await updateOrganismeAction("org-1", validData);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.organisme.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "org-1" } })
    );
  });

  it("allows SUPER_ADMIN to update any organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN], organismeId: "org-1" });
    mockPrisma.organisme.update.mockResolvedValue({});

    const result = await updateOrganismeAction("org-999", validData);

    expect(result).toEqual({ success: true });
    expect(mockPrisma.organisme.update).toHaveBeenCalled();
  });
});
