import { describe, it, expect } from "vitest";
import { parseSignaturePng, MAX_SIGNATURE_BYTES } from "./signature-image";

// PNG 1×1 transparent
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("parseSignaturePng", () => {
  it("returns the decoded PNG", () => {
    const buffer = parseSignaturePng(`data:image/png;base64,${TINY_PNG}`);
    expect(buffer.subarray(0, 4).toString("hex")).toBe("89504e47");
  });

  it("rejects another media type", () => {
    expect(() =>
      parseSignaturePng(`data:image/jpeg;base64,${TINY_PNG}`)
    ).toThrow("Signature invalide.");
  });

  it("rejects malformed base64", () => {
    expect(() => parseSignaturePng("data:image/png;base64,%%%")).toThrow(
      "Signature invalide."
    );
  });

  it("rejects content that is not a PNG", () => {
    const fake = Buffer.from("not a png at all").toString("base64");
    expect(() => parseSignaturePng(`data:image/png;base64,${fake}`)).toThrow(
      "Signature invalide."
    );
  });

  it("rejects an oversized image", () => {
    const big = Buffer.alloc(MAX_SIGNATURE_BYTES + 1).toString("base64");
    expect(() => parseSignaturePng(`data:image/png;base64,${big}`)).toThrow(
      "Signature trop volumineuse."
    );
  });
});
