import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addTraineeToSession,
  removeTraineeFromSession,
  updateInscriptionStatus,
  updateAttestationResult,
} from "./inscriptions";
import { requireOrganisme, getTenantPrisma } from "@/lib/context";

// --- Mocks ---

const mockPrisma = vi.hoisted(() => ({
  trainingSession: {
    findFirst: vi.fn(),
  },
  trainee: {
    findFirst: vi.fn(),
  },
  inscription: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
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
  });

  describe("addTraineeToSession", () => {
    it("successfully adds a trainee to a session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({
        id: "session-1",
      });
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });
      mockPrisma.inscription.create.mockResolvedValue({ id: "ins-1" });

      const result = await addTraineeToSession("session-1", "trainee-1");

      expect(result).toEqual({ id: "ins-1" });
      expect(mockPrisma.inscription.create).toHaveBeenCalledWith({
        data: { trainingSessionId: "session-1", traineeId: "trainee-1" },
      });
    });

    it("throws error if session or trainee is not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });

      await expect(
        addTraineeToSession("session-1", "trainee-1")
      ).rejects.toThrow("Entité introuvable ou non autorisée");
    });
  });

  describe("removeTraineeFromSession", () => {
    it("successfully removes a trainee from a session", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-1" },
      });
      mockPrisma.inscription.delete.mockResolvedValue({ id: "ins-1" });

      const result = await removeTraineeFromSession("ins-1");

      expect(result).toEqual({ id: "ins-1" });
      expect(mockPrisma.inscription.delete).toHaveBeenCalledWith({
        where: { id: "ins-1" },
      });
    });

    it("throws error if inscription not found or unauthorized", async () => {
      mockPrisma.inscription.findUnique.mockResolvedValue({
        id: "ins-1",
        trainingSession: { organismeId: "org-other" },
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
        trainingSession: { organismeId: "org-1" },
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
        trainingSession: { organismeId: "org-other" },
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
        trainingSession: { organismeId: "org-1" },
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
        trainingSession: { organismeId: "org-other" },
      });

      await expect(updateAttestationResult("ins-1", "acquis")).rejects.toThrow(
        "Inscription introuvable ou non autorisée"
      );
    });
  });
});
