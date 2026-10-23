import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({ get: () => null }),
  cookies: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/r2", () => ({
  getPresignedUrl: vi.fn().mockResolvedValue("https://r2.example/signed"),
}));

const mockSession = vi.hoisted(() => ({
  requireTrainee: vi.fn(),
  getTraineeInscription: vi.fn(),
}));
vi.mock("@/lib/trainee-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/trainee-session")>()),
  ...mockSession,
}));

const mockPrisma = vi.hoisted(() => ({
  emargement: { findUnique: vi.fn(), update: vi.fn() },
  inscription: { update: vi.fn() },
  sessionDocument: { findFirst: vi.fn() },
  rateLimit: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { revalidatePath } from "next/cache";
import { getPresignedUrl } from "@/lib/r2";
import {
  getDocumentDownloadUrl,
  signEmargementFromPortal,
} from "@/app/espace/actions";
import { EMARGEMENT_STATUS } from "@/app/admin/training/types";

// --- Helpers ---

// Créneau 9h00–12h30 le 12/11/2026, soit 08:00–11:30 UTC
const SLOT = {
  id: "slot-1",
  date: new Date("2026-11-12T00:00:00Z"),
  startTime: "09:00",
  endTime: "12:30",
};

function inscription(
  overrides: { pinFailedCount?: number; pinLockedUntil?: Date | null } = {}
) {
  return {
    id: "ins-1",
    traineeId: "t-1",
    trainingSessionId: "ts-1",
    pinFailedCount: overrides.pinFailedCount ?? 0,
    pinLockedUntil: overrides.pinLockedUntil ?? null,
    trainingSession: { status: "en_cours" },
  };
}

function emargement(status: string = EMARGEMENT_STATUS.EN_ATTENTE) {
  return {
    id: "em-1",
    inscriptionId: "ins-1",
    status,
    validationCode: "482913",
    slot: SLOT,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T08:30:00Z")); // 9h30 à Paris
  mockSession.requireTrainee.mockResolvedValue(inscription());
  mockSession.getTraineeInscription.mockResolvedValue(inscription());
  mockPrisma.emargement.findUnique.mockResolvedValue(emargement());
  mockPrisma.inscription.update.mockResolvedValue({ pinFailedCount: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

// --- signEmargementFromPortal ---

describe("signEmargementFromPortal", () => {
  it("signe avec le bon PIN pendant le créneau", async () => {
    const result = await signEmargementFromPortal("ins-1", "slot-1", "482913");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.emargement.update).toHaveBeenCalledWith({
      where: { id: "em-1" },
      data: expect.objectContaining({
        status: EMARGEMENT_STATUS.VALIDE,
        signedVia: "portail",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/espace/sessions/ins-1");
  });

  it("refuse une formation qui n'appartient pas au stagiaire", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(null);
    const result = await signEmargementFromPortal("ins-x", "slot-1", "482913");
    expect(result).toEqual({ ok: false, error: "Formation introuvable." });
    expect(mockPrisma.emargement.findUnique).not.toHaveBeenCalled();
  });

  it("cherche l'émargement de l'inscription vérifiée, pas d'une autre", async () => {
    await signEmargementFromPortal("ins-1", "slot-1", "482913");
    expect(mockPrisma.emargement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          inscriptionId_slotId: { inscriptionId: "ins-1", slotId: "slot-1" },
        },
      })
    );
  });

  it("compte un mauvais PIN et indique les essais restants", async () => {
    const result = await signEmargementFromPortal("ins-1", "slot-1", "000000");

    expect(result).toEqual({
      ok: false,
      error: "Code incorrect. Il vous reste 4 essais.",
    });
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { pinFailedCount: { increment: 1 } } })
    );
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });

  it("verrouille 10 minutes au 5e échec", async () => {
    mockPrisma.inscription.update.mockResolvedValue({ pinFailedCount: 5 });

    const result = await signEmargementFromPortal("ins-1", "slot-1", "000000");

    expect(result).toEqual({
      ok: false,
      error:
        "Trop d'essais. Réessayez à 9h40 ou demandez le code à votre formateur.",
    });
    expect(mockPrisma.inscription.update).toHaveBeenLastCalledWith({
      where: { id: "ins-1" },
      data: {
        pinFailedCount: 0,
        pinLockedUntil: new Date("2026-11-12T08:40:00Z"),
      },
    });
  });

  it("refuse même le bon PIN pendant le verrou", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(
      inscription({ pinLockedUntil: new Date("2026-11-12T08:35:00Z") })
    );
    const result = await signEmargementFromPortal("ins-1", "slot-1", "482913");
    expect(result.ok).toBe(false);
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });

  it("remet le compteur à zéro après une signature réussie", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(
      inscription({ pinFailedCount: 2 })
    );
    await signEmargementFromPortal("ins-1", "slot-1", "482913");
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { pinFailedCount: 0, pinLockedUntil: null },
    });
  });

  it("ne compte pas un PIN mal formé comme un essai", async () => {
    const result = await signEmargementFromPortal("ins-1", "slot-1", "12");
    expect(result.ok).toBe(false);
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
  });

  it("refuse avant l'ouverture du créneau", async () => {
    vi.setSystemTime(new Date("2026-11-12T07:30:00Z")); // 8h30 à Paris
    const result = await signEmargementFromPortal("ins-1", "slot-1", "482913");
    expect(result).toEqual({
      ok: false,
      error: "L'émargement ouvre à 8h45.",
    });
  });

  it("refuse après la fin du créneau", async () => {
    vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
    const result = await signEmargementFromPortal("ins-1", "slot-1", "482913");
    expect(result.ok).toBe(false);
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });

  it("refuse si aucun code n'a été généré pour ce créneau", async () => {
    mockPrisma.emargement.findUnique.mockResolvedValue(null);
    const result = await signEmargementFromPortal("ins-1", "slot-1", "482913");
    expect(result.ok).toBe(false);
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
  });

  it("est idempotent si déjà signé", async () => {
    mockPrisma.emargement.findUnique.mockResolvedValue(
      emargement(EMARGEMENT_STATUS.VALIDE)
    );
    const result = await signEmargementFromPortal("ins-1", "slot-1", "000000");
    expect(result).toEqual({ ok: true });
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });
});

// --- getDocumentDownloadUrl ---

describe("getDocumentDownloadUrl", () => {
  it("renvoie une URL courte, nommée d'après le titre", async () => {
    mockPrisma.sessionDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      title: "Livret stagiaire PSE1",
      fileKey: "org-1/session-documents/123-livret.pdf",
    });

    const result = await getDocumentDownloadUrl("ins-1", "doc-1");

    expect(result).toEqual({ ok: true, url: "https://r2.example/signed" });
    expect(getPresignedUrl).toHaveBeenCalledWith(
      "org-1/session-documents/123-livret.pdf",
      300,
      "Livret stagiaire PSE1.pdf"
    );
  });

  it("limite la recherche à la session et aux documents visibles", async () => {
    mockPrisma.sessionDocument.findFirst.mockResolvedValue(null);

    const result = await getDocumentDownloadUrl("ins-1", "doc-1");

    expect(result).toEqual({ ok: false, error: "Document introuvable." });
    expect(mockPrisma.sessionDocument.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "doc-1",
        trainingSessionId: "ts-1",
        OR: [{ visibleFrom: null }, { visibleFrom: { lte: expect.any(Date) } }],
      }),
    });
  });
});
