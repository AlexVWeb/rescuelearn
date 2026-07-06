import { describe, it, expect } from "vitest";
import { acceptInvitationSchema } from "./invitation.schema";

describe("acceptInvitationSchema", () => {
  const baseData = {
    token: "valid-token",
    firstName: "Jean",
    lastName: "Dupont",
  };

  describe("Password Classic Mode", () => {
    it("should fail if less than 12 characters", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "Pass123456!",
        confirmPassword: "Pass123456!",
      });
      expect(result.success).toBe(false);
    });

    it("should fail if missing uppercase", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "password12345!",
        confirmPassword: "password12345!",
      });
      expect(result.success).toBe(false);
    });

    it("should fail if missing digit", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "Password!!!!",
        confirmPassword: "Password!!!!",
      });
      expect(result.success).toBe(false);
    });

    it("should fail if missing special char", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "Password1234",
        confirmPassword: "Password1234",
      });
      expect(result.success).toBe(false);
    });

    it("should pass with 12 chars, upper, lower, digit and special", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Passphrase Mode (Underscore)", () => {
    it("should fail if less than 16 characters even with underscore", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "short_pass",
        confirmPassword: "short_pass",
      });
      expect(result.success).toBe(false);
    });

    it("should pass if 16+ characters with underscore", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "this_is_a_long_passphrase",
        confirmPassword: "this_is_a_long_passphrase",
      });
      expect(result.success).toBe(true);
    });

    it("should fail if 16+ characters but no underscore and not meeting classic criteria", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "thisisalongpassphrasewithoutunderscore",
        confirmPassword: "thisisalongpassphrasewithoutunderscore",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Password Confirmation", () => {
    it("should fail if passwords do not match", () => {
      const result = acceptInvitationSchema.safeParse({
        ...baseData,
        password: "Password123!",
        confirmPassword: "Password123?",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("confirmPassword");
      }
    });
  });
});
