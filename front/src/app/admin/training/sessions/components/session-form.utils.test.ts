import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import { formatSessionFormData } from "./session-form.utils";

const baseFormValues = {
  title: "Formation Avril",
  type: "PSC" as const,
  location: "Salle des fêtes",
  maxTrainees: 10,
  status: "planifiée" as const,
  isFC: false,
};

describe("formatSessionFormData", () => {
  it("should set startDate to noon when a date string is provided", () => {
    const result = formatSessionFormData({
      ...baseFormValues,
      startDate: "2024-04-01",
      endDate: null,
    });
    expect(result.startDate).not.toBeNull();
    expect(dayjs(result.startDate!).hour()).toBe(12);
    expect(dayjs(result.startDate!).format("YYYY-MM-DD")).toBe("2024-04-01");
  });

  it("should set endDate to noon when a date string is provided", () => {
    const result = formatSessionFormData({
      ...baseFormValues,
      startDate: null,
      endDate: "2024-04-03",
    });
    expect(result.endDate).not.toBeNull();
    expect(dayjs(result.endDate!).hour()).toBe(12);
    expect(dayjs(result.endDate!).format("YYYY-MM-DD")).toBe("2024-04-03");
  });

  it("should set startDate to null when not provided", () => {
    const result = formatSessionFormData({
      ...baseFormValues,
      startDate: "",
      endDate: null,
    });
    expect(result.startDate).toBeNull();
  });

  it("should set endDate to null when not provided", () => {
    const result = formatSessionFormData({
      ...baseFormValues,
      startDate: null,
      endDate: "",
    });
    expect(result.endDate).toBeNull();
  });

  it("should map all scalar fields correctly", () => {
    const result = formatSessionFormData({
      ...baseFormValues,
      startDate: null,
      endDate: null,
    });
    expect(result.title).toBe("Formation Avril");
    expect(result.type).toBe("PSC");
    expect(result.location).toBe("Salle des fêtes");
    expect(result.maxTrainees).toBe(10);
    expect(result.status).toBe("planifiée");
  });
});
