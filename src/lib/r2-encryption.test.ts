import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadFile } from "./r2";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const S3Client = vi.fn();
  S3Client.prototype.send = vi.fn().mockResolvedValue({});
  return {
    S3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

// Mock encryption to see if it's called
vi.mock("./encryption", () => ({
  encryptBuffer: vi.fn((buf) =>
    Buffer.concat([Buffer.from("encrypted-"), buf])
  ),
  decryptBuffer: vi.fn((buf) => buf.slice(10)),
  getEncryptionKey: vi.fn(() => "mock-key"),
}));

import { encryptBuffer } from "./encryption";

describe("R2 Encryption Wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call encryptBuffer when encryption is requested in uploadFile", async () => {
    const data = Buffer.from("hello");
    await uploadFile("test-key", data, "text/plain", true);

    expect(encryptBuffer).toHaveBeenCalled();
  });

  it("should NOT call encryptBuffer when encryption is NOT requested in uploadFile", async () => {
    const data = Buffer.from("hello");
    await uploadFile("test-key", data, "text/plain", false);

    expect(encryptBuffer).not.toHaveBeenCalled();
  });
});
