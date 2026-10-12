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
  const mockUser = { organismeId: "org-1", roles: ["ADMIN_ORGANISME"] };
  const ownKey = (name: string) =>
    `dev/organisme/org-1/external-trainings/${name}`;
  const pdfFile = (name = "diploma.pdf", body = "%PDF-1.7 test") =>
    new File([body], name, { type: "application/pdf" });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(mockUser as never);
    vi.mocked(r2.getStorageKey).mockImplementation(
      (organismeId, type, filename) =>
        `dev/organisme/${organismeId}/${type}/${filename}`
    );
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
        fileKey: ownKey("some.pdf"),
      };

      const result = await createExternalTraining(data);

      expect(result).toEqual({ id: "new-id" });
      expect(prisma.externalTraining.create).toHaveBeenCalledWith({
        data: {
          ...data,
          isFC: false,
          certificateNumber: null,
          organismeId: "org-1",
        },
      });
    });

    it("rejects a fileKey from another organisme and ignores extra fields", async () => {
      vi.mocked(prisma.trainee.findUnique).mockResolvedValue({
        id: "trainee-1",
        organismeId: "org-1",
      } as never);

      await expect(
        createExternalTraining({
          traineeId: "trainee-1",
          type: "PSC",
          name: "Test",
          organisme: "Croix Rouge",
          obtainedAt: new Date(),
          fileKey: "dev/organisme/org-2/external-trainings/x.pdf",
        })
      ).rejects.toThrow("Fichier non autorisé");
      expect(prisma.externalTraining.create).not.toHaveBeenCalled();
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
        fileKey: ownKey("old.pdf"),
      } as never);
      vi.mocked(prisma.externalTraining.update).mockResolvedValue({
        id: "ext-1",
      } as never);

      const data = {
        type: "PSC",
        name: "Updated Test",
        organisme: "Croix Rouge",
        obtainedAt: new Date(),
        fileKey: ownKey("new.pdf"),
      };

      const result = await updateExternalTraining("ext-1", data);

      expect(result).toEqual({ id: "ext-1" });
      expect(r2.deleteFile).toHaveBeenCalledWith(ownKey("old.pdf"));
      expect(prisma.externalTraining.update).toHaveBeenCalledWith({
        where: { id: "ext-1" },
        data: {
          type: "PSC",
          name: "Updated Test",
          organisme: "Croix Rouge",
          obtainedAt: data.obtainedAt,
          isFC: false,
          certificateNumber: null,
          fileKey: ownKey("new.pdf"),
        },
      });
    });

    it("rejects a fileKey outside the organisme folder", async () => {
      vi.mocked(prisma.externalTraining.findUnique).mockResolvedValue({
        id: "ext-1",
        organismeId: "org-1",
        fileKey: null,
      } as never);

      for (const fileKey of [
        "dev/referenciels/gqs.pdf",
        "dev/organisme/org-2/external-trainings/x.pdf",
        ownKey("../../org-2/external-trainings/x.pdf"),
      ]) {
        await expect(
          updateExternalTraining("ext-1", {
            type: "PSC",
            name: "Test",
            organisme: "Croix Rouge",
            obtainedAt: new Date(),
            fileKey,
          })
        ).rejects.toThrow("Fichier non autorisé");
      }
      expect(prisma.externalTraining.update).not.toHaveBeenCalled();
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
      const formData = new FormData();
      formData.append("file", pdfFile());
      vi.mocked(r2.uploadFile).mockResolvedValue("https://url");

      const result = await uploadExternalTrainingFile(formData);

      expect(result.key).toMatch(
        /^dev\/organisme\/org-1\/external-trainings\/\d+-diploma\.pdf$/
      );
      expect(r2.uploadFile).toHaveBeenCalledWith(
        result.key,
        expect.any(Buffer),
        "application/pdf",
        true
      );
    });

    it("rejects a file whose content is not PDF/JPEG/PNG", async () => {
      const formData = new FormData();
      formData.append(
        "file",
        new File(["<script>alert(1)</script>"], "x.pdf", {
          type: "application/pdf",
        })
      );
      await expect(uploadExternalTrainingFile(formData)).rejects.toThrow(
        "Format non supporté"
      );
      expect(r2.uploadFile).not.toHaveBeenCalled();
    });

    it("rejects files over 5 MB", async () => {
      const formData = new FormData();
      formData.append(
        "file",
        pdfFile("big.pdf", "%PDF-" + "a".repeat(5 * 1024 * 1024))
      );
      await expect(uploadExternalTrainingFile(formData)).rejects.toThrow(
        "trop volumineux"
      );
    });

    it("stores the detected type and a sanitized file name", async () => {
      const formData = new FormData();
      formData.append(
        "file",
        new File(["%PDF-1.7"], "../../Attestation été.html", {
          type: "text/html",
        })
      );

      const { key } = await uploadExternalTrainingFile(formData);

      expect(key).toMatch(
        /^dev\/organisme\/org-1\/external-trainings\/\d+-_Attestation_ete\.pdf$/
      );
      expect(r2.uploadFile).toHaveBeenCalledWith(
        key,
        expect.any(Buffer),
        "application/pdf",
        true
      );
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
        fileKey: ownKey("some.pdf"),
      } as never);
      vi.mocked(prisma.externalTraining.delete).mockResolvedValue({
        id: "ext-1",
      } as never);

      await deleteExternalTraining("ext-1");

      expect(r2.deleteFile).toHaveBeenCalledWith(ownKey("some.pdf"));
      expect(prisma.externalTraining.delete).toHaveBeenCalledWith({
        where: { id: "ext-1" },
      });
    });

    it("never deletes a stored key outside the organisme folder", async () => {
      vi.mocked(prisma.externalTraining.findUnique).mockResolvedValue({
        id: "ext-1",
        organismeId: "org-1",
        fileKey: "dev/referenciels/gqs.pdf",
      } as never);
      vi.mocked(prisma.externalTraining.delete).mockResolvedValue({
        id: "ext-1",
      } as never);

      await deleteExternalTraining("ext-1");

      expect(r2.deleteFile).not.toHaveBeenCalled();
      expect(prisma.externalTraining.delete).toHaveBeenCalled();
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
