import { describe, it, expect } from "vitest";
import { formatParisTime, getSlotState, getSlotWindow } from "./slot-window";

// Slot.date est un @db.Date : Prisma le renvoie à minuit UTC
const morning = {
  date: new Date("2026-11-12T00:00:00Z"),
  startTime: "09:00",
  endTime: "12:30",
};

describe("getSlotWindow", () => {
  it("interprète les horaires en heure de Paris (hiver, UTC+1)", () => {
    const window = getSlotWindow(morning);
    expect(window.startsAt.toISOString()).toBe("2026-11-12T08:00:00.000Z");
    expect(window.opensAt.toISOString()).toBe("2026-11-12T07:45:00.000Z");
    expect(window.closesAt.toISOString()).toBe("2026-11-12T11:30:00.000Z");
  });

  it("interprète les horaires en heure de Paris (été, UTC+2)", () => {
    const window = getSlotWindow({
      ...morning,
      date: new Date("2026-10-24T00:00:00Z"),
    });
    expect(window.startsAt.toISOString()).toBe("2026-10-24T07:00:00.000Z");
  });

  it("gère le jour du passage à l'heure d'hiver (25/10/2026)", () => {
    const window = getSlotWindow({
      ...morning,
      date: new Date("2026-10-25T00:00:00Z"),
    });
    expect(window.startsAt.toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });
});

describe("getSlotState", () => {
  it("à venir avant l'ouverture (15 min avant le début)", () => {
    expect(
      getSlotState(morning, undefined, new Date("2026-11-12T07:44:00Z"))
    ).toBe("upcoming");
  });

  it("ouvert 15 min avant le début et jusqu'à la fin", () => {
    expect(
      getSlotState(morning, "en_attente", new Date("2026-11-12T07:45:00Z"))
    ).toBe("open");
    expect(
      getSlotState(morning, "en_attente", new Date("2026-11-12T11:30:00Z"))
    ).toBe("open");
  });

  it("manqué après la fin sans signature", () => {
    expect(
      getSlotState(morning, "en_attente", new Date("2026-11-12T11:31:00Z"))
    ).toBe("missed");
  });

  it("signé quel que soit le moment", () => {
    expect(
      getSlotState(morning, "validé", new Date("2026-11-12T09:00:00Z"))
    ).toBe("signed");
  });

  it("absent si le formateur l'a marqué", () => {
    expect(
      getSlotState(morning, "absent", new Date("2026-11-12T09:00:00Z"))
    ).toBe("absent");
  });
});

describe("formatParisTime", () => {
  it("formate l'heure à la française, en heure de Paris", () => {
    expect(formatParisTime(new Date("2026-11-12T08:04:00Z"))).toBe("9h04");
    expect(formatParisTime(new Date("2026-11-12T12:45:00Z"))).toBe("13h45");
  });
});
