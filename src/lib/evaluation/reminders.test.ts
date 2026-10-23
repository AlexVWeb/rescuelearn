import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Prisma } from "@prisma/client";

const mockPrisma = vi.hoisted(() => ({
  trainingSession: { findMany: vi.fn() },
  evaluationReminder: { create: vi.fn(), delete: vi.fn() },
  inscription: { updateMany: vi.fn() },
}));
const mockEmail = vi.hoisted(() => ({ sendEvaluationInvitation: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/email", () => ({ EmailService: mockEmail }));
vi.mock("@/lib/trainee-access", () => ({
  generateAccessToken: () => ({ token: "new-token", hash: "new-hash" }),
  buildAccessUrl: (base: string, token: string) =>
    `${base}/espace/acces#t=${token}`,
}));
vi.mock("@/lib/utils", () => ({ getBaseUrl: () => "https://app.test" }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { planReminders, runEvaluationReminders } from "./reminders";

// Fin de session : 21/10/2026 17h30 à Paris
const SLOTS = [
  {
    date: new Date("2026-10-21T00:00:00Z"),
    startTime: "13:30",
    endTime: "17:30",
  },
];

type Inscription = {
  id: string;
  trainee: {
    email: string | null;
    firstName: string | null;
    isAnonymized: boolean;
  };
  emargements: { status: string }[];
  evaluationResponses: { type: string; status: string }[];
  evaluationReminders: { kind: string }[];
};

function inscription(overrides: Partial<Inscription> = {}): Inscription {
  return {
    id: "ins-1",
    trainee: { email: "lea@test.fr", firstName: "Léa", isAnonymized: false },
    emargements: [{ status: "validé" }],
    evaluationResponses: [],
    evaluationReminders: [],
    ...overrides,
  };
}

function session(inscriptions: Inscription[], status = "terminée") {
  return {
    status,
    title: "PSC",
    location: "Toulouse",
    startDate: new Date("2026-10-21T00:00:00Z"),
    endDate: new Date("2026-10-21T00:00:00Z"),
    organisme: {
      name: "Secours 31",
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassword: null,
      smtpFrom: null,
      smtpSecure: true,
    },
    slots: SLOTS,
    inscriptions,
  };
}

const DAY_1 = new Date("2026-10-22T06:00:00Z");
const DAY_8 = new Date("2026-10-29T08:00:00Z");

describe("planReminders", () => {
  it("invite à J+0 les présents sans réponse", () => {
    const jobs = planReminders(session([inscription()]), DAY_1);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ type: "chaud", kind: "chaud-j0" });
  });

  it("ignore les absents, les anonymisés et les stagiaires sans email", () => {
    const jobs = planReminders(
      session([
        inscription({ id: "a", emargements: [{ status: "absent" }] }),
        inscription({
          id: "b",
          trainee: { email: "x@test.fr", firstName: null, isAnonymized: true },
        }),
        inscription({
          id: "c",
          trainee: { email: null, firstName: null, isAnonymized: false },
        }),
      ]),
      DAY_1
    );
    expect(jobs).toEqual([]);
  });

  it("ne relance pas une évaluation soumise", () => {
    const jobs = planReminders(
      session([
        inscription({
          evaluationResponses: [{ type: "chaud", status: "soumise" }],
        }),
      ]),
      DAY_8
    );
    expect(jobs).toEqual([]);
  });

  it("relance un brouillon non envoyé", () => {
    const jobs = planReminders(
      session([
        inscription({
          evaluationResponses: [{ type: "chaud", status: "brouillon" }],
          evaluationReminders: [{ kind: "chaud-j0" }],
        }),
      ]),
      DAY_8
    );
    expect(jobs.map((j) => j.kind)).toEqual(["chaud-j7"]);
  });

  it("n'envoie pas deux fois le même palier", () => {
    const jobs = planReminders(
      session([inscription({ evaluationReminders: [{ kind: "chaud-j7" }] })]),
      DAY_8
    );
    expect(jobs).toEqual([]);
  });

  it("après un cron manqué, envoie seulement le dernier palier", () => {
    const jobs = planReminders(session([inscription()]), DAY_8);
    expect(jobs.map((j) => j.kind)).toEqual(["chaud-j7"]);
  });

  it("invite à froid à J+90", () => {
    const jobs = planReminders(
      session([
        inscription({
          evaluationResponses: [{ type: "chaud", status: "soumise" }],
        }),
      ]),
      new Date("2027-01-20T08:00:00Z")
    );
    expect(jobs.map((j) => j.kind)).toEqual(["froid-j90"]);
  });

  it("rien pour une session annulée ou sans créneau", () => {
    expect(planReminders(session([inscription()], "annulée"), DAY_1)).toEqual(
      []
    );
    expect(
      planReminders({ ...session([inscription()]), slots: [] }, DAY_1)
    ).toEqual([]);
  });
});

describe("runEvaluationReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(DAY_8);
    mockPrisma.trainingSession.findMany.mockResolvedValue([
      session([inscription({ evaluationReminders: [{ kind: "chaud-j0" }] })]),
    ]);
    mockPrisma.evaluationReminder.create.mockResolvedValue({ id: "r1" });
    mockPrisma.evaluationReminder.delete.mockResolvedValue({});
    mockEmail.sendEvaluationInvitation.mockResolvedValue({
      success: true,
      method: "smtp",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ne cible que les liens actifs et sans désinscription", async () => {
    await runEvaluationReminders();
    const where =
      mockPrisma.trainingSession.findMany.mock.calls[0][0].select.inscriptions
        .where;
    expect(where).toEqual({
      accessTokenHash: { not: null },
      evaluationRemindersOptOut: false,
    });
  });

  it("pose le palier, envoie un rappel avec un lien régénéré", async () => {
    const result = await runEvaluationReminders();

    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(mockPrisma.evaluationReminder.create).toHaveBeenCalledWith({
      data: { inscriptionId: "ins-1", kind: "chaud-j7" },
      select: { id: true },
    });
    expect(mockEmail.sendEvaluationInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lea@test.fr",
        evaluation: "chaud",
        isReminder: true,
        accessUrl: "https://app.test/espace/acces#t=new-token",
        closesAtLabel: "20 novembre",
      })
    );
    // Le nouveau lien remplace l'ancien seulement après l'envoi, et
    // seulement si le lien n'a pas été révoqué entre-temps
    expect(mockPrisma.inscription.updateMany).toHaveBeenCalledWith({
      where: { id: "ins-1", accessTokenHash: { not: null } },
      data: {
        accessTokenHash: "new-hash",
        accessSentAt: expect.any(Date),
        accessLastUsedAt: null,
      },
    });
  });

  it("l'invitation (premier palier) n'est pas un rappel", async () => {
    vi.setSystemTime(DAY_1);
    mockPrisma.trainingSession.findMany.mockResolvedValue([
      session([inscription()]),
    ]);
    await runEvaluationReminders();
    expect(mockEmail.sendEvaluationInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ isReminder: false })
    );
  });

  it("un palier déjà posé par un cron concurrent n'est pas renvoyé", async () => {
    mockPrisma.evaluationReminder.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "7",
      })
    );
    const result = await runEvaluationReminders();
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(mockEmail.sendEvaluationInvitation).not.toHaveBeenCalled();
  });

  it("retire le palier si l'email échoue, pour réessayer demain", async () => {
    mockEmail.sendEvaluationInvitation.mockResolvedValue({
      success: false,
      method: "smtp",
      error: "refusé",
    });
    const result = await runEvaluationReminders();
    expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(mockPrisma.evaluationReminder.delete).toHaveBeenCalledWith({
      where: { id: "r1" },
    });
    // L'ancien lien reste valide : le stagiaire n'est jamais bloqué
    expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
  });
});
