import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExternalTraining,
  uploadExternalTrainingFile,
  deleteExternalTraining,
  updateExternalTraining,
} from "./external-trainings";
import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import * as r2 from "@/lib/r2";

// --- Mocks ---

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainee: {
      findUnique: vi.fn(),
    },
    externalTraining: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    inscription: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getStorageKey: vi.fn(),
}));

describe("ExternalTraining Actions", () => {
  const mockUser = { organismeId: "org-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(mockUser as never);
  });

  describe("createExternalTraining", () => {
    it("throws error if trainee belongs to another organism", async () => {
      vi.mocked(prisma.trainee.findUnique).mockResolvedValue({
        id: "trainee-1",
        organismeId: "other-org",
      } as never);

      await expect(
        createExternalTraining({
          traineeId: "trainee-1",
          type: "PSC",
          name: "Test",
          organisme: "Croix Rouge",
          obtainedAt: new Date(),
        })
      ).rejects.toThrow("Stagiaire introuvable ou non autorisé");
    });

    it("creates external training if trainee belongs to the same organism", async () => {
      vi.mocked(prisma.trainee.findUnique).mockResolvedValue({
        id: "trainee-1",
        organismeId: "org-1",
      } as never);
      vi.mocked(prisma.externalTraining.create).mockResolvedValue({
        id: "new-id",
      } as never);

      const data = {
        traineeId: "trainee-1",
        type: "PSC",
        name: "Test",
        organisme: "Croix Rouge",
        obtainedAt: new Date(),
        fileKey: "some-key",
      };

      const result = await createExternalTraining(data);

      expect(result).toEqual({ id: "new-id" });
      expect(prisma.externalTraining.create).toHaveBeenCalledWith({
        data: { ...data, organismeId: "org-1" },
      });
    });

    it("throws error if creating FC when no initial training exists", async () => {
      vi.mocked(prisma.trainee.findUnique).mockResolvedValue({
        id: "trainee-1",
        organismeId: "org-1",
      } as never);
      vi.mocked(prisma.inscription.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.externalTraining.findFirst).mockResolvedValue(null);

      const data = {
        traineeId: "trainee-1",
        type: "PSE1",
        name: "Recyclage PSE1",
        organisme: "Croix Rouge",
        obtainedAt: new Date(),
        isFC: true,
      };

      await expect(createExternalTraining(data)).rejects.toThrow(
        "Impossible d'ajouter une Formation Continue (FC) pour la filière PSE1 : aucune formation initiale préalable n'est enregistrée."
      );
    });

    it("creates FC training if initial platform training exists", async () => {
      vi.mocked(prisma.trainee.findUnique).mockResolvedValue({
        id: "trainee-1",
        organismeId: "org-1",
      } as never);
      vi.mocked(prisma.inscription.findFirst).mockResolvedValue({
        id: "ins-1",
      } as never);
      vi.mocked(prisma.externalTraining.create).mockResolvedValue({
        id: "new-id",
      } as never);

      const data = {
        traineeId: "trainee-1",
        type: "PSE1",
        name: "Recyclage PSE1",
        organisme: "Croix Rouge",
        obtainedAt: new Date(),
        isFC: true,
      };

      const result = await createExternalTraining(data);

      expect(result).toEqual({ id: "new-id" });
      expect(prisma.externalTraining.create).toHaveBeenCalled();
    });
  });

  describe("updateExternalTraining", () => {
    it("updates external training and cleans up old file if changed", async () => {
      vi.mocked(prisma.externalTraining.findUnique).mockResolvedValue({
        id: "ext-1",
        traineeId: "trainee-1",
        organismeId: "org-1",
        fileKey: "old-key",
      } as never);
      vi.mocked(prisma.externalTraining.update).mockResolvedValue({
        id: "ext-1",
      } as never);

      const data = {
        type: "PSC",
        name: "Updated Test",
        organisme: "Croix Rouge",
        obtainedAt: new Date(),
        fileKey: "new-key",
      };

      const result = await updateExternalTraining("ext-1", data);

      expect(result).toEqual({ id: "ext-1" });
      expect(r2.deleteFile).toHaveBeenCalledWith("old-key");
      expect(prisma.externalTraining.update).toHaveBeenCalledWith({
        where: { id: "ext-1" },
        data: {
          type: "PSC",
          name: "Updated Test",
          organisme: "Croix Rouge",
          obtainedAt: data.obtainedAt,
          isFC: false,
          certificateNumber: null,
          fileUrl: null,
          fileKey: "new-key",
        },
      });
    });

    it("throws error if trying to update record from another organism", async () => {
      vi.mocked(prisma.externalTraining.findUnique).mockResolvedValue({
        id: "ext-1",
        organismeId: "other-org",
      } as never);

      await expect(
        updateExternalTraining("ext-1", {
          type: "PSC",
          name: "Test",
          organisme: "Croix Rouge",
          obtainedAt: new Date(),
        })
      ).rejects.toThrow("Formation introuvable ou non autorisée");
    });
  });

  describe("uploadExternalTrainingFile", () => {
    it("uploads file and returns the standardized key", async () => {
      const file = new File(["test"], "diploma.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("file", file);

      vi.mocked(r2.getStorageKey).mockReturnValue(
        "dev/organisme/org-1/external-trainings/key"
      );
      vi.mocked(r2.uploadFile).mockResolvedValue("https://url");

      const result = await uploadExternalTrainingFile(formData);

      expect(result).toEqual({
        key: "dev/organisme/org-1/external-trainings/key",
      });
      expect(r2.getStorageKey).toHaveBeenCalledWith(
        "org-1",
        "external-trainings",
        expect.stringContaining("diploma.pdf")
      );
      expect(r2.uploadFile).toHaveBeenCalled();
    });

    it("throws error if no file is provided", async () => {
      const formData = new FormData();
      await expect(uploadExternalTrainingFile(formData)).rejects.toThrow(
        "Aucun fichier fourni"
      );
    });
  });

  describe("deleteExternalTraining", () => {
    it("deletes file from R2 and record from DB", async () => {
      vi.mocked(prisma.externalTraining.findUnique).mockResolvedValue({
        id: "ext-1",
        organismeId: "org-1",
        fileKey: "some-key",
      } as never);
      vi.mocked(prisma.externalTraining.delete).mockResolvedValue({
        id: "ext-1",
      } as never);

      await deleteExternalTraining("ext-1");

      expect(r2.deleteFile).toHaveBeenCalledWith("some-key");
      expect(prisma.externalTraining.delete).toHaveBeenCalledWith({
        where: { id: "ext-1" },
      });
    });

    it("throws error if trying to delete record from another organism", async () => {
      vi.mocked(prisma.externalTraining.findUnique).mockResolvedValue({
        id: "ext-1",
        organismeId: "other-org",
      } as never);

      await expect(deleteExternalTraining("ext-1")).rejects.toThrow(
        "Formation introuvable ou non autorisée"
      );
    });
  });
});
