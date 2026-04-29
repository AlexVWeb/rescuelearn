import { describe, it, expect, vi, beforeEach } from "vitest";
import { decryptData, TRAINEE_ENCRYPTED_FIELDS } from "./prisma";
import { encrypt } from "./encryption";

describe("Prisma Extension - Recursive Decryption", () => {
  const mockKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", mockKey);
  });

  it("should decrypt nested externalTrainings inside a trainee object", () => {
    const encryptedName = encrypt("Secourisme");
    const encryptedLastName = encrypt("Dupont");

    const mockTraineeWithRelations = {
      id: "t1",
      lastName: encryptedLastName,
      externalTrainings: [
        {
          id: "et1",
          name: encryptedName,
        },
      ],
    };

    const decrypted = decryptData(
      mockTraineeWithRelations,
      TRAINEE_ENCRYPTED_FIELDS
    );

    expect(decrypted.lastName).toBe("Dupont");
    expect(decrypted.externalTrainings[0].name).toBe("Secourisme");
  });

  it("should decrypt nested trainee inside an inscription object", () => {
    const encryptedFirstName = encrypt("Jean");

    const mockInscription = {
      id: "i1",
      trainee: {
        id: "t1",
        firstName: encryptedFirstName,
      },
    };

    // Even if we pass an empty field list for the inscription itself,
    // it should find the 'trainee' relation and decrypt it
    const decrypted = decryptData(mockInscription, []);

    expect(decrypted.trainee.firstName).toBe("Jean");
  });
});
