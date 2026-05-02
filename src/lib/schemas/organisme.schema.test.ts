import { describe, it, expect } from "vitest";
import { organismeSchema } from "./organisme.schema";

describe("organismeSchema", () => {
  const validBaseData = {
    name: "Organisme de Test",
    siret: "12345678901234",
    email: "test@test.com",
    retentionYearsActive: 5,
    retentionYearsArchive: 10,
  };

  it("validates a standard OF with all fields", () => {
    const data = {
      ...validBaseData,
      legalRepFirstName: "Jean",
      legalRepLastName: "Dupont",
      legalRepJobTitle: "Gérant",
      legalStatus: "SARL",
      tvaNumber: "FR12345678901",
      isQualiopi: true,
      qualiopiCertifiedBy: "Organisme de Test",
    };
    const result = organismeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates an ASC with federation Qualiopi", () => {
    const data = {
      ...validBaseData,
      legalStatus: "Association loi 1901",
      federationName: "Fédération Nationale de Protection Civile",
      isQualiopi: true,
      qualiopiCertifiedBy: "FNPC (Fédération)",
    };
    const result = organismeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("fails if SIRET is not 14 digits", () => {
    const data = { ...validBaseData, siret: "123" };
    const result = organismeSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("fails if email is invalid", () => {
    const data = { ...validBaseData, email: "invalid-email" };
    const result = organismeSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows empty strings for optional fields", () => {
    const data = {
      ...validBaseData,
      legalRepFirstName: "",
      legalStatus: "",
      tvaNumber: "",
    };
    const result = organismeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
