import { describe, it, expect } from "vitest";
import { resolveModules } from "./resolve";

describe("resolveModules", () => {
  it("applique les défauts du registre sans ligne en base", () => {
    const [evaluation] = resolveModules([]);
    expect(evaluation).toMatchObject({
      key: "evaluation",
      available: true,
      enabled: false,
      active: false,
    });
  });

  it("une ligne surcharge les défauts", () => {
    const [evaluation] = resolveModules([
      { module: "evaluation", available: true, enabled: true },
    ]);
    expect(evaluation.active).toBe(true);
  });

  it("activé mais indisponible n'est pas actif", () => {
    const [evaluation] = resolveModules([
      { module: "evaluation", available: false, enabled: true },
    ]);
    expect(evaluation).toMatchObject({ enabled: true, active: false });
  });

  it("ignore les lignes de modules inconnus", () => {
    const modules = resolveModules([
      { module: "obsolete", available: true, enabled: true },
    ]);
    expect(modules.map((m) => m.key)).toEqual(["evaluation"]);
  });
});
