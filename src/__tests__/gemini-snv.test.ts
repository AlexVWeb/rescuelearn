import { describe, it, expect } from "vitest";
import { buildSNVScenarioPrompt } from "@/lib/gemini/snv";

describe("buildSNVScenarioPrompt", () => {
  it("should format prompt correctly with given parameters", () => {
    const prompt = buildSNVScenarioPrompt("Accident routier", 5, "PSE 2");

    expect(prompt).toContain("Accident routier");
    expect(prompt).toContain("5 victimes");
    expect(prompt).toContain("PSE 2");
    expect(prompt).toContain("correctAnswer");
    expect(prompt).toContain("explanation");
  });

  it("should fallback to default level if none provided", () => {
    const prompt = buildSNVScenarioPrompt("Accident routier", 10);

    expect(prompt).toContain("PSE1");
    expect(prompt).toContain("10 victimes");
  });
});
