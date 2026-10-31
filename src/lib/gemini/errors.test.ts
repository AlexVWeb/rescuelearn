import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@google/genai";
import {
  classifyGeminiError,
  getAiErrorMessage,
  isPermanentGeminiError,
} from "./errors";
import { retryWithBackoff } from "./client";

const apiError = (status: number, body: object) =>
  new ApiError({ status, message: JSON.stringify({ error: body }) });

const spendingCap = apiError(429, {
  code: 429,
  message:
    "Your project has exceeded its monthly spending cap. Please go to AI Studio at https://ai.studio/spend to manage your project spend cap.",
  status: "RESOURCE_EXHAUSTED",
});

describe("gemini errors", () => {
  it("detects the monthly spending cap", () => {
    expect(classifyGeminiError(spendingCap)).toBe("spending_cap");
    expect(getAiErrorMessage(spendingCap)).toContain("plafond de dépenses");
    expect(isPermanentGeminiError(spendingCap)).toBe(true);
  });

  it("detects the spending cap from a plain Error carrying the JSON body", () => {
    const err = new Error(
      '{"error":{"code":429,"message":"Your project has exceeded its monthly spending cap.","status":"RESOURCE_EXHAUSTED"}}'
    );
    expect(classifyGeminiError(err)).toBe("spending_cap");
  });

  it.each([
    [
      apiError(429, {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Quota exceeded",
      }),
      "quota",
    ],
    [
      apiError(400, {
        code: 400,
        status: "INVALID_ARGUMENT",
        message: "API key not valid. Please pass a valid API key.",
        details: [{ reason: "API_KEY_INVALID" }],
      }),
      "invalid_key",
    ],
    [
      apiError(400, {
        code: 400,
        status: "FAILED_PRECONDITION",
        message: "User location is not supported for the API use.",
      }),
      "unsupported_location",
    ],
    [
      apiError(403, {
        code: 403,
        status: "PERMISSION_DENIED",
        message: "denied",
      }),
      "permission",
    ],
    [
      apiError(404, {
        code: 404,
        status: "NOT_FOUND",
        message: "models/foo is not found",
      }),
      "not_found",
    ],
    [
      apiError(400, {
        code: 400,
        status: "INVALID_ARGUMENT",
        message: "Request payload size exceeds the limit",
      }),
      "invalid_request",
    ],
    [
      apiError(500, {
        code: 500,
        status: "INTERNAL",
        message: "An internal error has occurred.",
      }),
      "internal",
    ],
    [
      apiError(503, {
        code: 503,
        status: "UNAVAILABLE",
        message: "The model is overloaded.",
      }),
      "unavailable",
    ],
    [
      apiError(504, {
        code: 504,
        status: "DEADLINE_EXCEEDED",
        message: "Deadline exceeded",
      }),
      "timeout",
    ],
    [
      new Error("GEMINI_API_KEY is not configured in environment variables"),
      "missing_key",
    ],
  ])("classifies %#", (error, kind) => {
    expect(classifyGeminiError(error)).toBe(kind);
  });

  it("keeps our own error messages", () => {
    expect(getAiErrorMessage(new Error("Sujets introuvables"))).toBe(
      "Sujets introuvables"
    );
  });

  it("never leaks raw API error bodies", () => {
    const unknown = apiError(418, {
      code: 418,
      status: "TEAPOT",
      message: "?",
    });
    expect(getAiErrorMessage(unknown, "fallback")).toBe("fallback");
  });

  it("does not retry on the spending cap", async () => {
    const fn = vi.fn().mockRejectedValue(spendingCap);
    await expect(retryWithBackoff(fn, 3, 1)).rejects.toBe(spendingCap);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("still retries on a plain rate limit", async () => {
    const quota = apiError(429, {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      message: "Quota exceeded",
    });
    const fn = vi.fn().mockRejectedValueOnce(quota).mockResolvedValueOnce("ok");
    await expect(retryWithBackoff(fn, 3, 1)).resolves.toBe("ok");
  });
});
