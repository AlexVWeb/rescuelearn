import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

// --- Mocks ---
vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn().mockImplementation((promises) => Promise.all(promises)),
  learningCard: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
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
import {
  getAdminLearningCardsAction,
  getPublicLearningCardsAction,
  getPublicLearningCardsFiltersAction,
  createLearningCardAction,
  updateLearningCardAction,
  deleteLearningCardAction,
  bulkCreateLearningCardsAction,
} from "@/app/actions/learning-card-actions";

describe("learning-card-actions", () => {
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

  describe("getAdminLearningCardsAction", () => {
    it("should return Forbidden if user is not SUPER_ADMIN", async () => {
      mockUser([UserRole.FORMATEUR]);
      const res = await getAdminLearningCardsAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Forbidden");
    });

    it("should successfully fetch learning cards for admin", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.learningCard.findMany.mockResolvedValue([
        {
          id: 1,
          theme: "Cardio",
          niveau: "PSE1",
          info: "PLS text info",
          reference: "Page 10",
          referencielId: 2,
          referenciel: { id: 2, title: "Ref title", pdfUrl: "/pdf.pdf" },
        },
      ]);
      mockPrisma.learningCard.count.mockResolvedValue(1);

      const res = await getAdminLearningCardsAction(1, 10, "Cardio");
      expect(res.success).toBe(true);
      expect(res.data!).toHaveLength(1);
      expect(res.data![0].theme).toBe("Cardio");
    });
  });

  describe("getPublicLearningCardsAction", () => {
    it("should fetch all learning cards for public without auth check", async () => {
      mockPrisma.learningCard.findMany.mockResolvedValue([
        {
          id: 1,
          theme: "Cardio",
          niveau: "PSE1",
          info: "PLS text info",
          reference: "Page 10",
          referencielId: 2,
          referenciel: { pdfUrl: "/pdf.pdf" },
        },
      ]);

      const res = await getPublicLearningCardsAction();
      expect(res.success).toBe(true);
      expect(res.data!).toEqual([
        {
          id: 1,
          theme: "Cardio",
          niveau: "PSE1",
          info: "PLS text info",
          reference: "Page 10",
          pdfUrl: "/pdf.pdf",
        },
      ]);
    });
  });

  describe("getPublicLearningCardsFiltersAction", () => {
    it("should generate distinct themes and levels", async () => {
      mockPrisma.learningCard.findMany.mockResolvedValue([
        { theme: "Cardio", niveau: "PSE1" },
        { theme: "Cardio", niveau: "PSE2" },
        { theme: "Trauma", niveau: "PSE1" },
      ]);

      const res = await getPublicLearningCardsFiltersAction();
      expect(res.success).toBe(true);
      expect(res.data!.themes).toEqual([
        { theme: "Cardio" },
        { theme: "Trauma" },
      ]);
      expect(res.data!.niveaux).toEqual([
        { niveau: "PSE1" },
        { niveau: "PSE2" },
      ]);
    });
  });

  describe("createLearningCardAction", () => {
    it("should return Forbidden if not SUPER_ADMIN", async () => {
      mockUser([UserRole.FORMATEUR]);
      const res = await createLearningCardAction({});
      expect(res.success).toBe(false);
      expect(res.error).toBe("Forbidden");
    });

    it("should return error if payload validation fails", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      const res = await createLearningCardAction({ theme: "" });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Paramètres invalides");
    });

    it("should create a card successfully", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      const cardData = {
        theme: "Cardio",
        niveau: "PSE1",
        info: "PLS info",
        reference: "Page 15",
        referencielId: 1,
      };

      mockPrisma.learningCard.create.mockResolvedValue({ id: 1, ...cardData });

      const res = await createLearningCardAction(cardData);
      expect(res.success).toBe(true);
      expect(mockPrisma.learningCard.create).toHaveBeenCalledWith({
        data: {
          theme: "Cardio",
          niveau: "PSE1",
          info: "PLS info",
          reference: "Page 15",
          referencielId: 1,
        },
      });
    });
  });

  describe("updateLearningCardAction", () => {
    it("should update a card successfully", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      const cardData = {
        theme: "Cardio Updated",
        niveau: "PSE1",
        info: "PLS info updated",
        reference: "Page 20",
        referencielId: 1,
      };

      mockPrisma.learningCard.update.mockResolvedValue({ id: 1, ...cardData });

      const res = await updateLearningCardAction(1, cardData);
      expect(res.success).toBe(true);
      expect(mockPrisma.learningCard.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          theme: "Cardio Updated",
          niveau: "PSE1",
          info: "PLS info updated",
          reference: "Page 20",
          referencielId: 1,
        },
      });
    });
  });

  describe("deleteLearningCardAction", () => {
    it("should delete a card successfully", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.learningCard.delete.mockResolvedValue({ id: 1 });

      const res = await deleteLearningCardAction(1);
      expect(res.success).toBe(true);
      expect(mockPrisma.learningCard.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("bulkCreateLearningCardsAction", () => {
    it("should return Forbidden if user is not SUPER_ADMIN", async () => {
      mockUser([UserRole.FORMATEUR]);
      const res = await bulkCreateLearningCardsAction({});
      expect(res.success).toBe(false);
      expect(res.error).toBe("Forbidden");
    });

    it("should bulk create learning cards successfully", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      const payload = {
        referencielId: 1,
        cards: [
          {
            theme: "Theme A",
            niveau: "PSE1",
            info: "Info A",
            reference: "Page 1",
          },
          {
            theme: "Theme B",
            niveau: "PSE2",
            info: "Info B",
            reference: "Page 2",
          },
        ],
      };

      mockPrisma.learningCard.create.mockResolvedValue({ id: 1 });

      const res = await bulkCreateLearningCardsAction(payload);
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(mockPrisma.learningCard.create).toHaveBeenCalledTimes(2);
    });
  });
});
