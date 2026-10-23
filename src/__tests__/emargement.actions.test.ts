import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? "203.0.113.7" : null),
  }),
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
  inscription: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  emargement: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  rateLimit: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
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
    roles: ["ADMIN_ORGANISME"],
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
  mockPrisma.rateLimit.findUnique.mockResolvedValue(null);
});

import {
  generateSlotPin,
  generateSessionPin,
  updateEmargementStatus,
  bulkUpdateEmargementStatus,
  getSessionDetailsByPin,
  getTraineesByPinAndName,
  getTraineesByPinNameAndDob,
  validatePresencePublic,
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

  it("throw si un joueur rattaché à l'organisme tente de générer un PIN", async () => {
    mockAuthenticatedUser();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      organismeId: "org-1",
      roles: ["PLAYER"],
    });
    await expect(generateSlotPin("slot-1")).rejects.toThrow("Non autorisé");
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
      trainingSession: { organismeId: "org-1", status: "planifiée" },
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
      trainingSession: { organismeId: "org-1", status: "planifiée" },
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
      trainingSession: { organismeId: "org-1", status: "planifiée" },
    });

    await updateEmargementStatus("ins-1", "slot-1", EMARGEMENT_STATUS.ABSENT);
    expect(mockPrisma.emargement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: EMARGEMENT_STATUS.ABSENT, signedVia: null },
        create: expect.objectContaining({ status: EMARGEMENT_STATUS.ABSENT }),
      })
    );
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
  });

  it("met à jour le statut d'inscription en présent si le statut d'émargement est validé", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.inscription.findUnique.mockResolvedValue({
      id: "ins-1",
      trainingSession: { organismeId: "org-1", status: "planifiée" },
    });

    await updateEmargementStatus("ins-1", "slot-1", EMARGEMENT_STATUS.VALIDE);
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { status: "présent" },
    });
  });

  it("marque la validation comme faite par le formateur sans écraser une signature du stagiaire", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.inscription.findUnique.mockResolvedValue({
      id: "ins-1",
      trainingSession: { organismeId: "org-1", status: "planifiée" },
    });

    await updateEmargementStatus("ins-1", "slot-1", EMARGEMENT_STATUS.VALIDE);

    expect(mockPrisma.emargement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { status: EMARGEMENT_STATUS.VALIDE } })
    );
    expect(mockPrisma.emargement.updateMany).toHaveBeenCalledWith({
      where: {
        slotId: "slot-1",
        inscriptionId: "ins-1",
        status: EMARGEMENT_STATUS.VALIDE,
        signedVia: null,
      },
      data: { signedVia: "formateur", validatedAt: expect.any(Date) },
    });
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

  it("génère un upsert pour chaque inscription du créneau et met à jour les inscriptions en présent si validé", async () => {
    mockAuthenticatedUser("org-1");
    mockPrisma.slot.findUnique.mockResolvedValue({
      id: "slot-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-1", status: "planifiée" },
    });
    mockPrisma.inscription.findMany.mockResolvedValue([
      { id: "ins-1" },
      { id: "ins-2" },
      { id: "ins-3" },
    ]);

    await bulkUpdateEmargementStatus("slot-1", EMARGEMENT_STATUS.VALIDE);

    expect(mockPrisma.emargement.upsert).toHaveBeenCalledTimes(3);
    // Les signatures déjà faites via le portail ou le PIN gardent leur origine
    expect(mockPrisma.emargement.updateMany).toHaveBeenCalledWith({
      where: {
        slotId: "slot-1",
        status: EMARGEMENT_STATUS.VALIDE,
        signedVia: null,
      },
      data: { signedVia: "formateur", validatedAt: expect.any(Date) },
    });
    expect(mockPrisma.inscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ins-1", "ins-2", "ins-3"] } },
      data: { status: "présent" },
    });
  });
});

// --- Actions publiques (/validation) ---

function pinEmargement(
  id: string,
  trainee: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
  },
  status: string = EMARGEMENT_STATUS.EN_ATTENTE
) {
  return {
    id,
    status,
    inscriptionId: `ins-${trainee.id}`,
    slot: { label: "Matin J1", trainingSession: { title: "PSC Mars" } },
    inscription: { trainee },
  };
}

const alice = pinEmargement("em-1", {
  id: "t-1",
  firstName: "Alice",
  lastName: "Évrard",
  dateOfBirth: "1990-01-01",
});
const marc = pinEmargement("em-2", {
  id: "t-2",
  firstName: "Marc",
  lastName: "Martin",
  dateOfBirth: "1992-05-10",
});
const julie = pinEmargement("em-3", {
  id: "t-3",
  firstName: "Julie",
  lastName: "Martinez",
  dateOfBirth: "1995-03-20",
});

describe("recherche par PIN", () => {
  it("throw 'Code PIN invalide' et compte l'échec si aucun émargement", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([]);
    await expect(getSessionDetailsByPin("000000")).rejects.toThrow(
      "Code PIN invalide"
    );
    expect(mockPrisma.rateLimit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "validation:pin:203.0.113.7" },
      })
    );
  });

  it("rejette un PIN mal formé sans interroger la base", async () => {
    await expect(getSessionDetailsByPin("12ab")).rejects.toThrow(
      "Code PIN invalide"
    );
    expect(mockPrisma.emargement.findMany).not.toHaveBeenCalled();
  });

  it("bloque après trop d'échecs depuis la même IP", async () => {
    mockPrisma.rateLimit.findUnique.mockResolvedValue({
      key: "validation:pin:203.0.113.7",
      count: 30,
      lastRequest: BigInt(Date.now()),
    });
    await expect(getSessionDetailsByPin("123456")).rejects.toThrow(
      "Trop de tentatives"
    );
    expect(mockPrisma.emargement.findMany).not.toHaveBeenCalled();
  });

  it("ignore les sessions clôturées ou annulées", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice]);
    await getSessionDetailsByPin("123456");
    expect(mockPrisma.emargement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slot: {
            trainingSession: { status: { notIn: ["terminée", "annulée"] } },
          },
        }),
      })
    );
  });
});

describe("getSessionDetailsByPin", () => {
  it("retourne les détails de la session et du créneau", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice]);
    const result = await getSessionDetailsByPin("123456");
    expect(result).toEqual({
      sessionTitle: "PSC Mars",
      slotLabel: "Matin J1",
    });
  });
});

describe("getTraineesByPinAndName", () => {
  it("retourne le stagiaire unique, sans date de naissance", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice, marc]);

    // Insensible à la casse, aux accents et aux espaces
    const result = await getTraineesByPinAndName("123456", " EVR ");

    expect(result).toEqual({
      requiresDob: false,
      trainees: [
        {
          emargementId: "em-1",
          slotLabel: "Matin J1",
          sessionTitle: "PSC Mars",
          traineeId: "t-1",
          firstName: "Alice",
          lastName: "Évrard",
          status: EMARGEMENT_STATUS.EN_ATTENTE,
        },
      ],
    });
  });

  it("exige la date de naissance sans divulguer les noms si le préfixe est ambigu", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice, marc, julie]);
    const result = await getTraineesByPinAndName("123456", "mar");
    expect(result).toEqual({ requiresDob: true, trainees: [] });
  });

  it("refuse un préfixe de moins de 3 lettres", async () => {
    await expect(getTraineesByPinAndName("123456", "m")).rejects.toThrow(
      "3 premières lettres"
    );
  });
});

describe("getTraineesByPinNameAndDob", () => {
  it("retourne le stagiaire correspondant à la date de naissance", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice, marc, julie]);
    const result = await getTraineesByPinNameAndDob(
      "123456",
      "MAR",
      "1995-03-20"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ emargementId: "em-3" });
    expect(result[0]).not.toHaveProperty("dateOfBirth");
  });

  it("compte l'échec par PIN et préfixe si la date est fausse", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice, marc, julie]);
    await expect(
      getTraineesByPinNameAndDob("123456", "mar", "2000-01-01")
    ).rejects.toThrow("Date de naissance incorrecte.");
    expect(mockPrisma.rateLimit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "validation:dob:123456:mar" },
      })
    );
  });
});

describe("validatePresencePublic", () => {
  it("valide la présence avec PIN et préfixe corrects", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice, marc]);

    const result = await validatePresencePublic({
      pin: "123456",
      emargementId: "em-1",
      lastNamePrefix: "evr",
    });

    expect(result).toEqual({ status: EMARGEMENT_STATUS.VALIDE });
    expect(mockPrisma.emargement.update).toHaveBeenCalledWith({
      where: { id: "em-1" },
      data: expect.objectContaining({ status: EMARGEMENT_STATUS.VALIDE }),
    });
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-t-1" },
      data: { status: "présent" },
    });
  });

  it("refuse un emargementId qui ne correspond pas au PIN (régression)", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice]);
    await expect(
      validatePresencePublic({
        pin: "123456",
        emargementId: "em-autre-session",
        lastNamePrefix: "evr",
      })
    ).rejects.toThrow("Stagiaire introuvable");
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });

  it("refuse un stagiaire dont le nom ne correspond pas au préfixe", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([alice, marc]);
    await expect(
      validatePresencePublic({
        pin: "123456",
        emargementId: "em-2",
        lastNamePrefix: "evr",
      })
    ).rejects.toThrow("Stagiaire introuvable");
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });

  it("exige la bonne date de naissance si le préfixe est ambigu", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([marc, julie]);

    await expect(
      validatePresencePublic({
        pin: "123456",
        emargementId: "em-3",
        lastNamePrefix: "mar",
      })
    ).rejects.toThrow("Date de naissance incorrecte.");

    await validatePresencePublic({
      pin: "123456",
      emargementId: "em-3",
      lastNamePrefix: "mar",
      dateOfBirth: "1995-03-20",
    });
    expect(mockPrisma.emargement.update).toHaveBeenCalledTimes(1);
  });

  it("est idempotent si la présence est déjà validée", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([
      pinEmargement(
        "em-1",
        { id: "t-1", firstName: "Alice", lastName: "Évrard" },
        EMARGEMENT_STATUS.VALIDE
      ),
    ]);
    const result = await validatePresencePublic({
      pin: "123456",
      emargementId: "em-1",
      lastNamePrefix: "evr",
    });
    expect(result).toEqual({ status: EMARGEMENT_STATUS.VALIDE });
    expect(mockPrisma.emargement.update).not.toHaveBeenCalled();
  });
});
