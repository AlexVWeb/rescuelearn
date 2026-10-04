import { describe, it, expect } from "vitest";
import { getLoginTypeError } from "@/lib/login-type";

describe("getLoginTypeError", () => {
  it("allows a player on the player tab", () => {
    expect(getLoginTypeError("player", '["PLAYER"]', true)).toBeNull();
  });

  it("refuses a player on the player tab when the player system is disabled", () => {
    expect(getLoginTypeError("player", '["PLAYER"]', false)).toBe(
      "L'espace élève est temporairement désactivé."
    );
  });

  it("refuses a trainer on the player tab", () => {
    expect(getLoginTypeError("player", '["FORMATEUR"]', true)).toMatch(
      /n'est pas un compte élève/
    );
  });

  it("allows trainers and admins on the trainer tab", () => {
    expect(getLoginTypeError("trainer", '["FORMATEUR"]', true)).toBeNull();
    expect(
      getLoginTypeError("trainer", '["ADMIN_ORGANISME"]', true)
    ).toBeNull();
    expect(getLoginTypeError("trainer", ["SUPER_ADMIN"], false)).toBeNull();
  });

  it("refuses a player on the trainer tab", () => {
    expect(getLoginTypeError("trainer", '["PLAYER"]', true)).toMatch(
      /est un compte élève/
    );
  });

  it("allows a user with both roles on either tab", () => {
    const roles = '["PLAYER","FORMATEUR"]';
    expect(getLoginTypeError("player", roles, true)).toBeNull();
    expect(getLoginTypeError("trainer", roles, true)).toBeNull();
  });

  it("refuses a missing or unknown login type", () => {
    expect(getLoginTypeError(null, '["FORMATEUR"]', true)).toBe(
      "Type de connexion invalide."
    );
    expect(getLoginTypeError("admin", '["FORMATEUR"]', true)).toBe(
      "Type de connexion invalide."
    );
  });
});
