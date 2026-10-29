import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  acceptTerms,
  getPreReadDownloadUrl,
  getTermsDownloadUrl,
  toggleChecklistItem,
} from "./welcome-actions";
import { getTraineeInscription } from "@/lib/trainee-session";
import { loadWelcome } from "@/lib/welcome-kit-service";

const mockPrisma = vi.hoisted(() => ({
  inscription: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
}));
const mockR2 = vi.hoisted(() => ({
  getPresignedUrl: vi.fn().mockResolvedValue("https://download"),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/r2", () => mockR2);
vi.mock("@/lib/trainee-session", () => ({
  requireTrainee: vi.fn().mockResolvedValue({ id: "ins-1" }),
  getTraineeInscription: vi.fn(),
}));
vi.mock("@/lib/welcome-kit-service", () => ({ loadWelcome: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi
    .fn()
    .mockResolvedValue(new Headers({ "user-agent": "A".repeat(600) })),
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn().mockResolvedValue("1.2.3.4"),
}));

const FIRST = "2026-11-01T10:00:00.000Z";

function inscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "ins-1",
    checklistDone: null,
    prereadOpenedAt: null,
    termsAcceptedAt: null,
    termsFileKey: null,
    trainingSession: {
      id: "session-1",
      type: "PSE1",
      organismeId: "org-1",
      startDate: new Date("2026-11-12"),
    },
    ...overrides,
  };
}

function welcome(overrides: Record<string, unknown> = {}) {
  return {
    toBring: null,
    checklist: [{ id: "tenue", label: "Tenue" }],
    hasTerms: true,
    terms: { fileKey: "terms/v2.pdf", version: "v2" },
    preReads: [
      {
        id: "doc-1",
        source: "kit",
        title: "Fiche Bilans",
        size: 10,
        fileKey: "kit/fiche.pdf",
        mimeType: "application/pdf",
        visibleFrom: null,
        createdAt: new Date(),
      },
      {
        id: "doc-2",
        source: "session",
        title: "Fiche future",
        size: 10,
        fileKey: "session/futur.pdf",
        mimeType: "application/pdf",
        visibleFrom: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      },
    ],
    ...overrides,
  };
}

function given(ins: ReturnType<typeof inscription> | null, w = welcome()) {
  vi.mocked(getTraineeInscription).mockResolvedValue(
    ins as unknown as Awaited<ReturnType<typeof getTraineeInscription>>
  );
  vi.mocked(loadWelcome).mockResolvedValue(
    w as unknown as Awaited<ReturnType<typeof loadWelcome>>
  );
}

describe("welcome-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse une inscription inaccessible", async () => {
    given(null);
    expect(await toggleChecklistItem("ins-x", "tenue", true)).toEqual({
      ok: false,
      error: "Formation introuvable.",
    });
  });

  describe("toggleChecklistItem", () => {
    it("refuse un item inconnu", async () => {
      given(inscription());
      expect(await toggleChecklistItem("ins-1", "autre", true)).toEqual({
        ok: false,
        error: "Élément introuvable.",
      });
      expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
    });

    it("cocher deux fois garde la première date", async () => {
      given(inscription({ checklistDone: { tenue: FIRST } }));
      await toggleChecklistItem("ins-1", "tenue", true);
      expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
        where: { id: "ins-1" },
        data: { checklistDone: { tenue: FIRST } },
      });
    });

    it("décocher retire la clé", async () => {
      given(inscription({ checklistDone: { tenue: FIRST } }));
      await toggleChecklistItem("ins-1", "tenue", false);
      expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
        where: { id: "ins-1" },
        data: { checklistDone: {} },
      });
    });
  });

  describe("acceptTerms", () => {
    it("refuse sans CGV", async () => {
      given(inscription(), welcome({ terms: null, hasTerms: false }));
      expect(await acceptTerms("ins-1")).toEqual({
        ok: false,
        error: "Aucune condition à accepter.",
      });
      expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
    });

    it("déjà accepté : renvoie la date d'origine sans écrire", async () => {
      given(inscription({ termsAcceptedAt: new Date(FIRST) }));
      expect(await acceptTerms("ins-1")).toEqual({
        ok: true,
        acceptedAt: FIRST,
      });
      expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
    });

    it("enregistre version, clé, IP et UA tronqué à 512", async () => {
      given(inscription());
      mockPrisma.inscription.updateMany.mockResolvedValue({ count: 1 });

      const result = await acceptTerms("ins-1");

      expect(result.ok).toBe(true);
      const call = mockPrisma.inscription.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: "ins-1", termsAcceptedAt: null });
      expect(call.data).toMatchObject({
        termsVersion: "v2",
        termsFileKey: "terms/v2.pdf",
        termsAcceptedIp: "1.2.3.4",
      });
      expect(call.data.termsAcceptedUa).toHaveLength(512);
    });

    it("course perdue : renvoie l'acceptation déjà enregistrée", async () => {
      given(inscription());
      mockPrisma.inscription.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.inscription.findUnique.mockResolvedValue({
        termsAcceptedAt: new Date(FIRST),
      });
      expect(await acceptTerms("ins-1")).toEqual({
        ok: true,
        acceptedAt: FIRST,
      });
    });
  });

  describe("getPreReadDownloadUrl", () => {
    it("refuse un document absent des pré-lectures de la session", async () => {
      given(inscription());
      expect(await getPreReadDownloadUrl("ins-1", "kit", "doc-x")).toEqual({
        ok: false,
        error: "Document introuvable.",
      });
      // Même id, mauvaise source : pas de confusion kit / session
      expect(await getPreReadDownloadUrl("ins-1", "session", "doc-1")).toEqual({
        ok: false,
        error: "Document introuvable.",
      });
      expect(mockR2.getPresignedUrl).not.toHaveBeenCalled();
    });

    it("refuse un document pas encore visible", async () => {
      given(inscription());
      expect(await getPreReadDownloadUrl("ins-1", "session", "doc-2")).toEqual({
        ok: false,
        error: "Document pas encore disponible.",
      });
      expect(mockR2.getPresignedUrl).not.toHaveBeenCalled();
    });

    it("premier téléchargement : pose la date", async () => {
      given(inscription());
      expect(await getPreReadDownloadUrl("ins-1", "kit", "doc-1")).toEqual({
        ok: true,
        url: "https://download",
      });
      expect(mockR2.getPresignedUrl).toHaveBeenCalledWith(
        "kit/fiche.pdf",
        300,
        "Fiche Bilans.pdf"
      );
      const call = mockPrisma.inscription.update.mock.calls[0][0];
      expect(call.data.prereadOpenedAt).toEqual({
        "doc-1": expect.any(String),
      });
    });

    it("second téléchargement : n'écrase pas la date", async () => {
      given(inscription({ prereadOpenedAt: { "doc-1": FIRST } }));
      await getPreReadDownloadUrl("ins-1", "kit", "doc-1");
      expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
    });
  });

  describe("getTermsDownloadUrl", () => {
    it("sert la version acceptée plutôt que la courante", async () => {
      given(inscription({ termsFileKey: "terms/v1.pdf" }));
      await getTermsDownloadUrl("ins-1");
      expect(mockR2.getPresignedUrl).toHaveBeenCalledWith(
        "terms/v1.pdf",
        300,
        "Conditions générales.pdf"
      );
    });

    it("sans acceptation, sert la version courante", async () => {
      given(inscription());
      await getTermsDownloadUrl("ins-1");
      expect(mockR2.getPresignedUrl).toHaveBeenCalledWith(
        "terms/v2.pdf",
        300,
        "Conditions générales.pdf"
      );
    });
  });
});
