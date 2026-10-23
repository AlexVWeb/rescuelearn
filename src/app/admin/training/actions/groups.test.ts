import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveGeneratedGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  moveInscriptions,
} from "./groups";
import { requireOrganisme } from "@/lib/context";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  trainingSession: { findFirst: vi.fn() },
  trainingGroup: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  inscription: { updateMany: vi.fn() },
}));

vi.mock("@/lib/context", () => ({ requireOrganisme: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const session = (overrides = {}) => ({
  id: "s1",
  organismeId: "org-1",
  status: "planifiée",
  formateurs: [{ userId: "f1" }, { userId: "f2" }],
  inscriptions: [{ id: "i1" }, { id: "i2" }, { id: "i3" }],
  ...overrides,
});

const group = (overrides = {}) => ({
  id: "g1",
  trainingSessionId: "s1",
  trainingSession: session(),
  ...overrides,
});

describe("Group Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue({
      id: "user-1",
      organismeId: "org-1",
    } as unknown as Awaited<ReturnType<typeof requireOrganisme>>);
    mockPrisma.$transaction.mockResolvedValue([]);
  });

  describe("saveGeneratedGroups", () => {
    it("remplace les groupes en une transaction", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      await saveGeneratedGroups("s1", [
        { name: "Groupe A", formateurId: "f1", inscriptionIds: ["i1", "i2"] },
        { name: "Groupe B", formateurId: "f2", inscriptionIds: ["i3"] },
      ]);
      expect(mockPrisma.trainingSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "s1", organismeId: "org-1" },
        })
      );
      expect(mockPrisma.trainingGroup.deleteMany).toHaveBeenCalledWith({
        where: { trainingSessionId: "s1" },
      });
      expect(mockPrisma.trainingGroup.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("refuse une session d'un autre organisme", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      await expect(saveGeneratedGroups("s1", [])).rejects.toThrow(
        "Session introuvable"
      );
    });

    it("refuse une session clôturée", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(
        session({ status: "terminée" })
      );
      await expect(saveGeneratedGroups("s1", [])).rejects.toThrow(
        "Impossible de modifier une session clôturée"
      );
    });

    it("refuse plus de groupes que d'apprenants", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      const drafts = Array.from({ length: 4 }, (_, i) => ({
        name: `G${i}`,
        formateurId: null,
        inscriptionIds: [],
      }));
      await expect(saveGeneratedGroups("s1", drafts)).rejects.toThrow(
        "Trop de groupes"
      );
    });

    it("refuse un nom trop long", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      await expect(
        saveGeneratedGroups("s1", [
          { name: "x".repeat(101), formateurId: null, inscriptionIds: [] },
        ])
      ).rejects.toThrow("Nom du groupe trop long");
    });

    it("refuse un formateur non affecté", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      await expect(
        saveGeneratedGroups("s1", [
          { name: "A", formateurId: "intrus", inscriptionIds: [] },
        ])
      ).rejects.toThrow("Formateur non affecté à la session");
    });

    it("refuse une inscription d'une autre session ou en double", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      await expect(
        saveGeneratedGroups("s1", [
          { name: "A", formateurId: null, inscriptionIds: ["autre"] },
        ])
      ).rejects.toThrow("Inscription invalide");
      await expect(
        saveGeneratedGroups("s1", [
          { name: "A", formateurId: null, inscriptionIds: ["i1"] },
          { name: "B", formateurId: null, inscriptionIds: ["i1"] },
        ])
      ).rejects.toThrow("Inscription invalide");
    });
  });

  describe("createGroup", () => {
    it("ajoute un groupe nommé à la suite", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      mockPrisma.trainingGroup.findMany.mockResolvedValue([
        { name: "Groupe A", position: 0 },
        { name: "Groupe B", position: 1 },
      ]);
      await createGroup("s1");
      expect(mockPrisma.trainingGroup.create).toHaveBeenCalledWith({
        data: { trainingSessionId: "s1", name: "Groupe C", position: 2 },
      });
    });

    it("réutilise le premier nom libre après une suppression", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      mockPrisma.trainingGroup.findMany.mockResolvedValue([
        { name: "Groupe B", position: 1 },
      ]);
      await createGroup("s1");
      expect(mockPrisma.trainingGroup.create).toHaveBeenCalledWith({
        data: { trainingSessionId: "s1", name: "Groupe A", position: 2 },
      });
    });

    it("premier groupe d'une session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      mockPrisma.trainingGroup.findMany.mockResolvedValue([]);
      await createGroup("s1");
      expect(mockPrisma.trainingGroup.create).toHaveBeenCalledWith({
        data: { trainingSessionId: "s1", name: "Groupe A", position: 0 },
      });
    });
  });

  describe("updateGroup", () => {
    it("met à jour nom et référent", async () => {
      mockPrisma.trainingGroup.findUnique.mockResolvedValue(group());
      await updateGroup("g1", { name: " Équipe 1 ", formateurId: "f2" });
      expect(mockPrisma.trainingGroup.update).toHaveBeenCalledWith({
        where: { id: "g1" },
        data: { name: "Équipe 1", formateurId: "f2" },
      });
    });

    it("refuse un groupe d'un autre organisme", async () => {
      mockPrisma.trainingGroup.findUnique.mockResolvedValue(
        group({ trainingSession: session({ organismeId: "org-2" }) })
      );
      await expect(updateGroup("g1", { name: "X" })).rejects.toThrow(
        "Groupe introuvable"
      );
    });

    it("refuse un nom trop long", async () => {
      mockPrisma.trainingGroup.findUnique.mockResolvedValue(group());
      await expect(
        updateGroup("g1", { name: "x".repeat(101) })
      ).rejects.toThrow("Nom du groupe trop long");
    });

    it("refuse un nom vide", async () => {
      mockPrisma.trainingGroup.findUnique.mockResolvedValue(group());
      await expect(updateGroup("g1", { name: "  " })).rejects.toThrow(
        "Le nom du groupe est requis"
      );
    });

    it("refuse un formateur non affecté", async () => {
      mockPrisma.trainingGroup.findUnique.mockResolvedValue(group());
      await expect(
        updateGroup("g1", { formateurId: "intrus" })
      ).rejects.toThrow("Formateur non affecté à la session");
    });
  });

  describe("deleteGroup", () => {
    it("supprime le groupe (apprenants libérés via onDelete SetNull)", async () => {
      mockPrisma.trainingGroup.findUnique.mockResolvedValue(group());
      await deleteGroup("g1");
      expect(mockPrisma.trainingGroup.delete).toHaveBeenCalledWith({
        where: { id: "g1" },
      });
    });
  });

  describe("moveInscriptions", () => {
    it("déplace plusieurs inscriptions vers un groupe", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      mockPrisma.trainingGroup.findFirst.mockResolvedValue({ id: "g1" });
      await moveInscriptions("s1", ["i1", "i2"], "g1");
      expect(mockPrisma.inscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["i1", "i2"] }, trainingSessionId: "s1" },
        data: { groupId: "g1" },
      });
    });

    it("retire du groupe avec null", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      await moveInscriptions("s1", ["i1"], null);
      expect(mockPrisma.inscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["i1"] }, trainingSessionId: "s1" },
        data: { groupId: null },
      });
    });

    it("refuse un groupe d'une autre session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      mockPrisma.trainingGroup.findFirst.mockResolvedValue(null);
      await expect(moveInscriptions("s1", ["i1"], "g-autre")).rejects.toThrow(
        "Groupe introuvable"
      );
    });

    it("refuse une inscription d'une autre session", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
      await expect(moveInscriptions("s1", ["x"], null)).rejects.toThrow(
        "Inscription invalide"
      );
    });
  });
});
