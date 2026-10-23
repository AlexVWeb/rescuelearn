import { describe, it, expect } from "vitest";
import {
  formatFileSize,
  formatSessionDates,
  formatSlotDay,
  formatTimeLabel,
} from "./format";

// Prisma renvoie les @db.Date à minuit UTC
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("formatSessionDates", () => {
  it("formate un intervalle de dates", () => {
    expect(formatSessionDates(day("2026-11-12"), day("2026-11-16"))).toBe(
      "12–16 novembre 2026"
    );
  });

  it("formate une session d'un jour sans décalage de fuseau", () => {
    expect(formatSessionDates(day("2026-11-12"), null)).toBe(
      "12 novembre 2026"
    );
  });

  it("dates inconnues", () => {
    expect(formatSessionDates(null, null)).toBe("Dates à venir");
  });
});

describe("formatSlotDay / formatTimeLabel / formatFileSize", () => {
  it("jour court en français", () => {
    expect(formatSlotDay(day("2026-10-23"))).toBe("ven. 23 oct.");
  });

  it("heure à la française", () => {
    expect(formatTimeLabel("09:00")).toBe("9h00");
    expect(formatTimeLabel("13:45")).toBe("13h45");
  });

  it("taille lisible", () => {
    expect(formatFileSize(300)).toBe("1 Ko");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2,5 Mo");
  });
});
