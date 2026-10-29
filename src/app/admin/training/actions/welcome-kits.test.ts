import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import {
  confirmKitDocumentUpload,
  confirmTermsUpload,
  getSessionReadiness,
  saveWelcomeKit,
  updateKitDocument,
} from "./welcome-kits";
import { requireOrganisme } from "@/lib/context";

const mockPrisma = vi.hoisted(() => ({
  organisme: { findUnique: vi.fn(), update: vi.fn() },
  welcomeKit: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
  welcomeKitDocument: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  trainingSession: { findFirst: vi.fn(), update: vi.fn() },
  sessionDocument: { findMany: vi.fn() },
  inscription: { findMany: vi.fn() },
}));

const PDF = Buffer.from("%PDF-1.7 contenu des CGV");

const mockR2 = vi.hoisted(() => ({
  getStorageKey: vi.fn(
    (org: string, type: string, name: string) =>
      `dev/organisme/${org}/${type}/${name}`
  ),
  getPresignedUploadUrl: vi.fn().mockResolvedValue("https://upload"),
  getPresignedUrl: vi.fn().mockResolvedValue("https://download"),
  getFileSize: vi.fn(),
  getFileHead: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("@/lib/context", () => ({ requireOrganisme: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/r2", () => mockR2);

const admin = {
  id: "user-1",
  organismeId: "org-1",
  roles: ["ADMIN_ORGANISME"],
};

function asUser(user: typeof admin) {
  vi.mocked(requireOrganisme).mockResolvedValue(
    user as unknown as Awaited<ReturnType<typeof requireOrganisme>>
  );
}

describe("welcome-kits actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asUser(admin);
    mockPrisma.welcomeKit.upsert.mockResolvedValue({ id: "kit-1" });
  });

  describe("saveWelcomeKit", () => {
    it("refuse un type inconnu", async () => {
      await expect(
        saveWelcomeKit("BNSSA", { toBring: null, checklist: [] })
      ).rejects.toThrow("Type de formation inconnu");
      expect(mockPrisma.welcomeKit.upsert).not.toHaveBeenCalled();
    });

    it("nettoie une checklist malformée avant upsert", async () => {
      await saveWelcomeKit("PSE1", {
        toBring: "  Tenue  ",
        checklist: [
          { id: "a", label: " Gourde " },
          { id: "b", label: "" },
          { id: "a", label: "Doublon" },
        ],
      });
      expect(mockPrisma.welcomeKit.upsert).toHaveBeenCalledWith({
        where: { organismeId_type: { organismeId: "org-1", type: "PSE1" } },
        create: {
          organismeId: "org-1",
          type: "PSE1",
          toBring: "Tenue",
          checklist: [{ id: "a", label: "Gourde" }],
        },
        update: { toBring: "Tenue", checklist: [{ id: "a", label: "Gourde" }] },
      });
    });
  });

  describe("updateKitDocument", () => {
    it.each([-1, 91, 1.5])("refuse visibleDaysBefore = %s", async (days) => {
      await expect(
        updateKitDocument("doc-1", { title: "Fiche", visibleDaysBefore: days })
      ).rejects.toThrow("entre 0 et 90");
      expect(mockPrisma.welcomeKitDocument.update).not.toHaveBeenCalled();
    });

    it("refuse un document d'un autre organisme", async () => {
      mockPrisma.welcomeKitDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        welcomeKit: { organismeId: "org-2" },
      });
      await expect(
        updateKitDocument("doc-1", { title: "Fiche", visibleDaysBefore: 7 })
      ).rejects.toThrow("non autorisé");
      expect(mockPrisma.welcomeKitDocument.update).not.toHaveBeenCalled();
    });

    it("accepte null et un entier valide", async () => {
      mockPrisma.welcomeKitDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        welcomeKit: { organismeId: "org-1" },
      });
      await updateKitDocument("doc-1", {
        title: "Fiche",
        visibleDaysBefore: 7,
      });
      expect(mockPrisma.welcomeKitDocument.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { title: "Fiche", visibleDaysBefore: 7 },
      });
    });
  });

  describe("confirmKitDocumentUpload", () => {
    it("refuse une clé hors préfixe du type", async () => {
      await expect(
        confirmKitDocumentUpload("PSE1", {
          key: "dev/organisme/org-1/welcome-kits/SST/1-fiche.pdf",
          fileName: "fiche.pdf",
          mimeType: "application/pdf",
        })
      ).rejects.toThrow("Fichier non autorisé");
      expect(mockPrisma.welcomeKitDocument.create).not.toHaveBeenCalled();
    });
  });

  describe("confirmTermsUpload", () => {
    const upload = {
      key: "dev/organisme/org-1/terms/1-cgv.pdf",
      fileName: "cgv.pdf",
      mimeType: "application/pdf",
    };

    it("refuse un formateur", async () => {
      asUser({ ...admin, roles: ["FORMATEUR"] });
      await expect(confirmTermsUpload(upload)).rejects.toThrow(
        "Réservé aux administrateurs"
      );
      expect(mockPrisma.organisme.update).not.toHaveBeenCalled();
    });

    it("refuse un fichier dont la signature n'est pas PDF", async () => {
      mockR2.getFileSize.mockResolvedValue(100);
      mockR2.getFileHead.mockResolvedValue(Buffer.from([0x50, 0x4b, 3, 4]));
      await expect(confirmTermsUpload(upload)).rejects.toThrow(
        "ne correspond pas"
      );
      expect(mockR2.deleteFile).toHaveBeenCalledWith(upload.key);
      expect(mockPrisma.organisme.update).not.toHaveBeenCalled();
    });

    it("enregistre le SHA-256 du contenu sans supprimer l'ancien fichier", async () => {
      mockR2.getFileSize.mockResolvedValue(PDF.length);
      mockR2.getFileHead.mockResolvedValue(PDF.subarray(0, 8));
      mockR2.getFile.mockResolvedValue({ buffer: PDF });

      const result = await confirmTermsUpload(upload);

      const expected = createHash("sha256").update(PDF).digest("hex");
      expect(result.version).toBe(expected);
      expect(mockPrisma.organisme.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          termsFileKey: upload.key,
          termsVersion: expected,
          termsUpdatedAt: expect.any(Date),
        },
      });
      expect(mockR2.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("getSessionReadiness", () => {
    const session = {
      id: "session-1",
      type: "PSE1",
      organismeId: "org-1",
      startDate: new Date("2026-11-12"),
    };

    it("refuse une session d'un autre organisme", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      await expect(getSessionReadiness("session-x")).rejects.toThrow(
        "Session introuvable"
      );
      expect(mockPrisma.trainingSession.findFirst).toHaveBeenCalledWith({
        where: { id: "session-x", organismeId: "org-1" },
      });
    });

    it("renvoie null sans kit, sans CGV ni pré-lecture", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session);
      mockPrisma.welcomeKit.findUnique.mockResolvedValue(null);
      mockPrisma.organisme.findUnique.mockResolvedValue({
        termsFileKey: null,
        termsVersion: null,
      });
      mockPrisma.sessionDocument.findMany.mockResolvedValue([]);
      mockPrisma.inscription.findMany.mockResolvedValue([
        {
          id: "ins-1",
          checklistDone: null,
          prereadOpenedAt: null,
          termsAcceptedAt: null,
        },
      ]);

      expect(await getSessionReadiness("session-1")).toBeNull();
    });

    it("calcule la progression par inscription", async () => {
      const acceptedAt = new Date("2026-11-03T10:00:00.000Z");
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session);
      mockPrisma.welcomeKit.findUnique.mockResolvedValue({
        toBring: null,
        checklist: [{ id: "tenue", label: "Tenue" }],
        documents: [],
      });
      mockPrisma.organisme.findUnique.mockResolvedValue({
        termsFileKey: "cgv.pdf",
        termsVersion: "abc",
      });
      mockPrisma.sessionDocument.findMany.mockResolvedValue([]);
      mockPrisma.inscription.findMany.mockResolvedValue([
        {
          id: "ins-1",
          checklistDone: null,
          prereadOpenedAt: null,
          termsAcceptedAt: acceptedAt,
        },
      ]);

      const result = await getSessionReadiness("session-1");
      expect(result?.["ins-1"]).toMatchObject({
        done: 1,
        total: 2,
        termsAcceptedAt: acceptedAt,
      });
    });
  });
});
