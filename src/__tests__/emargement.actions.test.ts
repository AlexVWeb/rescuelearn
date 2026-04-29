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
  trainingSession: { findUnique: vi.fn(), findFirst: vi.fn() },
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
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

// --- Helpers ---

import { auth } from "@/lib/auth";

function mockAuthenticatedUser(organismeId = "org-1") {
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue({
    user: { id: "user-1" },
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId,
  });
}

function mockUnauthenticated() {
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue(null);
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
import { EMARGEMENT_STATUS } from "@/app/admin/training/types";

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

describe("generateSessionPin", () => {
  it("throw si l'utilisateur n'est pas authentifié", async () => {
    mockUnauthenticated();
    await expect(generateSessionPin("session-1")).rejects.toThrow(
      "Non autorisé"
    );
  });

  it("throw si la session n'existe pas", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.trainingSession.findUnique.mockResolvedValue(null);
    await expect(generateSessionPin("session-inexistante")).rejects.toThrow(
      "Session introuvable ou non autorisée"
    );
  });

  it("throw si la session appartient à un autre organisme", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.trainingSession.findUnique.mockResolvedValue({
      id: "session-1",
      organismeId: "org-autre",
      slots: [],
    });
    await expect(generateSessionPin("session-1")).rejects.toThrow(
      "Session introuvable ou non autorisée"
    );
  });

  it("retourne un objet avec un PIN par slot", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.trainingSession.findUnique.mockResolvedValue({
      id: "session-1",
      organismeId: "org-1",
      slots: [{ id: "slot-A" }, { id: "slot-B" }, { id: "slot-C" }],
    });
    mockPrisma.inscription.findMany.mockResolvedValue([{ id: "ins-1" }]);

    const result = await generateSessionPin("session-1");

    expect(Object.keys(result)).toHaveLength(3);
    expect(result).toHaveProperty("slot-A");
    expect(result).toHaveProperty("slot-B");
    expect(result).toHaveProperty("slot-C");
  });

  it("chaque slot reçoit un PIN à 6 chiffres", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.trainingSession.findUnique.mockResolvedValue({
      id: "session-1",
      organismeId: "org-1",
      slots: [{ id: "slot-A" }, { id: "slot-B" }],
    });
    mockPrisma.inscription.findMany.mockResolvedValue([{ id: "ins-1" }]);

    const result = await generateSessionPin("session-1");

    for (const pin of Object.values(result)) {
      expect(pin).toMatch(/^\d{6}$/);
    }
  });

  it("les PINs de chaque slot sont différents (régression)", async () => {
    // Ce test protège contre la régression vers un PIN unique global
    mockAuthenticatedUser("org-1");
    mockPrisma.trainingSession.findUnique.mockResolvedValue({
      id: "session-1",
      organismeId: "org-1",
      slots: [{ id: "slot-A" }, { id: "slot-B" }, { id: "slot-C" }],
    });
    mockPrisma.inscription.findMany.mockResolvedValue([{ id: "ins-1" }]);

    // Lancer plusieurs fois pour réduire la probabilité de faux positif
    const results = await Promise.all([
      generateSessionPin("session-1"),
      generateSessionPin("session-1"),
      generateSessionPin("session-1"),
    ]);

    for (const result of results) {
      const pins = Object.values(result);
      const uniquePins = new Set(pins);
      // Avec 3 slots, on attend 3 PINs distincts dans la très grande majorité des cas
      // (probabilité de collision ~1/900000 par paire)
      expect(uniquePins.size).toBe(pins.length);
    }
  });

  it("génère un upsert pour chaque combinaison (inscription × slot)", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.trainingSession.findUnique.mockResolvedValue({
      id: "session-1",
      organismeId: "org-1",
      slots: [{ id: "slot-A" }, { id: "slot-B" }],
    });
    mockPrisma.inscription.findMany.mockResolvedValue([
      { id: "ins-1" },
      { id: "ins-2" },
    ]);

    await generateSessionPin("session-1");

    // 2 inscriptions × 2 slots = 4 upserts
    expect(mockPrisma.emargement.upsert).toHaveBeenCalledTimes(4);
  });
});

describe("updateEmargementStatus", () => {
  it("throw si l'utilisateur n'est pas authentifié", async () => {
    mockUnauthenticated();
    await expect(
      updateEmargementStatus("ins-1", "slot-1", EMARGEMENT_STATUS.VALIDE)
    ).rejects.toThrow("Non autorisé");
  });

  it("throw si l'inscription n'existe pas", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.inscription.findUnique.mockResolvedValue(null);
    await expect(
      updateEmargementStatus(
        "ins-inexistante",
        "slot-1",
        EMARGEMENT_STATUS.VALIDE
      )
    ).rejects.toThrow("Inscription introuvable ou non autorisée");
  });

  it("throw si l'inscription appartient à un autre organisme", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.inscription.findUnique.mockResolvedValue({
      id: "ins-1",
      trainingSession: { organismeId: "org-autre" },
    });
    await expect(
      updateEmargementStatus("ins-1", "slot-1", EMARGEMENT_STATUS.VALIDE)
    ).rejects.toThrow("Inscription introuvable ou non autorisée");
  });

  it("appelle upsert avec le bon statut", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.inscription.findUnique.mockResolvedValue({
      id: "ins-1",
      trainingSession: { organismeId: "org-1" },
    });

    await updateEmargementStatus("ins-1", "slot-1", EMARGEMENT_STATUS.ABSENT);
    expect(mockPrisma.emargement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: EMARGEMENT_STATUS.ABSENT },
        create: expect.objectContaining({ status: EMARGEMENT_STATUS.ABSENT }),
      })
    );
  });
});

describe("bulkUpdateEmargementStatus", () => {
  it("throw si l'utilisateur n'est pas authentifié", async () => {
    mockUnauthenticated();
    await expect(
      bulkUpdateEmargementStatus("slot-1", EMARGEMENT_STATUS.VALIDE)
    ).rejects.toThrow("Non autorisé");
  });

  it("throw si le créneau n'existe pas", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue(null);
    await expect(
      bulkUpdateEmargementStatus("slot-inexistant", EMARGEMENT_STATUS.VALIDE)
    ).rejects.toThrow("Créneau introuvable ou non autorisé");
  });

  it("throw si le créneau appartient à un autre organisme", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue({
      id: "slot-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-autre" },
    });
    await expect(
      bulkUpdateEmargementStatus("slot-1", EMARGEMENT_STATUS.ABSENT)
    ).rejects.toThrow("Créneau introuvable ou non autorisé");
  });

  it("génère un upsert pour chaque inscription du créneau", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue({
      id: "slot-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-1" },
    });
    mockPrisma.inscription.findMany.mockResolvedValue([
      { id: "ins-1" },
      { id: "ins-2" },
      { id: "ins-3" },
    ]);

    await bulkUpdateEmargementStatus("slot-1", EMARGEMENT_STATUS.VALIDE);

    expect(mockPrisma.emargement.upsert).toHaveBeenCalledTimes(3);
  });
});

describe("getTraineesByPin", () => {
  it("throw 'Code PIN invalide' si aucun émargement trouvé", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([]);
    await expect(getTraineesByPin("000000")).rejects.toThrow(
      "Code PIN invalide"
    );
  });

  it("retourne la liste des stagiaires avec la bonne forme", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([
      {
        id: "em-1",
        status: "en_attente",
        slot: {
          label: "Matin J1",
          trainingSession: { title: "PSC Mars" },
        },
        inscription: {
          trainee: { id: "t-1", firstName: "Alice", lastName: "Dupont" },
        },
      },
    ]);

    const result = await getTraineesByPin("123456");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      emargementId: "em-1",
      slotLabel: "Matin J1",
      sessionTitle: "PSC Mars",
      traineeId: "t-1",
      firstName: "Alice",
      lastName: "Dupont",
      status: EMARGEMENT_STATUS.EN_ATTENTE,
    });
  });

  it("ne requiert pas d'authentification (flow public)", async () => {
    // getTraineesByPin est accessible sans session — ne doit pas throw "Non autorisé"
    mockUnauthenticated(); // auth mockée mais non appelée par cette fonction
    mockPrisma.emargement.findMany.mockResolvedValue([
      {
        id: "em-1",
        status: "en_attente",
        slot: { label: "Matin", trainingSession: { title: "Formation" } },
        inscription: {
          trainee: { id: "t-1", firstName: "Bob", lastName: "Martin" },
        },
      },
    ]);

    await expect(getTraineesByPin("654321")).resolves.not.toThrow();
  });
});
