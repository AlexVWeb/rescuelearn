import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSlot, deleteSlot } from "./slots";
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
  },
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
        trainingSession: { organismeId: "org-1" },
      });
      mockPrisma.slot.delete.mockResolvedValue({ id: "slot-1" });

      const result = await deleteSlot("slot-1");

      expect(result.id).toBe("slot-1");
      expect(mockPrisma.slot.delete).toHaveBeenCalledWith({
        where: { id: "slot-1" },
      });
    });

    it("throws error if slot not found or unauthorized", async () => {
      mockPrisma.slot.findUnique.mockResolvedValue({
        id: "slot-1",
        trainingSession: { organismeId: "org-other" },
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
});
