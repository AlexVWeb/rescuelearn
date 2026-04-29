import { describe, it, expect } from "vitest";
import * as z from "zod";

const schema = z.object({
  type: z.string().min(1, "Type requis"),
  name: z.string().min(2, "Nom requis"),
  organisme: z.string().min(2, "Organisme requis"),
  obtainedAt: z.string().min(1, "Date requise"),
  certificateNumber: z.string().optional(),
});

describe("ExternalTraining form schema", () => {
  it("validates a complete valid input", () => {
    const result = schema.safeParse({
      type: "PSC",
      name: "Premiers Secours Civiques",
      organisme: "Croix Rouge",
      obtainedAt: "2024-01-15",
      certificateNumber: "CERT-001",
    });
    expect(result.success).toBe(true);
  });

  it("validates without optional fields", () => {
    const result = schema.safeParse({
      type: "PSE1",
      name: "PSE Niveau 1",
      organisme: "SDIS",
      obtainedAt: "2024-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty type", () => {
    const result = schema.safeParse({
      type: "",
      name: "PSE Niveau 1",
      organisme: "SDIS",
      obtainedAt: "2024-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = schema.safeParse({
      type: "PSC",
      name: "A",
      organisme: "SDIS",
      obtainedAt: "2024-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing obtainedAt", () => {
    const result = schema.safeParse({
      type: "PSC",
      name: "PSC",
      organisme: "SDIS",
      obtainedAt: "",
    });
    expect(result.success).toBe(false);
  });
});
