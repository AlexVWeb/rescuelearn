import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({ get: () => "203.0.113.7" }),
  cookies: vi.fn(),
}));
// Comme Next : redirect interrompt l'action
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockSession = vi.hoisted(() => ({
  requireTrainee: vi.fn(),
  getTraineeInscription: vi.fn(),
}));
vi.mock("@/lib/trainee-session", () => mockSession);

const mockPrisma = vi.hoisted(() => ({
  slot: { findMany: vi.fn() },
  emargement: { findMany: vi.fn() },
  evaluationResponse: { findMany: vi.fn(), upsert: vi.fn() },
  inscription: { update: vi.fn() },
  rateLimit: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import {
  saveEvaluationDraft,
  setEvaluationReminders,
  submitEvaluation,
} from "@/app/espace/sessions/[inscriptionId]/evaluations/actions";

// --- Helpers ---

// Dernier créneau : 21/10/2026 17h30 à Paris = 15:30 UTC
const SLOTS = [
  {
    date: new Date("2026-10-21T00:00:00Z"),
    startTime: "13:30",
    endTime: "17:30",
  },
];
const DURING_HOT = new Date("2026-10-25T10:00:00Z");

const INSCRIPTION = {
  id: "ins-1",
  traineeId: "t-1",
  trainee: { isAnonymized: false },
  trainingSession: { id: "ts-1", status: "terminée" },
};

const COMPLETE: [string, string][] = [
  ["satisfaction_globale", "4"],
  ["organisation", "3"],
  ["rythme", "adapte"],
  ["explications", "4"],
  ["mises_en_situation", "3"],
  ["objectifs_atteints", "4"],
  ["capacite_intervenir", "3"],
  ["attentes", "oui"],
  ["nps", "9"],
];

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

const IDLE = { status: "idle" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(DURING_HOT);
  mockSession.requireTrainee.mockResolvedValue(INSCRIPTION);
  mockSession.getTraineeInscription.mockResolvedValue(INSCRIPTION);
  mockPrisma.slot.findMany.mockResolvedValue(SLOTS);
  mockPrisma.emargement.findMany.mockResolvedValue([{ status: "validé" }]);
  mockPrisma.evaluationResponse.findMany.mockResolvedValue([]);
  mockPrisma.rateLimit.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

const NOT_AVAILABLE = {
  status: "error",
  message: "Cette évaluation n'est pas accessible.",
};

describe("submitEvaluation", () => {
  it("enregistre une réponse complète puis redirige vers la confirmation", async () => {
    await expect(
      submitEvaluation(
        "ins-1",
        "chaud",
        IDLE,
        form([...COMPLETE, ["consent", "on"], ["suggestions", "<b>Top</b>"]])
      )
    ).rejects.toThrow(
      "NEXT_REDIRECT:/espace/sessions/ins-1/evaluations/chaud/merci"
    );

    expect(mockPrisma.evaluationResponse.upsert).toHaveBeenCalledWith({
      where: { inscriptionId_type: { inscriptionId: "ins-1", type: "chaud" } },
      create: expect.objectContaining({
        inscriptionId: "ins-1",
        type: "chaud",
        version: "chaud-v1",
        status: "soumise",
        answers: expect.objectContaining({ nps: 9, suggestions: "Top" }),
      }),
      update: expect.objectContaining({ status: "soumise" }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/espace/sessions/ins-1");
  });

  it("journalise sans identifiant en clair ni réponse", async () => {
    await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form([...COMPLETE, ["consent", "on"]])
    ).catch(() => undefined);

    const [, data] = vi.mocked(logger.info).mock.calls[0];
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("ins-1");
    expect(serialized).not.toContain("nps");
    expect(data).toMatchObject({ type: "chaud", ref: expect.any(String) });
  });

  it("exige le consentement", async () => {
    const result = await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form(COMPLETE)
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { consent: expect.any(String) },
    });
    expect(mockPrisma.evaluationResponse.upsert).not.toHaveBeenCalled();
  });

  it("renvoie les erreurs par champ et la saisie valide", async () => {
    const result = await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form([
        ["nps", "8"],
        ["consent", "on"],
      ])
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { satisfaction_globale: expect.any(String) },
      values: { nps: 8 },
    });
    expect(mockPrisma.evaluationResponse.upsert).not.toHaveBeenCalled();
  });

  it("refuse une inscription d'un autre stagiaire avec le même message qu'un type inconnu", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(null);
    const otherTrainee = await submitEvaluation(
      "ins-2",
      "chaud",
      IDLE,
      form(COMPLETE)
    );
    mockSession.getTraineeInscription.mockResolvedValue(INSCRIPTION);
    const unknownType = await submitEvaluation(
      "ins-1",
      "tiede",
      IDLE,
      form(COMPLETE)
    );

    expect(otherTrainee).toEqual(NOT_AVAILABLE);
    expect(unknownType).toEqual(NOT_AVAILABLE);
    expect(mockPrisma.evaluationResponse.upsert).not.toHaveBeenCalled();
  });

  it("refuse un stagiaire sans émargement validé", async () => {
    mockPrisma.emargement.findMany.mockResolvedValue([{ status: "absent" }]);
    expect(
      await submitEvaluation(
        "ins-1",
        "chaud",
        IDLE,
        form([...COMPLETE, ["consent", "on"]])
      )
    ).toEqual(NOT_AVAILABLE);
  });

  it("refuse une session annulée", async () => {
    mockSession.getTraineeInscription.mockResolvedValue({
      ...INSCRIPTION,
      trainingSession: { id: "ts-1", status: "annulée" },
    });
    expect(
      await submitEvaluation(
        "ins-1",
        "chaud",
        IDLE,
        form([...COMPLETE, ["consent", "on"]])
      )
    ).toEqual(NOT_AVAILABLE);
  });

  it("refuse l'évaluation à froid avant son ouverture", async () => {
    const result = await submitEvaluation(
      "ins-1",
      "froid",
      IDLE,
      form([["consent", "on"]])
    );
    expect(result).toMatchObject({
      status: "error",
      message: expect.stringMatching(/pas encore ouverte/),
    });
  });

  it("refuse toute modification après la clôture", async () => {
    vi.setSystemTime(new Date("2026-11-20T16:31:00Z")); // J+30 dépassé
    const result = await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form([...COMPLETE, ["consent", "on"]])
    );
    expect(result).toMatchObject({
      status: "error",
      message: expect.stringMatching(/close/),
    });
    expect(mockPrisma.evaluationResponse.upsert).not.toHaveBeenCalled();
  });

  it("accepte encore une soumission à l'instant exact de clôture", async () => {
    vi.setSystemTime(new Date("2026-11-20T16:30:00Z"));
    await expect(
      submitEvaluation(
        "ins-1",
        "chaud",
        IDLE,
        form([...COMPLETE, ["consent", "on"]])
      )
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("une seconde soumission met à jour la même réponse (upsert unique)", async () => {
    mockPrisma.evaluationResponse.findMany.mockResolvedValue([
      {
        type: "chaud",
        version: "chaud-v1",
        status: "soumise",
        submittedAt: new Date(),
        answers: { nps: 3 },
      },
    ]);
    await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form([...COMPLETE, ["consent", "on"]])
    ).catch(() => undefined);

    expect(mockPrisma.evaluationResponse.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.evaluationResponse.upsert.mock.calls[0][0].where).toEqual(
      {
        inscriptionId_type: { inscriptionId: "ins-1", type: "chaud" },
      }
    );
  });

  it("refuse au-delà de la limite de débit", async () => {
    mockPrisma.rateLimit.findUnique.mockResolvedValue({
      count: 30,
      lastRequest: BigInt(Date.now()),
    });
    const result = await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form([...COMPLETE, ["consent", "on"]])
    );
    expect(result).toMatchObject({
      status: "error",
      message: expect.stringMatching(/Trop d'envois/),
    });
    expect(mockPrisma.evaluationResponse.upsert).not.toHaveBeenCalled();
  });

  it("ignore un traineeId injecté dans le formulaire", async () => {
    await submitEvaluation(
      "ins-1",
      "chaud",
      IDLE,
      form([...COMPLETE, ["consent", "on"], ["traineeId", "t-999"]])
    ).catch(() => undefined);
    const call = mockPrisma.evaluationResponse.upsert.mock.calls[0][0];
    expect(JSON.stringify(call)).not.toContain("t-999");
  });
});

describe("saveEvaluationDraft", () => {
  it("enregistre un brouillon partiel", async () => {
    const result = await saveEvaluationDraft(
      "ins-1",
      "chaud",
      IDLE,
      form([["nps", "7"]])
    );
    expect(result).toMatchObject({ status: "saved" });
    expect(mockPrisma.evaluationResponse.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ answers: { nps: 7 } }),
        update: { answers: { nps: 7 } },
      })
    );
  });

  it("ne transforme jamais une réponse soumise en brouillon", async () => {
    mockPrisma.evaluationResponse.findMany.mockResolvedValue([
      {
        type: "chaud",
        version: "chaud-v1",
        status: "soumise",
        submittedAt: new Date(),
        answers: {},
      },
    ]);
    const result = await saveEvaluationDraft(
      "ins-1",
      "chaud",
      IDLE,
      form([["nps", "7"]])
    );
    expect(result).toEqual(IDLE);
    expect(mockPrisma.evaluationResponse.upsert).not.toHaveBeenCalled();
  });

  it("refuse une valeur hors schéma", async () => {
    const result = await saveEvaluationDraft(
      "ins-1",
      "chaud",
      IDLE,
      form([["nps", "42"]])
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { nps: expect.any(String) },
    });
  });
});

describe("setEvaluationReminders", () => {
  it("coupe les rappels de l'inscription du stagiaire connecté", async () => {
    await setEvaluationReminders("ins-1", false);
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { evaluationRemindersOptOut: true },
    });
  });

  it("n'agit pas sur l'inscription d'un autre stagiaire", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(null);
    await setEvaluationReminders("ins-2", false);
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
  });
});
