import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockCookies = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? "203.0.113.7" : null),
  }),
  cookies: vi.fn().mockResolvedValue(mockCookies),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

const mockEmail = vi.hoisted(() => ({ sendTraineeAccess: vi.fn() }));
vi.mock("@/lib/email", () => ({ EmailService: mockEmail }));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  trainingSession: { findFirst: vi.fn() },
  inscription: { findUnique: vi.fn(), update: vi.fn() },
  rateLimit: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

import { auth } from "@/lib/auth";
import { redeemAccessToken } from "@/app/espace/actions";
import {
  generateAccessLink,
  revokeAccessLink,
  sendAccessLink,
  sendAccessLinks,
} from "@/app/admin/training/actions";
import { hashAccessToken } from "@/lib/trainee-access";
import { TRAINEE_COOKIE } from "@/lib/trainee-session";

// --- Helpers ---

const VALID_TOKEN = "A".repeat(43);

function mockAuthenticatedUser(organismeId = "org-1") {
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue({ user: { id: "user-1" } });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId,
    roles: ["FORMATEUR"],
  });
}

function inscription(
  overrides: {
    isAnonymized?: boolean;
    accessTokenHash?: string | null;
    endDate?: Date;
    organismeId?: string;
  } = {}
) {
  return {
    id: "ins-1",
    accessTokenHash:
      "accessTokenHash" in overrides
        ? overrides.accessTokenHash
        : hashAccessToken(VALID_TOKEN),
    trainee: { id: "t-1", isAnonymized: overrides.isAnonymized ?? false },
    trainingSession: {
      organismeId: overrides.organismeId ?? "org-1",
      startDate: new Date("2026-11-12"),
      endDate: overrides.endDate ?? new Date("2099-01-01"),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BETTER_AUTH_SECRET =
    "secret-de-test-suffisamment-long-0123456789";
  mockPrisma.rateLimit.findUnique.mockResolvedValue(null);
});

// --- redeemAccessToken ---

describe("redeemAccessToken", () => {
  it("pose le cookie et trace l'utilisation pour un lien valide", async () => {
    mockPrisma.inscription.findUnique.mockResolvedValue(inscription());

    const result = await redeemAccessToken(VALID_TOKEN);

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.inscription.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accessTokenHash: hashAccessToken(VALID_TOKEN) },
      })
    );
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { accessLastUsedAt: expect.any(Date) },
    });
    expect(mockCookies.set).toHaveBeenCalledWith(
      TRAINEE_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: "/espace" })
    );
  });

  it("refuse un token inconnu et compte l'échec", async () => {
    mockPrisma.inscription.findUnique.mockResolvedValue(null);

    const result = await redeemAccessToken(VALID_TOKEN);

    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(mockPrisma.rateLimit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: "espace:token:203.0.113.7" } })
    );
    expect(mockCookies.set).not.toHaveBeenCalled();
  });

  it("refuse un token mal formé sans interroger la base", async () => {
    const result = await redeemAccessToken("trop-court");
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(mockPrisma.inscription.findUnique).not.toHaveBeenCalled();
  });

  it("refuse un stagiaire anonymisé", async () => {
    mockPrisma.inscription.findUnique.mockResolvedValue(
      inscription({ isAnonymized: true })
    );
    expect(await redeemAccessToken(VALID_TOKEN)).toEqual({
      ok: false,
      reason: "anonymized",
    });
    expect(mockCookies.set).not.toHaveBeenCalled();
  });

  it("refuse un lien expiré", async () => {
    mockPrisma.inscription.findUnique.mockResolvedValue(
      inscription({ endDate: new Date("2020-01-01") })
    );
    expect(await redeemAccessToken(VALID_TOKEN)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("bloque après trop d'échecs depuis la même IP", async () => {
    mockPrisma.rateLimit.findUnique.mockResolvedValue({
      key: "espace:token:203.0.113.7",
      count: 20,
      lastRequest: BigInt(Date.now()),
    });
    expect(await redeemAccessToken(VALID_TOKEN)).toEqual({
      ok: false,
      reason: "rate_limited",
    });
    expect(mockPrisma.inscription.findUnique).not.toHaveBeenCalled();
  });
});

// --- generateAccessLink / revokeAccessLink ---

describe("generateAccessLink", () => {
  it("throw si l'utilisateur n'est pas authentifié", async () => {
    (
      auth.api.getSession as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);
    await expect(generateAccessLink("ins-1")).rejects.toThrow();
  });

  it("throw si l'inscription appartient à un autre organisme", async () => {
    mockAuthenticatedUser();
    mockPrisma.inscription.findUnique.mockResolvedValue(
      inscription({ organismeId: "org-2" })
    );
    await expect(generateAccessLink("ins-1")).rejects.toThrow(
      "Inscription introuvable ou non autorisée"
    );
  });

  it("throw si le stagiaire est anonymisé", async () => {
    mockAuthenticatedUser();
    mockPrisma.inscription.findUnique.mockResolvedValue(
      inscription({ isAnonymized: true })
    );
    await expect(generateAccessLink("ins-1")).rejects.toThrow("anonymisé");
  });

  it("ne stocke que le hash du token placé dans le fragment de l'URL", async () => {
    mockAuthenticatedUser();
    mockPrisma.inscription.findUnique.mockResolvedValue(inscription());

    const { url } = await generateAccessLink("ins-1");

    const token = url.split("#t=")[1];
    expect(url).toContain("/espace/acces#t=");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: {
        accessTokenHash: hashAccessToken(token),
        accessSentAt: null,
        accessLastUsedAt: null,
      },
    });
  });
});

describe("revokeAccessLink", () => {
  it("efface le hash du lien", async () => {
    mockAuthenticatedUser();
    mockPrisma.inscription.findUnique.mockResolvedValue(inscription());

    await revokeAccessLink("ins-1");

    expect(mockPrisma.inscription.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { accessTokenHash: null },
    });
  });
});

// --- sendAccessLink / sendAccessLinks ---

const ORGANISME = {
  name: "Secours Formation 31",
  smtpHost: "smtp.sf31.test",
  smtpPort: 465,
  smtpUser: "u",
  smtpPassword: "p",
  smtpFrom: "formation@sf31.test",
  smtpSecure: true,
};

function sessionInscription(
  id: string,
  trainee: { email: string | null; firstName?: string },
  access: { accessSentAt?: Date | null; accessTokenHash?: string | null } = {}
) {
  return {
    id,
    accessSentAt: access.accessSentAt ?? null,
    accessTokenHash: access.accessTokenHash ?? null,
    trainee: {
      id: `t-${id}`,
      email: trainee.email,
      firstName: trainee.firstName ?? "Léa",
      isAnonymized: false,
    },
  };
}

function trainingSessionWith(inscriptions: unknown[]) {
  return {
    id: "ts-1",
    title: "PSE1 · Formation initiale",
    location: "Toulouse, salle B",
    startDate: new Date("2026-11-12T00:00:00Z"),
    endDate: new Date("2026-11-16T00:00:00Z"),
    organisme: ORGANISME,
    inscriptions,
  };
}

describe("sendAccessLinks", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockEmail.sendTraineeAccess.mockResolvedValue({ success: true });
  });

  it("n'envoie qu'aux stagiaires sans lien valide en mode « pending »", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      trainingSessionWith([
        sessionInscription("ins-1", { email: "lea@example.test" }),
        sessionInscription(
          "ins-2",
          { email: "hugo@example.test" },
          { accessSentAt: new Date(), accessTokenHash: "h" }
        ),
        // Lien révoqué après envoi : à renvoyer
        sessionInscription(
          "ins-3",
          { email: "ines@example.test" },
          { accessSentAt: new Date(), accessTokenHash: null }
        ),
      ])
    );

    const result = await sendAccessLinks("ts-1", "pending");

    expect(result).toEqual({ sent: 2, missingEmail: 0, failed: 0 });
    expect(mockEmail.sendTraineeAccess).toHaveBeenCalledTimes(2);
    expect(mockEmail.sendTraineeAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lea@example.test",
        organismeName: "Secours Formation 31",
        sessionDates: "12–16 novembre 2026",
        accessUrl: expect.stringContaining("/espace/acces#t="),
        smtp: expect.objectContaining({ host: "smtp.sf31.test" }),
      })
    );
  });

  it("renvoie à tout le monde en mode « all »", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      trainingSessionWith([
        sessionInscription(
          "ins-1",
          { email: "lea@example.test" },
          { accessSentAt: new Date(), accessTokenHash: "h" }
        ),
      ])
    );
    expect(await sendAccessLinks("ts-1", "all")).toEqual({
      sent: 1,
      missingEmail: 0,
      failed: 0,
    });
  });

  it("compte les stagiaires sans email sans créer de lien", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      trainingSessionWith([sessionInscription("ins-1", { email: null })])
    );

    const result = await sendAccessLinks("ts-1", "pending");

    expect(result).toEqual({ sent: 0, missingEmail: 1, failed: 0 });
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
  });

  it("compte un échec d'envoi sans bloquer les autres, ni marquer l'envoi", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      trainingSessionWith([
        sessionInscription("ins-1", { email: "lea@example.test" }),
        sessionInscription("ins-2", { email: "hugo@example.test" }),
      ])
    );
    mockEmail.sendTraineeAccess
      .mockRejectedValueOnce(new Error("SMTP indisponible"))
      .mockResolvedValueOnce({ success: true });

    const result = await sendAccessLinks("ts-1", "pending");

    expect(result).toEqual({ sent: 1, missingEmail: 0, failed: 1 });
    const sentAtUpdates = mockPrisma.inscription.update.mock.calls.filter(
      ([args]) => args.data.accessSentAt instanceof Date
    );
    expect(sentAtUpdates).toHaveLength(1);
  });

  it("throw si la session appartient à un autre organisme", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
    await expect(sendAccessLinks("ts-x", "all")).rejects.toThrow(
      "Session introuvable"
    );
    expect(mockPrisma.trainingSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ts-x", organismeId: "org-1" },
      })
    );
  });
});

describe("sendAccessLink", () => {
  it("refuse un stagiaire sans email", async () => {
    mockAuthenticatedUser();
    mockPrisma.inscription.findUnique.mockResolvedValue({
      ...inscription(),
      trainee: { id: "t-1", email: null, isAnonymized: false },
    });
    await expect(sendAccessLink("ins-1")).rejects.toThrow(
      "pas d'adresse email"
    );
  });
});
