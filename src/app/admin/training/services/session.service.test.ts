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
  member: {
    findMany: vi.fn(),
  },
  trainingSessionFormateur: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
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
        data: {
          ...data,
          organismeId: "org-1",
          formateurId: "form-1",
          formateurs: { create: { userId: "form-1" } },
        },
      });
    });
  });

  describe("updateSession", () => {
    it("updates an existing session", async () => {
      const data = { title: "Updated" } as unknown as Parameters<
        typeof TrainingSessionService.updateSession
      >[1];
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "planifiée",
      });
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

    it("allows updating status on a closed session", async () => {
      const data = { status: "en_cours" } as unknown as Parameters<
        typeof TrainingSessionService.updateSession
      >[1];
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "terminée",
      });
      mockPrisma.trainingSession.update.mockResolvedValue({
        id: "s1",
        status: "en_cours",
      });

      const result = await TrainingSessionService.updateSession(
        "s1",
        data,
        "org-1"
      );

      expect(result.status).toBe("en_cours");
    });

    it("throws error when trying to update non-status fields on a closed session", async () => {
      const data = { title: "New Title" } as unknown as Parameters<
        typeof TrainingSessionService.updateSession
      >[1];
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "terminée",
      });

      await expect(
        TrainingSessionService.updateSession("s1", data, "org-1")
      ).rejects.toThrow(
        "Seul le statut peut être modifié sur une session clôturée"
      );
    });

    it("throws error when trying to change status from terminée to planifiée", async () => {
      const data = { status: "planifiée" } as unknown as Parameters<
        typeof TrainingSessionService.updateSession
      >[1];
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "terminée",
      });

      await expect(
        TrainingSessionService.updateSession("s1", data, "org-1")
      ).rejects.toThrow(
        "Impossible de faire repasser une session terminée au statut planifiée"
      );
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
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "planifiée",
      });
      mockPrisma.trainingSession.delete.mockResolvedValue({ id: "s1" });

      const result = await TrainingSessionService.deleteSession("s1", "org-1");

      expect(result.id).toBe("s1");
      expect(mockPrisma.trainingSession.delete).toHaveBeenCalledWith({
        where: { id: "s1" },
      });
    });

    it("throws error when trying to delete a completed session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "terminée",
      });

      await expect(
        TrainingSessionService.deleteSession("s1", "org-1")
      ).rejects.toThrow("Impossible de supprimer une session terminée");
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

  describe("setFormateurs", () => {
    beforeEach(() => {
      mockPrisma.$transaction.mockResolvedValue([]);
    });

    it("replaces the assigned formateurs", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "planifiée",
      });
      mockPrisma.member.findMany.mockResolvedValue([
        { userId: "u1" },
        { userId: "u2" },
      ]);

      await TrainingSessionService.setFormateurs(
        "s1",
        ["u1", "u2", "u1"],
        "org-1"
      );

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1", userId: { in: ["u1", "u2"] } },
        select: { userId: true },
      });
      expect(
        mockPrisma.trainingSessionFormateur.deleteMany
      ).toHaveBeenCalledWith({
        where: { trainingSessionId: "s1" },
      });
      expect(
        mockPrisma.trainingSessionFormateur.createMany
      ).toHaveBeenCalledWith({
        data: [
          { trainingSessionId: "s1", userId: "u1" },
          { trainingSessionId: "s1", userId: "u2" },
        ],
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });

    it("throws if the session does not belong to the organisme", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);

      await expect(
        TrainingSessionService.setFormateurs("s1", ["u1"], "org-1")
      ).rejects.toThrow("Session introuvable");
    });

    it("requires at least one formateur", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "planifiée",
      });

      await expect(
        TrainingSessionService.setFormateurs("s1", [], "org-1")
      ).rejects.toThrow("Au moins un formateur doit être affecté");
    });

    it.each(["terminée", "annulée"])(
      "refuses changes on a %s session",
      async (status) => {
        mockPrisma.trainingSession.findFirst.mockResolvedValue({
          id: "s1",
          status,
        });

        await expect(
          TrainingSessionService.setFormateurs("s1", ["u1"], "org-1")
        ).rejects.toThrow(
          "Impossible de modifier les formateurs d'une session clôturée"
        );
      }
    );

    it("rejects users that are not members of the organisme", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "s1",
        status: "planifiée",
      });
      mockPrisma.member.findMany.mockResolvedValue([{ userId: "u1" }]);

      await expect(
        TrainingSessionService.setFormateurs("s1", ["u1", "outsider"], "org-1")
      ).rejects.toThrow("Formateur invalide pour cet organisme");
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
