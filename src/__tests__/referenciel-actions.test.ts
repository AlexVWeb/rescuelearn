import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

// --- Mocks ---
vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  referenciel: {
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
}));

vi.mock("@/lib/r2", () => ({
  uploadFile: vi
    .fn()
    .mockResolvedValue("https://r2.example.com/dev/referenciels/test.pdf"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getPresignedUrl: vi
    .fn()
    .mockResolvedValue(
      "https://r2-presigned.example.com/dev/referenciels/test.pdf"
    ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getUserContext } from "@/lib/context";
import { uploadFile } from "@/lib/r2";

process.env.R2_PUBLIC_URL = "https://r2.example.com";
import {
  getReferencielsAction,
  deleteReferencielAction,
  createReferencielAction,
  getPresignedUrlAction,
} from "@/app/actions/referenciel-actions";

describe("referenciel-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = (roles: string[]) => {
    vi.mocked(getUserContext).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      roles,
      organismeId: null,
      firstName: "Test",
      lastName: "User",
    });
  };

  describe("getReferencielsAction", () => {
    it("should return Forbidden if user is not SUPER_ADMIN", async () => {
      mockUser([UserRole.FORMATEUR]);
      const res = await getReferencielsAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Forbidden");
    });

    it("should successfully fetch referenciels and sign R2 urls", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.referenciel.findMany.mockResolvedValue([
        {
          id: 1,
          title: "PSE",
          pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
        },
      ]);
      mockPrisma.referenciel.count.mockResolvedValue(1);

      const res = await getReferencielsAction(1, 10, "PSE");
      expect(res.success).toBe(true);
      expect(res.data).toEqual([
        {
          id: 1,
          title: "PSE",
          pdfUrl: "https://r2-presigned.example.com/dev/referenciels/test.pdf",
        },
      ]);
    });
  });

  describe("getPresignedUrlAction", () => {
    it("should sign absolute R2 URL", async () => {
      const res = await getPresignedUrlAction(
        "https://r2.example.com/dev/referenciels/pse1.pdf"
      );
      expect(res).toBe(
        "https://r2-presigned.example.com/dev/referenciels/test.pdf"
      );
    });

    it("should return the original URL if not absolute R2 URL", async () => {
      const res = await getPresignedUrlAction("/referenciels/local.pdf");
      expect(res).toBe("/referenciels/local.pdf");
    });
  });

  describe("deleteReferencielAction", () => {
    it("should delete referenciel from DB", async () => {
      mockUser([UserRole.SUPER_ADMIN]);

      const res = await deleteReferencielAction(1);
      expect(res.success).toBe(true);
      expect(mockPrisma.referenciel.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("createReferencielAction", () => {
    it("should create referenciel and upload file to R2", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      const file = new File(["testcontent"], "pse1.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("title", "PSE 1");
      formData.append("yearEdition", "2026");
      formData.append("file", file);

      const res = await createReferencielAction(formData);
      expect(res.success).toBe(true);
      expect(uploadFile).toHaveBeenCalled();
      expect(mockPrisma.referenciel.create).toHaveBeenCalledWith({
        data: {
          title: "PSE 1",
          yearEdition: 2026,
          pdfUrl: "https://r2.example.com/dev/referenciels/test.pdf",
        },
      });
    });
  });
});
