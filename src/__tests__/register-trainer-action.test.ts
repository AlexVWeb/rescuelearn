import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockSignUp = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  auth: { api: { signUpEmail: mockSignUp, getSession: vi.fn() } },
}));

const mockPrisma = vi.hoisted(() => ({
  organisme: { findUnique: vi.fn() },
  user: { updateMany: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockRateLimit = vi.hoisted(() => ({
  assertNotRateLimited: vi.fn(),
  registerFailure: vi.fn(),
}));
vi.mock("@/lib/rate-limit", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/rate-limit")>(
      "@/lib/rate-limit"
    );
  return {
    ...actual,
    getClientIp: vi.fn().mockResolvedValue("1.2.3.4"),
    assertNotRateLimited: mockRateLimit.assertNotRateLimited,
    registerFailure: mockRateLimit.registerFailure,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import * as loginActions from "@/app/(public)/login/actions";
import { RateLimitError } from "@/lib/rate-limit";
import { UserRole } from "@/lib/roles";

const { registerTrainerAction } = loginActions;

const validInput = {
  name: "Jean Formateur",
  email: "jean@test.fr",
  password: "motdepasse123",
  inviteCode: "code-valide",
};

describe("registerTrainerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.assertNotRateLimited.mockResolvedValue(undefined);
    mockPrisma.organisme.findUnique.mockResolvedValue({ id: "org-1" });
    mockSignUp.mockResolvedValue({ token: null, user: { id: "user-1" } });
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it("inscrit puis rattache le nouvel utilisateur à l'organisme par son id", async () => {
    const res = await registerTrainerAction(validInput);

    expect(res).toEqual({ success: true });
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: validInput.email,
          password: validInput.password,
          name: validInput.name,
        }),
      })
    );
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", organismeId: null },
      data: { organismeId: "org-1", roles: [UserRole.FORMATEUR] },
    });
  });

  it("refuse un code invalide sans créer de compte et compte l'échec", async () => {
    mockPrisma.organisme.findUnique.mockResolvedValue(null);

    const res = await registerTrainerAction(validInput);

    expect(res.success).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockRateLimit.registerFailure).toHaveBeenCalledWith(
      expect.objectContaining({ key: "invite-code:1.2.3.4" })
    );
  });

  it("bloque après trop d'échecs sans interroger la base", async () => {
    mockRateLimit.assertNotRateLimited.mockRejectedValue(new RateLimitError());

    const res = await registerTrainerAction(validInput);

    expect(res.success).toBe(false);
    expect(mockPrisma.organisme.findUnique).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("email déjà inscrit : réponse générique, aucun compte existant modifié", async () => {
    // Better-Auth renvoie un utilisateur fictif (id aléatoire) pour un doublon
    mockSignUp.mockResolvedValue({ token: null, user: { id: "fake-id" } });
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });

    const res = await registerTrainerAction(validInput);

    expect(res).toEqual({ success: true });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    const call = mockPrisma.user.updateMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("email");
  });

  it("rejette une saisie invalide", async () => {
    const res = await registerTrainerAction({
      ...validInput,
      email: "pas-un-email",
    });

    expect(res.success).toBe(false);
    expect(mockPrisma.organisme.findUnique).not.toHaveBeenCalled();
  });

  it("n'expose plus linkUserToOrganisme", () => {
    expect(loginActions).not.toHaveProperty("linkUserToOrganisme");
  });
});
