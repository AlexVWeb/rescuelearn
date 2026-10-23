import { describe, it, expect } from "vitest";
import {
  getDueReminderKind,
  getEvaluationWindow,
  getSessionEnd,
  getWindowState,
  isReminderCovered,
  reminderKinds,
} from "./window";

// Slot.date est un @db.Date : Prisma le renvoie à minuit UTC
const slots = [
  {
    date: new Date("2026-10-20T00:00:00Z"),
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    date: new Date("2026-10-21T00:00:00Z"),
    startTime: "13:30",
    endTime: "17:30",
  },
  {
    date: new Date("2026-10-21T00:00:00Z"),
    startTime: "09:00",
    endTime: "12:00",
  },
];
// 21/10/2026 17h30 à Paris (UTC+2)
const END = new Date("2026-10-21T15:30:00.000Z");

describe("getSessionEnd", () => {
  it("retient la fin du dernier créneau, en heure de Paris", () => {
    expect(getSessionEnd(slots)?.toISOString()).toBe(END.toISOString());
  });

  it("renvoie null sans créneau", () => {
    expect(getSessionEnd([])).toBeNull();
  });
});

describe("getEvaluationWindow", () => {
  it("à chaud : de la fin de session à J+30, même heure locale après le changement d'heure", () => {
    const window = getEvaluationWindow("chaud", END);
    expect(window.opensAt.toISOString()).toBe(END.toISOString());
    // 20/11 17h30 à Paris (UTC+1)
    expect(window.closesAt.toISOString()).toBe("2026-11-20T16:30:00.000Z");
  });

  it("à froid : de J+90 à J+120", () => {
    const window = getEvaluationWindow("froid", END);
    expect(window.opensAt.toISOString()).toBe("2027-01-19T16:30:00.000Z");
    expect(window.closesAt.toISOString()).toBe("2027-02-18T16:30:00.000Z");
  });
});

describe("getWindowState", () => {
  const window = getEvaluationWindow("chaud", END);
  const ms = (date: Date, delta: number) => new Date(date.getTime() + delta);

  it("à venir juste avant l'ouverture", () => {
    expect(getWindowState(window, ms(window.opensAt, -1))).toBe("upcoming");
  });

  it("ouverte à l'instant exact d'ouverture et de fermeture", () => {
    expect(getWindowState(window, window.opensAt)).toBe("open");
    expect(getWindowState(window, window.closesAt)).toBe("open");
  });

  it("fermée juste après la fermeture", () => {
    expect(getWindowState(window, ms(window.closesAt, 1))).toBe("closed");
  });
});

describe("getDueReminderKind", () => {
  const at = (iso: string) => new Date(iso);

  it("invitation dès la fin de session", () => {
    expect(getDueReminderKind("chaud", END, END)).toBe("chaud-j0");
  });

  it("palier le plus récent atteint", () => {
    expect(getDueReminderKind("chaud", END, at("2026-10-28T16:30:00Z"))).toBe(
      "chaud-j7"
    );
    expect(getDueReminderKind("chaud", END, at("2026-11-15T00:00:00Z"))).toBe(
      "chaud-j23"
    );
  });

  it("rien avant l'ouverture ni après la fermeture", () => {
    expect(
      getDueReminderKind("froid", END, at("2026-12-01T00:00:00Z"))
    ).toBeNull();
    expect(
      getDueReminderKind("chaud", END, at("2026-12-01T00:00:00Z"))
    ).toBeNull();
  });

  it("à froid : J+90 puis J+97", () => {
    expect(getDueReminderKind("froid", END, at("2027-01-20T00:00:00Z"))).toBe(
      "froid-j90"
    );
    expect(getDueReminderKind("froid", END, at("2027-01-27T00:00:00Z"))).toBe(
      "froid-j97"
    );
  });
});

describe("isReminderCovered", () => {
  it("couvert par un envoi du même palier ou d'un palier suivant", () => {
    expect(isReminderCovered("chaud", "chaud-j7", ["chaud-j7"])).toBe(true);
    expect(isReminderCovered("chaud", "chaud-j7", ["chaud-j23"])).toBe(true);
  });

  it("non couvert par un palier précédent ou d'un autre type", () => {
    expect(isReminderCovered("chaud", "chaud-j7", ["chaud-j0"])).toBe(false);
    expect(isReminderCovered("froid", "froid-j90", ["chaud-j23"])).toBe(false);
  });

  it("liste les paliers dans l'ordre", () => {
    expect(reminderKinds("froid")).toEqual([
      "froid-j90",
      "froid-j97",
      "froid-j113",
    ]);
  });
});
