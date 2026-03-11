import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  slot: { findUnique: vi.fn() },
  trainingSession: { findUnique: vi.fn() },
  inscription: { findMany: vi.fn(), findUnique: vi.fn() },
  emargement: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// --- Helpers ---

import { auth } from "@/lib/auth";

function mockAuthenticatedUser(organismeId = "org-1") {
  (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user-1" },
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId,
  });
}

function mockUnauthenticated() {
  (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : ops
  );
  mockPrisma.emargement.upsert.mockResolvedValue({});
});

import {
  generateSlotPin,
  generateSessionPin,
  updateEmargementStatus,
  bulkUpdateEmargementStatus,
  getTraineesByPin,
} from "@/app/admin/training/actions";

describe("generateSlotPin", () => {
  it("throw si l'utilisateur n'est pas authentifié", async () => {
    mockUnauthenticated();
    await expect(generateSlotPin("slot-1")).rejects.toThrow("Non autorisé");
  });

  it("throw si l'utilisateur n'a pas d'organismeId", async () => {
    mockAuthenticatedUser();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      organismeId: null,
    });
    await expect(generateSlotPin("slot-1")).rejects.toThrow(
      "Aucun organisme associé"
    );
  });

  it("throw si le créneau n'existe pas", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue(null);
    await expect(generateSlotPin("slot-inexistant")).rejects.toThrow(
      "Créneau introuvable ou non autorisé"
    );
  });

  it("throw si le créneau appartient à un autre organisme", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue({
      id: "slot-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-autre" },
    });
    await expect(generateSlotPin("slot-1")).rejects.toThrow(
      "Créneau introuvable ou non autorisé"
    );
  });

  it("retourne un PIN à 6 chiffres", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue({
      id: "slot-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-1" },
    });
    mockPrisma.inscription.findMany.mockResolvedValue([
      { id: "ins-1" },
      { id: "ins-2" },
    ]);

    const pin = await generateSlotPin("slot-1");

    expect(pin).toMatch(/^\d{6}$/);
  });

  it("génère un upsert pour chaque inscription", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue({
      id: "slot-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-1" },
    });
    mockPrisma.inscription.findMany.mockResolvedValue([
      { id: "ins-1" },
      { id: "ins-2" },
    ]);

    await generateSlotPin("slot-1");

    expect(mockPrisma.emargement.upsert).toHaveBeenCalledTimes(2);
  });
});
