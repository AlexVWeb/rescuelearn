import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

// --- Mocks ---
vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn().mockImplementation((ops) => Promise.all(ops)),
  quiz: { count: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  learningCard: { count: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
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

vi.mock("@/app/actions/referenciel-topic-actions", () => ({
  startReferencielAnalysisAction: vi.fn().mockResolvedValue({ success: true }),
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
import { startReferencielAnalysisAction } from "@/app/actions/referenciel-topic-actions";

process.env.R2_PUBLIC_URL = "https://r2.example.com";
import {
  getReferencielsAction,
  deleteReferencielAction,
  createReferencielAction,
  getPresignedUrlAction,
  getReferencielContentCountsAction,
  bulkReferencielContentAction,
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

  describe("referenciel content bulk actions", () => {
    const cardWhere = {
      OR: [{ referencielId: 7 }, { topic: { referencielId: 7 } }],
    };

    it("should forbid non SUPER_ADMIN users", async () => {
      mockUser([UserRole.FORMATEUR]);
      expect(await getReferencielContentCountsAction(7)).toEqual({
        success: false,
        error: "Forbidden",
      });
      expect(
        await bulkReferencielContentAction({ id: 7, action: "delete" })
      ).toEqual({ success: false, error: "Forbidden" });
      expect(mockPrisma.quiz.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.learningCard.deleteMany).not.toHaveBeenCalled();
    });

    it("should count active and archived content", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.quiz.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
      mockPrisma.learningCard.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);

      const res = await getReferencielContentCountsAction(7);
      expect(res).toEqual({
        success: true,
        data: {
          quizzes: { active: 3, archived: 1 },
          cards: { active: 10, archived: 0 },
        },
      });
      expect(mockPrisma.learningCard.count).toHaveBeenCalledWith({
        where: { ...cardWhere, archivedAt: null },
      });
    });

    it("should archive only active quizzes and cards of the referenciel", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.quiz.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.learningCard.updateMany.mockResolvedValue({ count: 8 });

      const res = await bulkReferencielContentAction({
        id: 7,
        action: "archive",
      });
      expect(res).toEqual({ success: true, data: { quizzes: 2, cards: 8 } });
      expect(mockPrisma.quiz.updateMany).toHaveBeenCalledWith({
        where: { referencielId: 7, archivedAt: null },
        data: { archivedAt: expect.any(Date) },
      });
      expect(mockPrisma.learningCard.updateMany).toHaveBeenCalledWith({
        where: { ...cardWhere, archivedAt: null },
        data: { archivedAt: expect.any(Date) },
      });
    });

    it("should only touch the selected targets", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.learningCard.deleteMany.mockResolvedValue({ count: 4 });

      const res = await bulkReferencielContentAction({
        id: 7,
        action: "delete",
        targets: ["cards"],
      });
      expect(res).toEqual({ success: true, data: { quizzes: 0, cards: 4 } });
      expect(mockPrisma.learningCard.deleteMany).toHaveBeenCalledWith({
        where: cardWhere,
      });
      expect(mockPrisma.quiz.deleteMany).not.toHaveBeenCalled();
    });
  });

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
          levels: [],
        },
      });
      expect(startReferencielAnalysisAction).not.toHaveBeenCalled();
    });

    it("should persist allowed levels and start the analysis when requested", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.referenciel.create.mockResolvedValue({ id: 42 });
      const formData = new FormData();
      formData.append("title", "PSE");
      formData.append("yearEdition", "2026");
      formData.append(
        "file",
        new File(["x"], "pse.pdf", { type: "application/pdf" })
      );
      formData.append("levels", "PSE1");
      formData.append("levels", "PSE2");
      formData.append("levels", "INCONNU");
      formData.append("analyze", "on");

      const res = await createReferencielAction(formData);

      expect(res.success).toBe(true);
      expect(mockPrisma.referenciel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ levels: ["PSE1", "PSE2"] }),
      });
      expect(startReferencielAnalysisAction).toHaveBeenCalledWith(42);
    });
  });
});
