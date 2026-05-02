import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  uploadFile,
  getFile,
  deleteFile,
  getPresignedUrl,
  getStorageKey,
} from "./r2";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = mockSend;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

describe("R2 Library - Storage Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploadFile sends PutObjectCommand", async () => {
    await uploadFile("key", Buffer.from("data"), "image/png");
    expect(mockSend).toHaveBeenCalled();
  });

  it("getFile retrieves and returns buffer", async () => {
    const mockResponse = {
      Body: {
        transformToByteArray: vi
          .fn()
          .mockResolvedValue(new Uint8Array([1, 2, 3])),
      },
      ContentType: "application/pdf",
    };
    vi.mocked(mockSend).mockResolvedValue(
      mockResponse as unknown as Awaited<ReturnType<typeof mockSend>>
    );

    const result = await getFile("key");
    expect(result.buffer).toEqual(Buffer.from([1, 2, 3]));
    expect(result.contentType).toBe("application/pdf");
  });

  it("getFile throws if Body is missing", async () => {
    vi.mocked(mockSend).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof mockSend>>
    );
    await expect(getFile("key")).rejects.toThrow("Fichier introuvable");
  });

  it("getPresignedUrl calls getSignedUrl", async () => {
    vi.mocked(getSignedUrl).mockResolvedValue(
      "https://signed-url.com" as never
    );
    const url = await getPresignedUrl("key");
    expect(url).toBe("https://signed-url.com");
  });

  it("deleteFile sends DeleteObjectCommand", async () => {
    await deleteFile("key");
    expect(mockSend).toHaveBeenCalled();
  });
});

describe("R2 Library - getStorageKey", () => {
  it("generates a key with dev prefix by default", () => {
    const key = getStorageKey("org123", "logo", "logo.png");
    expect(key).toBe("dev/organisme/org123/logo/logo.png");
  });

  it("generates a key with prod prefix when APP_MODE is set to prod", () => {
    vi.stubEnv("APP_MODE", "prod");
    const key = getStorageKey("org123", "logo", "logo.png");
    expect(key).toBe("prod/organisme/org123/logo/logo.png");
    vi.unstubAllEnvs();
  });

  it("handles external-trainings category correctly", () => {
    const key = getStorageKey("org123", "external-trainings", "diploma.pdf");
    expect(key).toBe("dev/organisme/org123/external-trainings/diploma.pdf");
  });
});
