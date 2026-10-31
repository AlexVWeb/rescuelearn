import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addTraineeToSession,
  addTraineesToSession,
  removeTraineeFromSession,
  updateInscriptionStatus,
  updateAttestationResult,
  updateAttestationResults,
} from "./inscriptions";
import { requireOrganisme, getTenantPrisma } from "@/lib/context";

// --- Mocks ---

const mockPrisma = vi.hoisted(() => ({
  trainingSession: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  trainee: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  inscription: {
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  attestationSignature: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("Inscription Actions", () => {
  const mockUser = {
    id: "user-1",
    organismeId: "org-1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    name: "Admin User",
    roles: ["admin"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    vi.mocked(getTenantPrisma).mockResolvedValue(
      mockPrisma as unknown as Awaited<ReturnType<typeof getTenantPrisma>>
    );
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
  });

  describe("addTraineeToSession", () => {
    it("successfully adds a trainee to a session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "session-1",
        status: "planifiée",
      });
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });
      mockPrisma.inscription.create.mockResolvedValue({ id: "ins-1" });

      const result = await addTraineeToSession("session-1", "trainee-1");

      expect(result).toEqual({ id: "ins-1" });
      expect(mockPrisma.inscription.create).toHaveBeenCalledWith({
        data: { trainingSessionId: "session-1", traineeId: "trainee-1" },
      });
    });

    it("throws error if session is closed", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "session-1",
        status: "terminée",
      });
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });

      await expect(
        addTraineeToSession("session-1", "trainee-1")
      ).rejects.toThrow("Impossible de modifier une session clôturée");
    });

    it("throws error if session or trainee is not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });

      await expect(
        addTraineeToSession("session-1", "trainee-1")
      ).rejects.toThrow("Entité introuvable ou non autorisée");
    });
  });

  describe("addTraineesToSession", () => {
    const openSession = (inscribed: string[] = [], maxTrainees = 10) => ({
      id: "session-1",
      status: "planifiée",
      maxTrainees,
      inscriptions: inscribed.map((traineeId) => ({ traineeId })),
    });

    it("inscribes all selected trainees, skipping duplicates", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        openSession(["t1"])
      );
      mockPrisma.trainee.findMany.mockResolvedValue([
        { id: "t1" },
        { id: "t2" },
        { id: "t3" },
      ]);
      mockPrisma.inscription.createMany.mockResolvedValue({ count: 2 });

      const result = await addTraineesToSession("session-1", [
        "t1",
        "t2",
        "t3",
        "t2",
      ]);

      expect(result).toEqual({ count: 2 });
      expect(mockPrisma.inscription.createMany).toHaveBeenCalledWith({
        data: [
          { trainingSessionId: "session-1", traineeId: "t2" },
          { trainingSessionId: "session-1", traineeId: "t3" },
        ],
      });
    });

    it("returns early when nothing is selected", async () => {
      const result = await addTraineesToSession("session-1", []);
      expect(result).toEqual({ count: 0 });
      expect(mockPrisma.inscription.createMany).not.toHaveBeenCalled();
    });

    it("rejects trainees outside the organisme", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(openSession());
      mockPrisma.trainee.findMany.mockResolvedValue([{ id: "t1" }]);

      await expect(
        addTraineesToSession("session-1", ["t1", "foreign"])
      ).rejects.toThrow("Entité introuvable ou non autorisée");
    });

    it("rejects when capacity would be exceeded", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        openSession(["t0"], 2)
      );
      mockPrisma.trainee.findMany.mockResolvedValue([
        { id: "t1" },
        { id: "t2" },
      ]);

      await expect(
        addTraineesToSession("session-1", ["t1", "t2"])
      ).rejects.toThrow("Il ne reste que 1 place dans cette session");
      expect(mockPrisma.inscription.createMany).not.toHaveBeenCalled();
    });

    it("rejects when session is closed", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        ...openSession(),
        status: "terminée",
      });
      mockPrisma.trainee.findMany.mockResolvedValue([{ id: "t1" }]);

      await expect(addTraineesToSession("session-1", ["t1"])).rejects.toThrow(
        "Impossible de modifier une session clôturée"
      );
    });
  });

  describe("removeTraineeFromSession", () => {
    it("successfully removes a trainee from a session", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-1", status: "planifiée" },
      });
      mockPrisma.inscription.delete.mockResolvedValue({ id: "ins-1" });

      const result = await removeTraineeFromSession("ins-1");

      expect(result).toEqual({ id: "ins-1" });
      expect(mockPrisma.inscription.delete).toHaveBeenCalledWith({
        where: { id: "ins-1" },
      });
    });

    it("throws error if session is closed", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-1", status: "terminée" },
      });

      await expect(removeTraineeFromSession("ins-1")).rejects.toThrow(
        "Impossible de modifier une session clôturée"
      );
    });

    it("throws error if inscription not found or unauthorized", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-other", status: "planifiée" },
      });

      await expect(removeTraineeFromSession("ins-1")).rejects.toThrow(
        "Inscription introuvable ou non autorisée"
      );
    });
  });

  describe("updateInscriptionStatus", () => {
    it("successfully updates inscription status", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-1", status: "planifiée" },
      });
      mockPrisma.inscription.update.mockResolvedValue({
        id: "ins-1",
        status: "présent",
      });

      const result = await updateInscriptionStatus("ins-1", "présent");

      expect(result.status).toBe("présent");
      expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
        where: { id: "ins-1" },
        data: { status: "présent" },
      });
    });

    it("throws error if unauthorized", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-other", status: "planifiée" },
      });

      await expect(updateInscriptionStatus("ins-1", "présent")).rejects.toThrow(
        "Inscription introuvable ou non autorisée"
      );
    });
  });

  describe("updateAttestationResult", () => {
    it("successfully updates attestation result", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-1", status: "planifiée" },
      });
      mockPrisma.inscription.update.mockResolvedValue({
        id: "ins-1",
        attestationResult: "acquis",
      });

      const result = await updateAttestationResult("ins-1", "acquis");

      expect(result.attestationResult).toBe("acquis");
      expect(mockPrisma.inscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ins-1" },
          data: expect.objectContaining({
            attestationResult: "acquis",
            attestationValidatedAt: expect.any(Date),
          }),
        })
      );
    });

    it("throws error if unauthorized", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-other", status: "planifiée" },
      });

      await expect(updateAttestationResult("ins-1", "acquis")).rejects.toThrow(
        "Inscription introuvable ou non autorisée"
      );
    });
  });

  describe("updateAttestationResults", () => {
    it("updates every selected inscription of the session", async () => {
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "session-1",
        organismeId: "org-1",
        status: "en_cours",
      });
      mockPrisma.inscription.updateMany.mockResolvedValue({ count: 2 });

      const result = await updateAttestationResults(
        "session-1",
        ["ins-1", "ins-2"],
        "acquis"
      );

      expect(result.count).toBe(2);
      expect(mockPrisma.inscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["ins-1", "ins-2"] },
          trainingSessionId: "session-1",
        },
        data: {
          attestationResult: "acquis",
          attestationValidatedAt: expect.any(Date),
        },
      });
    });

    it("throws error if session belongs to another organisme", async () => {
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "session-1",
        organismeId: "org-other",
        status: "en_cours",
      });

      await expect(
        updateAttestationResults("session-1", ["ins-1"], "acquis")
      ).rejects.toThrow("Session introuvable ou non autorisée");
      expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
    });

    it("throws error if session is closed", async () => {
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "session-1",
        organismeId: "org-1",
        status: "terminée",
      });

      await expect(
        updateAttestationResults("session-1", ["ins-1"], "non_acquis")
      ).rejects.toThrow("Impossible de modifier une session clôturée");
      expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("signed attestations lock", () => {
    beforeEach(() => {
      mockPrisma.attestationSignature.findFirst.mockResolvedValue({
        id: "sig",
      });
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "session-1",
        status: "en_cours",
      });
      mockPrisma.trainingSession.findUnique.mockResolvedValue({
        id: "session-1",
        organismeId: "org-1",
        status: "en_cours",
      });
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSessionId: "session-1",
        trainingSession: { organismeId: "org-1", status: "en_cours" },
      });
    });

    it.each([
      [
        "updateAttestationResult",
        () => updateAttestationResult("ins-1", "acquis"),
      ],
      [
        "updateAttestationResults",
        () => updateAttestationResults("session-1", ["ins-1"], "acquis"),
      ],
      [
        "addTraineeToSession",
        () => addTraineeToSession("session-1", "trainee-1"),
      ],
      ["removeTraineeFromSession", () => removeTraineeFromSession("ins-1")],
    ])("%s refuses while attestations are signed", async (_, run) => {
      await expect(run()).rejects.toThrow(
        "Attestations signées : dépubliez-les pour modifier."
      );
      expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
      expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.inscription.create).not.toHaveBeenCalled();
      expect(mockPrisma.inscription.delete).not.toHaveBeenCalled();
    });
  });
});
