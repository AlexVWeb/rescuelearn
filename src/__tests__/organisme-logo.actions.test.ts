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

const mockR2 = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getPresignedUrl: vi.fn(),
}));

vi.mock("@/lib/r2", () => mockR2);

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
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

// --- Helpers ---

import { auth } from "@/lib/auth";

function mockSession(userId = "user-1") {
  const fakeUser = {
    id: userId,
    organismeId: "org-1",
    roles: [UserRole.ADMIN_ORGANISME],
  };
  vi.mocked(getUserContext).mockResolvedValue(fakeUser as any);
  vi.mocked(requireOrganisme).mockResolvedValue(fakeUser as any);
  vi.mocked(getTenantPrisma).mockResolvedValue(mockPrisma as any);
}

function mockUnauthenticated() {
  vi.mocked(getUserContext).mockRejectedValue(new Error("Non autorisé"));
  vi.mocked(requireOrganisme).mockRejectedValue(new Error("Non autorisé"));
}

function mockUser(overrides: {
  organismeId?: string | null;
  roles?: string[];
}) {
  const fakeUser = {
    id: "user-1",
    organismeId: "org-1",
    roles: [UserRole.SUPER_ADMIN],
    ...overrides,
  };
  vi.mocked(getUserContext).mockResolvedValue(fakeUser as any);
  vi.mocked(requireOrganisme).mockResolvedValue(fakeUser as any);
  vi.mocked(getTenantPrisma).mockResolvedValue(mockPrisma as any);
}

function makeFormData(mimeType: string, sizeBytes: number): FormData {
  const buffer = new Uint8Array(sizeBytes);
  const file = new File([buffer], "logo.png", { type: mimeType });
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
  requireOrganisme: vi.fn(),
  getTenantPrisma: vi.fn(),
}));

import {
  getUserContext,
  requireOrganisme,
  getTenantPrisma,
} from "@/lib/context";

// --- Imports under test ---

import {
  uploadOrganismeLogoAction,
  deleteOrganismeLogoAction,
  getOrganismeLogoUrlAction,
} from "@/app/actions/logo.actions";

// --- uploadOrganismeLogoAction ---

describe("uploadOrganismeLogoAction", () => {
  it("returns Unauthorized when not authenticated", async () => {
    mockUnauthenticated();
    const fd = makeFormData("image/png", 100);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("returns Forbidden when non-super-admin tries to upload to another organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-other" });
    const fd = makeFormData("image/png", 100);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("allows ADMIN_ORGANISME to upload logo for their own organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-1" });
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: null,
    });
    mockR2.uploadFile.mockResolvedValue(
      "https://r2.example.com/organismes/org-1/logo.png"
    );
    mockPrisma.organisme.update.mockResolvedValue({});
    const fd = makeFormData("image/png", 100);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({ success: true });
  });

  it("returns error when file is missing", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    const fd = new FormData();

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({ success: false, error: "Fichier manquant" });
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("returns error for invalid MIME type", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    const fd = makeFormData("application/pdf", 100);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({
      success: false,
      error: "Format non supporté. Utilisez PNG, JPG, SVG ou WebP.",
    });
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("returns error when file exceeds 2MB", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    const fd = makeFormData("image/png", 2 * 1024 * 1024 + 1);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({
      success: false,
      error: "Fichier trop volumineux (max 2 Mo).",
    });
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("deletes old logo before uploading new one", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: "organismes/org-1/logo.jpg",
    });
    mockR2.uploadFile.mockResolvedValue(
      "https://r2.example.com/organismes/org-1/logo.png"
    );
    mockPrisma.organisme.update.mockResolvedValue({});
    const fd = makeFormData("image/png", 100);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(mockR2.deleteFile).toHaveBeenCalledWith("organismes/org-1/logo.jpg");
    expect(result).toEqual({ success: true });
    expect(mockR2.uploadFile).toHaveBeenCalled();
  });

  it("uploads to R2 and saves key in DB", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: null,
    });
    mockR2.uploadFile.mockResolvedValue(
      "https://r2.example.com/organismes/org-1/logo.png"
    );
    mockPrisma.organisme.update.mockResolvedValue({});
    const fd = makeFormData("image/png", 100);

    const result = await uploadOrganismeLogoAction("org-1", fd);

    expect(result).toEqual({ success: true });
    expect(mockR2.uploadFile).toHaveBeenCalledWith(
      "organismes/org-1/logo.png",
      expect.any(Buffer),
      "image/png"
    );
    expect(mockPrisma.organisme.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { logo: "organismes/org-1/logo.png" },
    });
  });
});

// --- deleteOrganismeLogoAction ---

describe("deleteOrganismeLogoAction", () => {
  it("returns Unauthorized when not authenticated", async () => {
    mockUnauthenticated();

    const result = await deleteOrganismeLogoAction("org-1");

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns Forbidden when non-super-admin tries to delete logo of another organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-other" });

    const result = await deleteOrganismeLogoAction("org-1");

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(mockR2.deleteFile).not.toHaveBeenCalled();
  });

  it("allows ADMIN_ORGANISME to delete logo of their own organisme", async () => {
    mockSession();
    mockUser({ roles: [UserRole.ADMIN_ORGANISME], organismeId: "org-1" });
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: null,
    });
    mockPrisma.organisme.update.mockResolvedValue({});

    const result = await deleteOrganismeLogoAction("org-1");

    expect(result).toEqual({ success: true });
  });

  it("does nothing in R2 when organisme has no logo", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: null,
    });
    mockPrisma.organisme.update.mockResolvedValue({});

    const result = await deleteOrganismeLogoAction("org-1");

    expect(result).toEqual({ success: true });
    expect(mockR2.deleteFile).not.toHaveBeenCalled();
  });

  it("deletes from R2 and sets logo to null in DB", async () => {
    mockSession();
    mockUser({ roles: [UserRole.SUPER_ADMIN] });
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: "organismes/org-1/logo.png",
    });
    mockR2.deleteFile.mockResolvedValue(undefined);
    mockPrisma.organisme.update.mockResolvedValue({});

    const result = await deleteOrganismeLogoAction("org-1");

    expect(result).toEqual({ success: true });
    expect(mockR2.deleteFile).toHaveBeenCalledWith("organismes/org-1/logo.png");
    expect(mockPrisma.organisme.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { logo: null },
    });
  });
});

// --- getOrganismeLogoUrlAction ---

describe("getOrganismeLogoUrlAction", () => {
  it("returns Unauthorized when not authenticated", async () => {
    mockUnauthenticated();

    const result = await getOrganismeLogoUrlAction("org-1");

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockR2.getPresignedUrl).not.toHaveBeenCalled();
  });

  it("returns error when organisme has no logo", async () => {
    mockSession();
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: null,
    });

    const result = await getOrganismeLogoUrlAction("org-1");

    expect(result).toEqual({ success: false, error: "Aucun logo" });
    expect(mockR2.getPresignedUrl).not.toHaveBeenCalled();
  });

  it("returns presigned URL when logo exists", async () => {
    mockSession();
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      logo: "organismes/org-1/logo.png",
    });
    mockR2.getPresignedUrl.mockResolvedValue(
      "https://r2.example.com/signed-url"
    );

    const result = await getOrganismeLogoUrlAction("org-1");

    expect(result).toEqual({
      success: true,
      url: "https://r2.example.com/signed-url",
    });
    expect(mockR2.getPresignedUrl).toHaveBeenCalledWith(
      "organismes/org-1/logo.png"
    );
  });
});

// --- getLogoAsBase64 ---

import { getLogoAsBase64 } from "@/lib/organisme-logo";

describe("getLogoAsBase64", () => {
  it("returns null when logoKey is null", async () => {
    const result = await getLogoAsBase64(null);
    expect(result).toBeNull();
    expect(mockR2.getPresignedUrl).not.toHaveBeenCalled();
  });

  it("fetches presigned URL and returns base64 data URI", async () => {
    const fakeUrl = "https://r2.example.com/signed-url";
    mockR2.getPresignedUrl.mockResolvedValue(fakeUrl);

    const fakeContent = "fake-image-content";
    const fakeBytes = new TextEncoder().encode(fakeContent);
    const base64Expected = Buffer.from(fakeBytes).toString("base64");
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
      headers: { get: () => "image/png" },
    } as unknown as Response);

    const result = await getLogoAsBase64("organismes/org-1/logo.png");

    expect(mockR2.getPresignedUrl).toHaveBeenCalledWith(
      "organismes/org-1/logo.png"
    );
    expect(result).toBe(`data:image/png;base64,${base64Expected}`);
  });

  it("returns null when fetch fails", async () => {
    mockR2.getPresignedUrl.mockResolvedValue(
      "https://r2.example.com/signed-url"
    );
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await getLogoAsBase64("organismes/org-1/logo.png");

    expect(result).toBeNull();
  });
});
