import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

const mockEmail = vi.hoisted(() => ({ sendTraineeAccess: vi.fn() }));
vi.mock("@/lib/email", () => ({ EmailService: mockEmail }));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  trainingSession: { findFirst: vi.fn(), update: vi.fn() },
  inscription: { update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

import { auth } from "@/lib/auth";
import {
  publishAttestations,
  unpublishAttestations,
} from "@/app/admin/training/actions";

function trainee(id: string, result: string | null, email: string | null) {
  return {
    id,
    attestationResult: result,
    attestationValidatedAt: result ? new Date("2026-11-16") : null,
    trainee: { email, firstName: "Léa", isAnonymized: false },
  };
}

const SESSION = {
  id: "ts-1",
  title: "PSE1 · Formation initiale",
  location: "Toulouse",
  startDate: new Date("2026-11-12T00:00:00Z"),
  endDate: new Date("2026-11-16T00:00:00Z"),
  organisme: {
    name: "Secours Formation 31",
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPassword: null,
    smtpFrom: null,
    smtpSecure: true,
  },
  inscriptions: [
    trainee("ins-1", "acquis", "lea@example.test"),
    trainee("ins-2", "non_acquis", "hugo@example.test"),
    trainee("ins-3", null, "ines@example.test"),
    trainee("ins-4", "acquis", null),
  ],
};

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
  mockPrisma.trainingSession.findFirst.mockResolvedValue(SESSION);
  mockEmail.sendTraineeAccess.mockResolvedValue({ success: true });
});

describe("publishAttestations", () => {
  it("publie la session sans envoyer de mail si notify est faux", async () => {
    const result = await publishAttestations("ts-1", { notify: false });

    expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith({
      where: { id: "ts-1" },
      data: { attestationsPublishedAt: expect.any(Date) },
    });
    expect(result).toEqual({ sent: 0, missingEmail: 0, failed: 0 });
    expect(mockEmail.sendTraineeAccess).not.toHaveBeenCalled();
  });

  it("ne prévient que les stagiaires dont l'attestation est disponible", async () => {
    const result = await publishAttestations("ts-1", { notify: true });

    // ins-1 reçoit le mail ; ins-4 (acquis, sans email) est compté ;
    // non acquis et sans résultat ne sont pas prévenus
    expect(result).toEqual({ sent: 1, missingEmail: 1, failed: 0 });
    expect(mockEmail.sendTraineeAccess).toHaveBeenCalledTimes(1);
    expect(mockEmail.sendTraineeAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lea@example.test",
        reason: "attestation",
      })
    );
  });

  it("refuse la session d'un autre organisme", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
    await expect(
      publishAttestations("ts-x", { notify: false })
    ).rejects.toThrow("Session introuvable");
    expect(mockPrisma.trainingSession.update).not.toHaveBeenCalled();
  });
});

describe("unpublishAttestations", () => {
  it("retire la publication", async () => {
    await unpublishAttestations("ts-1");
    expect(mockPrisma.trainingSession.update).toHaveBeenCalledWith({
      where: { id: "ts-1" },
      data: { attestationsPublishedAt: null },
    });
  });
});
