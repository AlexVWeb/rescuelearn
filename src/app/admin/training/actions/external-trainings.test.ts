import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExternalTraining,
  uploadExternalTrainingFile,
  deleteExternalTraining,
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
    vi.mocked(requireOrganisme).mockResolvedValue(mockUser as any);
  });

  describe("createExternalTraining", () => {
    it("throws error if trainee belongs to another organism", async () => {
      vi.mocked(prisma.trainee.findUnique).mockResolvedValue({
        id: "trainee-1",
        organismeId: "other-org",
      } as any);

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
      } as any);
      vi.mocked(prisma.externalTraining.create).mockResolvedValue({
        id: "new-id",
      } as any);

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
      } as any);
      vi.mocked(prisma.externalTraining.delete).mockResolvedValue({
        id: "ext-1",
      } as any);

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
      } as any);

      await expect(deleteExternalTraining("ext-1")).rejects.toThrow(
        "Formation introuvable ou non autorisée"
      );
    });
  });
});
