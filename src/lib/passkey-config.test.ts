import { describe, it, expect } from "vitest";
import { getPasskeyRelyingParty } from "./passkey-config";

describe("getPasskeyRelyingParty", () => {
  it("utilise le domaine apex et accepte apex + www", () => {
    expect(getPasskeyRelyingParty("https://rescuelearn.fr")).toEqual({
      rpID: "rescuelearn.fr",
      origins: ["https://rescuelearn.fr", "https://www.rescuelearn.fr"],
    });
  });

  it("retire le www. quand l'URL de l'app est sur www", () => {
    expect(getPasskeyRelyingParty("https://www.rescuelearn.fr/")).toEqual({
      rpID: "rescuelearn.fr",
      origins: ["https://rescuelearn.fr", "https://www.rescuelearn.fr"],
    });
  });

  it("garde l'origine telle quelle en local", () => {
    expect(getPasskeyRelyingParty("http://localhost:3000")).toEqual({
      rpID: "localhost",
      origins: ["http://localhost:3000"],
    });
  });
});
