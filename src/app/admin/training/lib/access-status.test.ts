import { describe, it, expect } from "vitest";
import { getAccessStatus } from "./access-status";

const withEmail = { trainee: { email: "lea@example.test" } };

describe("getAccessStatus", () => {
  it("ouvert si le stagiaire a utilisé son lien", () => {
    expect(
      getAccessStatus({
        ...withEmail,
        hasAccessLink: true,
        accessSentAt: new Date(),
        accessLastUsedAt: new Date(),
      })
    ).toBe("opened");
  });

  it("envoyé si le mail est parti mais le lien jamais ouvert", () => {
    expect(
      getAccessStatus({
        ...withEmail,
        hasAccessLink: true,
        accessSentAt: new Date(),
      })
    ).toBe("sent");
  });

  it("lien créé (copié ou QR code) sans envoi par mail", () => {
    expect(getAccessStatus({ ...withEmail, hasAccessLink: true })).toBe(
      "link_created"
    );
  });

  it("pas d'email si aucun lien n'a pu être utilisé", () => {
    expect(getAccessStatus({ trainee: { email: null } })).toBe("no_email");
  });

  it("un stagiaire sans email mais avec QR code ouvert reste « ouvert »", () => {
    expect(
      getAccessStatus({
        trainee: { email: null },
        hasAccessLink: true,
        accessLastUsedAt: new Date(),
      })
    ).toBe("opened");
  });

  it("non envoyé après révocation, même si un mail était parti", () => {
    expect(
      getAccessStatus({
        ...withEmail,
        hasAccessLink: false,
        accessSentAt: new Date(),
        accessLastUsedAt: new Date(),
      })
    ).toBe("not_sent");
  });
});
