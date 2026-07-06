import { describe, it, expect } from "vitest";
import { UserRole, userRoleSchema, hasRole } from "@/lib/roles";

describe("UserRole", () => {
  it("contains the three expected roles", () => {
    expect(UserRole.SUPER_ADMIN).toBe("SUPER_ADMIN");
    expect(UserRole.ADMIN_ORGANISME).toBe("ADMIN_ORGANISME");
    expect(UserRole.FORMATEUR).toBe("FORMATEUR");
  });
});

describe("userRoleSchema", () => {
  it("accepts a valid role", () => {
    expect(userRoleSchema.parse("SUPER_ADMIN")).toBe("SUPER_ADMIN");
  });

  it("rejects an unknown role", () => {
    expect(() => userRoleSchema.parse("UNKNOWN")).toThrow();
  });
});

describe("hasRole", () => {
  it("returns true when user has the role", () => {
    expect(
      hasRole(["ADMIN_ORGANISME", "FORMATEUR"], UserRole.ADMIN_ORGANISME)
    ).toBe(true);
  });

  it("returns false when user does not have the role", () => {
    expect(hasRole(["FORMATEUR"], UserRole.SUPER_ADMIN)).toBe(false);
  });

  it("returns false for null or undefined roles", () => {
    expect(hasRole(null, UserRole.FORMATEUR)).toBe(false);
    expect(hasRole(undefined, UserRole.FORMATEUR)).toBe(false);
  });

  it("returns true for a single string matching the role", () => {
    expect(hasRole("FORMATEUR", UserRole.FORMATEUR)).toBe(true);
  });

  it("returns true for a stringified JSON array containing the role", () => {
    expect(hasRole('["FORMATEUR", "SUPER_ADMIN"]', UserRole.FORMATEUR)).toBe(
      true
    );
  });
});
