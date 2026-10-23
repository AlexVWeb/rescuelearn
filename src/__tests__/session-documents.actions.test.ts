import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

const mockR2 = vi.hoisted(() => ({
  getStorageKey: (org: string, type: string, name: string) =>
    `dev/organisme/${org}/${type}/${name}`,
  getPresignedUploadUrl: vi.fn().mockResolvedValue("https://r2.example/put"),
  getFileSize: vi.fn(),
  getFileHead: vi.fn(),
  deleteFile: vi.fn(),
}));
vi.mock("@/lib/r2", () => mockR2);

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  trainingSession: { findFirst: vi.fn() },
  sessionDocument: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

import { auth } from "@/lib/auth";
import {
  confirmDocumentUpload,
  createDocumentUpload,
  deleteDocument,
} from "@/app/admin/training/actions";

const PDF = "application/pdf";
const PREFIX = "dev/organisme/org-1/session-documents/ts-1/";

beforeEach(() => {
  vi.clearAllMocks();
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue({ user: { id: "user-1" } });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId: "org-1",
    roles: ["FORMATEUR"],
  });
  mockPrisma.trainingSession.findFirst.mockResolvedValue({ id: "ts-1" });
});

describe("createDocumentUpload", () => {
  it("renvoie une URL d'envoi pour une clé propre à la session", async () => {
    const result = await createDocumentUpload("ts-1", {
      fileName: "Livret stagiaire.pdf",
      mimeType: PDF,
      size: 2_000_000,
    });

    expect(result.uploadUrl).toBe("https://r2.example/put");
    expect(result.key).toMatch(
      /^dev\/organisme\/org-1\/session-documents\/ts-1\/\d+-Livret_stagiaire\.pdf$/
    );
    expect(mockR2.getPresignedUploadUrl).toHaveBeenCalledWith(
      result.key,
      PDF,
      300
    );
  });

  it("refuse un format non prévu", async () => {
    await expect(
      createDocumentUpload("ts-1", {
        fileName: "script.html",
        mimeType: "text/html",
        size: 100,
      })
    ).rejects.toThrow("Format non supporté");
  });

  it("refuse une session d'un autre organisme", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
    await expect(
      createDocumentUpload("ts-x", {
        fileName: "a.pdf",
        mimeType: PDF,
        size: 100,
      })
    ).rejects.toThrow("Session introuvable");
  });
});

describe("confirmDocumentUpload", () => {
  it("enregistre un PDF valide avec sa taille réelle", async () => {
    mockR2.getFileSize.mockResolvedValue(1_234_567);
    mockR2.getFileHead.mockResolvedValue(Buffer.from("%PDF-1.7", "latin1"));
    mockPrisma.sessionDocument.create.mockResolvedValue({ id: "doc-1" });

    await confirmDocumentUpload("ts-1", {
      key: `${PREFIX}1-livret.pdf`,
      fileName: "livret_stagiaire.pdf",
      mimeType: PDF,
    });

    expect(mockPrisma.sessionDocument.create).toHaveBeenCalledWith({
      data: {
        trainingSessionId: "ts-1",
        title: "livret stagiaire",
        fileKey: `${PREFIX}1-livret.pdf`,
        mimeType: PDF,
        size: 1_234_567,
      },
    });
  });

  it("refuse une clé hors du dossier de la session", async () => {
    await expect(
      confirmDocumentUpload("ts-1", {
        key: "dev/organisme/org-2/external-trainings/certificat.pdf",
        fileName: "x.pdf",
        mimeType: PDF,
      })
    ).rejects.toThrow("Fichier non autorisé");
    expect(mockPrisma.sessionDocument.create).not.toHaveBeenCalled();
  });

  it("supprime un fichier dont le contenu ne correspond pas au format", async () => {
    mockR2.getFileSize.mockResolvedValue(500);
    mockR2.getFileHead.mockResolvedValue(Buffer.from("<html>", "latin1"));

    await expect(
      confirmDocumentUpload("ts-1", {
        key: `${PREFIX}1-faux.pdf`,
        fileName: "faux.pdf",
        mimeType: PDF,
      })
    ).rejects.toThrow("ne correspond pas");
    expect(mockR2.deleteFile).toHaveBeenCalledWith(`${PREFIX}1-faux.pdf`);
    expect(mockPrisma.sessionDocument.create).not.toHaveBeenCalled();
  });

  it("supprime un fichier vide sans tenter de le lire", async () => {
    mockR2.getFileSize.mockResolvedValue(0);

    await expect(
      confirmDocumentUpload("ts-1", {
        key: `${PREFIX}1-vide.pdf`,
        fileName: "vide.pdf",
        mimeType: PDF,
      })
    ).rejects.toThrow("vide");
    expect(mockR2.getFileHead).not.toHaveBeenCalled();
    expect(mockR2.deleteFile).toHaveBeenCalledWith(`${PREFIX}1-vide.pdf`);
  });

  it("supprime un fichier déposé au-delà de 25 Mo", async () => {
    mockR2.getFileSize.mockResolvedValue(30 * 1024 * 1024);
    mockR2.getFileHead.mockResolvedValue(Buffer.from("%PDF-1.7", "latin1"));

    await expect(
      confirmDocumentUpload("ts-1", {
        key: `${PREFIX}1-gros.pdf`,
        fileName: "gros.pdf",
        mimeType: PDF,
      })
    ).rejects.toThrow("25 Mo");
    expect(mockR2.deleteFile).toHaveBeenCalled();
  });
});

describe("deleteDocument", () => {
  it("supprime la ligne et le fichier R2", async () => {
    mockPrisma.sessionDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      fileKey: `${PREFIX}1-livret.pdf`,
      trainingSession: { organismeId: "org-1" },
    });

    await deleteDocument("doc-1");

    expect(mockPrisma.sessionDocument.delete).toHaveBeenCalledWith({
      where: { id: "doc-1" },
    });
    expect(mockR2.deleteFile).toHaveBeenCalledWith(`${PREFIX}1-livret.pdf`);
  });

  it("refuse le document d'un autre organisme", async () => {
    mockPrisma.sessionDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      fileKey: "k",
      trainingSession: { organismeId: "org-2" },
    });
    await expect(deleteDocument("doc-1")).rejects.toThrow(
      "Document introuvable"
    );
    expect(mockR2.deleteFile).not.toHaveBeenCalled();
  });
});
