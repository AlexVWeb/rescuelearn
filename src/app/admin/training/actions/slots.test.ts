import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSlot, deleteSlot, resetSlots } from "./slots";
import { requireOrganisme } from "@/lib/context";

// --- Mocks ---

const mockPrisma = vi.hoisted(() => ({
  trainingSession: {
    findFirst: vi.fn(),
  },
  slot: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  emargement: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("Slot Actions", () => {
  const mockUser = {
    id: "user-1",
    organismeId: "org-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
  });

  describe("createSlot", () => {
    it("successfully creates a slot", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        organismeId: "org-1",
        status: "planifiée",
      });
      mockPrisma.slot.create.mockResolvedValue({ id: "slot-1" });

      const data = {
        label: "Day 1",
        date: new Date(),
        startTime: "09:00",
        endTime: "17:00",
      };
      const result = await createSlot("s1", data);

      expect(result.id).toBe("slot-1");
      expect(mockPrisma.slot.create).toHaveBeenCalledWith({
        data: { ...data, trainingSessionId: "s1" },
      });
    });

    it("throws error if session is closed", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        organismeId: "org-1",
        status: "terminée",
      });

      await expect(
        createSlot("s1", {
          label: "Day 1",
          date: new Date(),
          startTime: "09:00",
          endTime: "17:00",
        })
      ).rejects.toThrow("Impossible de modifier une session clôturée");
    });

    it("throws error if session not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);

      await expect(
        createSlot("s1", {} as unknown as Parameters<typeof createSlot>[1])
      ).rejects.toThrow("Session introuvable");
    });
  });

  describe("deleteSlot", () => {
    it("successfully deletes a slot", async () => {
      mockPrisma.slot.findUnique.mockResolvedValue({
        id: "slot-1",
        trainingSession: { organismeId: "org-1", status: "planifiée" },
      });
      mockPrisma.slot.delete.mockResolvedValue({ id: "slot-1" });

      const result = await deleteSlot("slot-1");

      expect(result.id).toBe("slot-1");
      expect(mockPrisma.slot.delete).toHaveBeenCalledWith({
        where: { id: "slot-1" },
      });
    });

    it("throws error if session is closed", async () => {
      mockPrisma.slot.findUnique.mockResolvedValue({
        id: "slot-1",
        trainingSession: { organismeId: "org-1", status: "terminée" },
      });

      await expect(deleteSlot("slot-1")).rejects.toThrow(
        "Impossible de modifier une session clôturée"
      );
    });

    it("throws error if slot not found or unauthorized", async () => {
      mockPrisma.slot.findUnique.mockResolvedValue({
        id: "slot-1",
        trainingSession: { organismeId: "org-other", status: "planifiée" },
      });

      await expect(deleteSlot("slot-1")).rejects.toThrow(
        "Créneau introuvable ou non autorisé"
      );
    });

    it("throws error if slot does not exist", async () => {
      mockPrisma.slot.findUnique.mockResolvedValue(null);

      await expect(deleteSlot("none")).rejects.toThrow(
        "Créneau introuvable ou non autorisé"
      );
    });
  });

  describe("resetSlots", () => {
    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)
      );
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        organismeId: "org-1",
        status: "planifiée",
      });
    });

    it("supprime tous les créneaux de la session", async () => {
      mockPrisma.emargement.count.mockResolvedValue(0);
      mockPrisma.slot.deleteMany.mockResolvedValue({ count: 4 });

      const result = await resetSlots("s1");

      expect(result).toEqual({ success: true, deleted: 4 });
      expect(mockPrisma.trainingSession.findFirst).toHaveBeenCalledWith({
        where: { id: "s1", organismeId: "org-1" },
      });
      expect(mockPrisma.slot.deleteMany).toHaveBeenCalledWith({
        where: { trainingSessionId: "s1" },
      });
    });

    it("refuse si des émargements sont enregistrés", async () => {
      mockPrisma.emargement.count.mockResolvedValue(3);

      const result = await resetSlots("s1");

      expect(result.success).toBe(false);
      expect(!result.success && result.error).toMatch(
        /^3 émargements sont déjà enregistrés/
      );
      expect(mockPrisma.emargement.count).toHaveBeenCalledWith({
        where: {
          slot: { trainingSessionId: "s1" },
          status: { not: "en_attente" },
        },
      });
      expect(mockPrisma.slot.deleteMany).not.toHaveBeenCalled();
    });

    it("refuse une session clôturée", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        organismeId: "org-1",
        status: "terminée",
      });

      const result = await resetSlots("s1");

      expect(result).toEqual({
        success: false,
        error: "Impossible de modifier une session clôturée",
      });
      expect(mockPrisma.slot.deleteMany).not.toHaveBeenCalled();
    });

    it("rejette une session d'un autre organisme", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);

      await expect(resetSlots("s1")).rejects.toThrow("Session introuvable");
      expect(mockPrisma.slot.deleteMany).not.toHaveBeenCalled();
    });
  });
});
