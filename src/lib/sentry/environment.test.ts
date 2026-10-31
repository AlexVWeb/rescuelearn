import { describe, expect, it } from "vitest";
import { resolveSentryEnvironment } from "./environment";

describe("resolveSentryEnvironment", () => {
  it("production Vercel", () => {
    expect(
      resolveSentryEnvironment({
        VERCEL_ENV: "production",
        VERCEL_TARGET_ENV: "production",
      })
    ).toBe("production");
  });

  it("preview Vercel", () => {
    expect(
      resolveSentryEnvironment({
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "preview",
      })
    ).toBe("preview");
  });

  it("environnement personnalisé Vercel", () => {
    expect(
      resolveSentryEnvironment({
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "staging",
      })
    ).toBe("staging");
  });

  it("preview sans VERCEL_TARGET_ENV", () => {
    expect(resolveSentryEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
  });

  it("poste local", () => {
    expect(resolveSentryEnvironment({})).toBe("development");
    expect(resolveSentryEnvironment({ VERCEL_ENV: "" })).toBe("development");
  });
});
