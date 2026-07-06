import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrainingSessionService } from "./session.service";

// --- Mocks ---

const mockPrisma = vi.hoisted(() => ({
  trainingSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("TrainingSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("creates a session", async () => {
      const data = { title: "Session 1" } as unknown as Parameters<
        typeof TrainingSessionService.createSession
      >[0];
      mockPrisma.trainingSession.create.mockResolvedValue({ id: "s1" });

      const result = await TrainingSessionService.createSession(
        data,
        "org-1",
        "form-1"
      );

      expect(result.id).toBe("s1");
      expect(mockPrisma.trainingSession.create).toHaveBeenCalledWith({
        data: { ...data, organismeId: "org-1", formateurId: "form-1" },
      });
    });
  });

  describe("updateSession", () => {
    it("updates an existing session", async () => {
      const data = { title: "Updated" } as unknown as Parameters<
        typeof TrainingSessionService.updateSession
      >[1];
      mockPrisma.trainingSession.findFirst.mockResolvedValue({ id: "s1" });
      mockPrisma.trainingSession.update.mockResolvedValue({
        id: "s1",
        ...data,
      });

      const result = await TrainingSessionService.updateSession(
        "s1",
        data,
        "org-1"
      );

      expect(result.title).toBe("Updated");
      expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data,
      });
    });

    it("throws error if session not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      await expect(
        TrainingSessionService.updateSession(
          "s1",
          {} as unknown as Parameters<
            typeof TrainingSessionService.updateSession
          >[1],
          "org-1"
        )
      ).rejects.toThrow("Session introuvable");
    });
  });

  describe("deleteSession", () => {
    it("deletes a session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({ id: "s1" });
      mockPrisma.trainingSession.delete.mockResolvedValue({ id: "s1" });

      const result = await TrainingSessionService.deleteSession("s1", "org-1");

      expect(result.id).toBe("s1");
      expect(mockPrisma.trainingSession.delete).toHaveBeenCalledWith({
        where: { id: "s1" },
      });
    });

    it("throws error if session not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      await expect(
        TrainingSessionService.deleteSession("s1", "org-1")
      ).rejects.toThrow("Session introuvable");
    });
  });

  describe("getSessionById", () => {
    it("returns session with relations", async () => {
      const mockSession = { id: "s1", slots: [], inscriptions: [] };
      mockPrisma.trainingSession.findFirst.mockResolvedValue(mockSession);

      const result = await TrainingSessionService.getSessionById("s1", "org-1");

      expect(result.id).toBe("s1");
      expect(mockPrisma.trainingSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "s1", organismeId: "org-1" },
          include: expect.any(Object),
        })
      );
    });

    it("throws error if session not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      await expect(
        TrainingSessionService.getSessionById("s1", "org-1")
      ).rejects.toThrow("Session introuvable");
    });
  });
});
