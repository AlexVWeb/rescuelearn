import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  decryptData,
  encryptData,
  TRAINEE_ENCRYPTED_FIELDS,
  withOrganisme,
} from "./prisma";
import { encrypt, decrypt } from "./encryption";

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

  it("should decrypt nested trainee inside inscription inside emargement object", () => {
    const encryptedLastName = encrypt("Martin");

    const mockEmargement = {
      id: "em1",
      inscription: {
        id: "i1",
        trainee: {
          id: "t1",
          lastName: encryptedLastName,
        },
      },
    };

    const decrypted = decryptData(mockEmargement, []);

    expect(decrypted.inscription.trainee.lastName).toBe("Martin");
  });

  describe("Tenant Isolation (withOrganisme)", () => {
    it("should be defined", () => {
      const tenantPrisma = withOrganisme("org-123");
      expect(tenantPrisma).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null or undefined data", () => {
      expect(decryptData(null, [])).toBeNull();
      expect(decryptData(undefined, [])).toBeUndefined();
    });

    it("should handle arrays of data", () => {
      const encrypted = encrypt("Secret");
      const data = [{ firstName: encrypted }, { firstName: encrypted }];
      const decrypted = decryptData(data, ["firstName"]);
      expect(decrypted[0].firstName).toBe("Secret");
      expect(decrypted[1].firstName).toBe("Secret");
    });

    it("should ignore non-string fields or invalid formats", () => {
      const data = { age: 25, status: "active" };
      const decrypted = decryptData(data, ["age", "status"]);
      expect(decrypted.age).toBe(25);
      expect(decrypted.status).toBe("active");
    });

    it("should handle decryption failure gracefully", () => {
      const data = { firstName: "iv:tag:badhex" };
      const decrypted = decryptData(data, ["firstName"]);
      expect(decrypted.firstName).toBe("iv:tag:badhex");
    });

    it("should unwrap values encrypted several times", () => {
      const data = { phone: encrypt(encrypt("0659211160")) };
      const decrypted = decryptData(data, ["phone"]);
      expect(decrypted.phone).toBe("0659211160");
    });

    it("should keep ISO dates intact", () => {
      const iso = "1995-03-15T00:00:00.000Z";
      const decrypted = decryptData({ dateOfBirth: encrypt(iso) }, [
        "dateOfBirth",
      ]);
      expect(decrypted.dateOfBirth).toBe(iso);
    });
  });

  describe("encryptData", () => {
    it("should store a single layer when given an already encrypted value", () => {
      const res = encryptData({ phone: encrypt(encrypt("0659211160")) }, [
        "phone",
      ]);
      expect(decrypt(res?.phone as string)).toBe("0659211160");
    });

    it("should store empty strings as null", () => {
      const res = encryptData({ phone: "", address: "" }, ["phone", "address"]);
      expect(res?.phone).toBeNull();
      expect(res?.address).toBeNull();
    });

    it("should decrypt a stored encrypted empty string", () => {
      const decrypted = decryptData({ phone: encrypt("") }, ["phone"]);
      expect(decrypted.phone).toBe("");
    });

    it("should encrypt plain values", () => {
      const res = encryptData({ phone: "0659211160" }, ["phone"]);
      expect(res?.phone).not.toBe("0659211160");
      expect(decryptData(res, ["phone"])?.phone).toBe("0659211160");
    });
  });
});
