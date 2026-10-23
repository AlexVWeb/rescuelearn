import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { signTraineeToken, verifyTraineeToken } from "./trainee-session";

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET =
    "secret-de-test-suffisamment-long-0123456789";
});

describe("signTraineeToken / verifyTraineeToken", () => {
  it("fait l'aller-retour inscription + empreinte", async () => {
    const jwt = await signTraineeToken({
      inscriptionId: "ins-1",
      fp: "0123456789abcdef",
    });
    expect(await verifyTraineeToken(jwt)).toEqual({
      inscriptionId: "ins-1",
      fp: "0123456789abcdef",
    });
  });

  it("refuse un JWT altéré", async () => {
    const jwt = await signTraineeToken({
      inscriptionId: "ins-1",
      fp: "0123456789abcdef",
    });
    const [header, , signature] = jwt.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "ins-2", fp: "0123456789abcdef" })
    ).toString("base64url");
    expect(
      await verifyTraineeToken(`${header}.${forgedPayload}.${signature}`)
    ).toBeNull();
  });

  it("refuse un JWT signé avec une autre clé", async () => {
    const jwt = await new SignJWT({ fp: "0123456789abcdef" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("ins-1")
      .sign(new TextEncoder().encode("une-autre-cle-de-32-octets-minimum!!"));
    expect(await verifyTraineeToken(jwt)).toBeNull();
  });

  it("refuse une valeur qui n'est pas un JWT", async () => {
    expect(await verifyTraineeToken("pas-un-jwt")).toBeNull();
  });
});
