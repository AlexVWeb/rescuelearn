import { describe, it, expect, vi } from "vitest";
import { parseUserInput } from "better-auth/db";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ EmailService: {} }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/features", () => ({
  isFeatureEnabled: vi.fn(),
  FeatureKey: { PLAYER_SYSTEM: "PLAYER_SYSTEM" },
}));

const { auth } = await import("@/lib/auth");

describe("auth config — champ roles", () => {
  it("refuse roles dans /update-user (escalade de privilèges)", () => {
    expect(() =>
      parseUserInput(
        auth.options,
        { name: "x", roles: '["SUPER_ADMIN"]' },
        "update"
      )
    ).toThrow(/roles is not allowed/);
  });

  it("ignore roles fourni à l'inscription et applique la valeur par défaut", () => {
    const data = parseUserInput(
      auth.options,
      { name: "x", email: "x@test.fr", roles: '["SUPER_ADMIN"]' },
      "create"
    );
    expect(data.roles).toBe("[]");
  });
});

describe("auth config — rate limit", () => {
  const rules: Record<string, unknown> =
    auth.options.rateLimit?.customRules ?? {};

  it.each([
    "/sign-in/email",
    "/sign-up/email",
    "/request-password-reset",
    "/reset-password",
    "/send-verification-email",
    "/change-email",
  ])("limite %s", (path) => {
    expect(rules[path]).toBeDefined();
  });
});
