import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encrypt,
  decrypt,
  hash,
  encryptBuffer,
  decryptBuffer,
} from "./encryption";

describe("Encryption Library", () => {
  const secret = "Hello World";
  const mockKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", mockKey);
  });

  it("should encrypt and decrypt a string correctly", () => {
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain(":"); // Format iv:authTag:content

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("should generate consistent hashes for the same input", () => {
    const email = "test@example.com";
    const h1 = hash(email);
    const h2 = hash(email);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  it("should generate different hashes for different inputs", () => {
    expect(hash("a@test.com")).not.toBe(hash("b@test.com"));
  });

  it("should throw error if trying to decrypt invalid format", () => {
    expect(() => decrypt("invalid-format")).toThrow();
  });

  it("should handle special characters and long strings", () => {
    const longString = "A".repeat(1000) + "👋 Special Characters!";
    const encrypted = encrypt(longString);
    expect(decrypt(encrypted)).toBe(longString);
  });

  it("should encrypt and decrypt a buffer correctly", () => {
    const data = Buffer.from("Buffer secret data");
    const encrypted = encryptBuffer(data);
    expect(encrypted.length).toBeGreaterThan(data.length);

    const decrypted = decryptBuffer(encrypted);
    expect(decrypted.toString()).toBe("Buffer secret data");
  });

  it("should throw error if buffer is too short", () => {
    expect(() => decryptBuffer(Buffer.from("short"))).toThrow(
      "Buffer too short to be valid encrypted data"
    );
  });

  it("should throw error if ENCRYPTION_KEY is missing", () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY is not defined in environment variables"
    );
  });

  it("should throw error if ENCRYPTION_KEY has wrong length", () => {
    vi.stubEnv("ENCRYPTION_KEY", "short");
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  });
});
