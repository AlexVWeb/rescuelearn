import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

const mockAuthSignUp = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: (...args: unknown[]) => mockAuthSignUp(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { registerPlayerAction } from "@/app/actions/player-actions";
import { UserRole } from "@/lib/roles";

describe("registerPlayerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if validation fails (e.g. invalid email or short password)", async () => {
    const res = await registerPlayerAction({
      name: "",
      email: "invalid-email",
      password: "123",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("fails if the email is already registered", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: "user-123" });

    const res = await registerPlayerAction({
      name: "John Doe",
      email: "existing@example.com",
      password: "validpassword123",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Cet email est déjà utilisé.");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "existing@example.com" },
    });
  });

  it("registers player successfully and assigns PLAYER role", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
    mockAuthSignUp.mockResolvedValue({
      user: { id: "new-user-id" },
    });

    const res = await registerPlayerAction({
      name: "John Doe",
      email: "newplayer@example.com",
      password: "validpassword123",
    });

    expect(res.success).toBe(true);
    expect(mockAuthSignUp).toHaveBeenCalledWith({
      body: {
        email: "newplayer@example.com",
        password: "validpassword123",
        name: "John Doe",
      },
      headers: expect.anything(),
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "new-user-id" },
      data: {
        roles: [UserRole.PLAYER],
      },
    });
  });

  it("fails if signUpEmail does not return a user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
    mockAuthSignUp.mockResolvedValue(null);

    const res = await registerPlayerAction({
      name: "John Doe",
      email: "newplayer2@example.com",
      password: "validpassword123",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Erreur lors de la création de l'utilisateur.");
  });

  it("fails and catches error if prisma update throws", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);
    mockAuthSignUp.mockResolvedValue({
      user: { id: "new-user-id" },
    });
    vi.mocked(mockPrisma.user.update).mockRejectedValue(
      new Error("Prisma error")
    );

    const res = await registerPlayerAction({
      name: "John Doe",
      email: "newplayer3@example.com",
      password: "validpassword123",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Une erreur interne est survenue.");
  });
});

import {
  savePlayerOnboardingAction,
  getPlayerOnboardingStatusAction,
  resetPlayerOnboardingAction,
} from "@/app/actions/player-actions";

describe("onboarding server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("savePlayerOnboardingAction", () => {
    it("fails if unauthorized", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await savePlayerOnboardingAction({
        experience: "beginner",
        objective: "safety",
        expectation: "quizzes",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("fails if payload validation fails", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-123" } });
      const res = await savePlayerOnboardingAction({
        experience: "",
        objective: "",
        expectation: "",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("updates user onboarding fields in DB", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-123", email: "player@example.com" },
      });
      vi.mocked(mockPrisma.user.update).mockResolvedValue({ id: "user-123" });

      const res = await savePlayerOnboardingAction({
        experience: "beginner",
        objective: "safety",
        expectation: "quizzes",
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          onboardingCompleted: true,
          onboardingExperience: "beginner",
          onboardingObjective: "safety",
          onboardingExpectation: "quizzes",
        },
      });
    });
  });

  describe("getPlayerOnboardingStatusAction", () => {
    it("fails if unauthorized", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await getPlayerOnboardingStatusAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("returns onboarding status from DB", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-123" } });
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        onboardingCompleted: true,
        onboardingExperience: "intermediate",
        onboardingObjective: "exam",
        onboardingExpectation: "memos",
      });

      const res = await getPlayerOnboardingStatusAction();
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        completed: true,
        experience: "intermediate",
        objective: "exam",
        expectation: "memos",
      });
    });
  });

  describe("resetPlayerOnboardingAction", () => {
    it("fails if unauthorized", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await resetPlayerOnboardingAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Non autorisé.");
    });

    it("resets fields to false and null in DB", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-123", email: "player@example.com" },
      });
      vi.mocked(mockPrisma.user.update).mockResolvedValue({ id: "user-123" });

      const res = await resetPlayerOnboardingAction();
      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          onboardingCompleted: false,
          onboardingExperience: null,
          onboardingObjective: null,
          onboardingExpectation: null,
        },
      });
    });
  });
});
