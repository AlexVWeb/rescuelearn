import { describe, it, expect, vi } from "vitest";
import { getStorageKey } from "./r2";

describe("R2 Library - getStorageKey", () => {
  it("generates a key with dev prefix by default", () => {
    const key = getStorageKey("org123", "logo", "logo.png");
    expect(key).toBe("dev/organisme/org123/logo/logo.png");
  });

  it("generates a key with prod prefix when APP_MODE is set to prod", () => {
    vi.stubEnv("APP_MODE", "prod");
    const key = getStorageKey("org123", "logo", "logo.png");
    expect(key).toBe("prod/organisme/org123/logo/logo.png");
    vi.unstubAllEnvs();
  });

  it("handles external-trainings category correctly", () => {
    const key = getStorageKey("org123", "external-trainings", "diploma.pdf");
    expect(key).toBe("dev/organisme/org123/external-trainings/diploma.pdf");
  });
});
