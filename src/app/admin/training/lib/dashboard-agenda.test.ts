import { describe, it, expect } from "vitest";
import {
  agendaColumns,
  buildTodos,
  buildWeekAgenda,
  dayRange,
  isLowFill,
  parisDayKey,
  sortByStartDate,
  type AgendaSlotRow,
} from "./dashboard-agenda";

const session = {
  id: "s1",
  title: "PSE1 Nantes",
  type: "PSE1",
  location: "Nantes",
  maxTrainees: 10,
  enrolled: 8,
};

const slot = (
  date: string,
  startTime: string,
  endTime: string,
  overrides: Partial<AgendaSlotRow["session"]> = {}
): AgendaSlotRow => ({
  date: new Date(`${date}T00:00:00Z`),
  startTime,
  endTime,
  session: { ...session, ...overrides },
});

describe("parisDayKey", () => {
  it("donne le jour à Paris, pas en UTC", () => {
    // 23h30 UTC le 31 octobre = 0h30 à Paris le 1er novembre
    expect(parisDayKey(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
    expect(parisDayKey(new Date("2026-10-31T10:00:00Z"))).toBe("2026-10-31");
  });
});

describe("dayRange", () => {
  it("couvre 7 jours en dates @db.Date", () => {
    const { start, end } = dayRange(new Date("2026-10-31T10:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });
});

describe("agendaColumns", () => {
  it("donne 7 jours à partir d'aujourd'hui", () => {
    const columns = agendaColumns("2026-11-01");
    expect(columns).toHaveLength(7);
    expect(columns[0]).toEqual({
      key: "2026-11-01",
      weekday: "dim.",
      dayNumber: "1",
      fullLabel: "dimanche 1 novembre",
      isToday: true,
    });
    expect(columns[6].key).toBe("2026-11-07");
    expect(columns[6].isToday).toBe(false);
  });
});

describe("buildWeekAgenda", () => {
  it("met une session de plusieurs jours sur une seule ligne", () => {
    const { rows } = buildWeekAgenda(
      [
        slot("2026-11-02", "13:30", "17:00"),
        slot("2026-11-02", "09:00", "12:30"),
        slot("2026-11-03", "09:00", "12:30"),
        slot("2026-11-03", "13:30", "17:00"),
      ],
      "2026-11-01"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].dayTimes).toEqual([
      null,
      "9h00 – 12h30, 13h30 – 17h00",
      "9h00 – 12h30, 13h30 – 17h00",
      null,
      null,
      null,
      null,
    ]);
    expect(rows[0].schedule).toBe("9h00 – 12h30, 13h30 – 17h00");
  });

  it("ignore un créneau en double le même jour", () => {
    const { rows } = buildWeekAgenda(
      [
        slot("2026-11-01", "09:00", "12:30"),
        slot("2026-11-01", "09:00", "12:30"),
      ],
      "2026-11-01"
    );
    expect(rows[0].dayTimes[0]).toBe("9h00 – 12h30");
  });

  it("signale des horaires qui varient selon le jour", () => {
    const { rows } = buildWeekAgenda(
      [
        slot("2026-11-01", "09:00", "17:00"),
        slot("2026-11-02", "09:00", "12:00"),
      ],
      "2026-11-01"
    );
    expect(rows[0].schedule).toBeNull();
  });

  it("une ligne par session, dans l'ordre du premier créneau", () => {
    const { rows } = buildWeekAgenda(
      [
        slot("2026-11-03", "08:00", "12:00", { id: "s2", title: "SST" }),
        slot("2026-11-02", "14:00", "18:00"),
      ],
      "2026-11-01"
    );
    expect(rows.map((r) => r.sessionId)).toEqual(["s1", "s2"]);
  });

  it("ignore les créneaux hors de la semaine", () => {
    const { rows } = buildWeekAgenda(
      [slot("2026-11-09", "09:00", "17:00")],
      "2026-11-01"
    );
    expect(rows).toEqual([]);
  });
});

describe("isLowFill", () => {
  it("signale moins de la moitié des places prises", () => {
    expect(isLowFill(4, 10)).toBe(true);
    expect(isLowFill(5, 10)).toBe(false);
    expect(isLowFill(0, 0)).toBe(false);
  });
});

describe("buildTodos", () => {
  it("met les clôtures avant les sessions à remplir", () => {
    const todos = buildTodos(
      [
        {
          id: "a",
          title: "PSE2",
          endDate: new Date("2026-10-28T00:00:00Z"),
          missingResults: 3,
        },
        {
          id: "b",
          title: "PSC",
          endDate: new Date("2026-10-29T00:00:00Z"),
          missingResults: 0,
        },
      ],
      [
        {
          id: "c",
          title: "SST",
          startDate: new Date("2026-11-05T00:00:00Z"),
          enrolled: 1,
          maxTrainees: 10,
        },
        {
          id: "d",
          title: "PSE1",
          startDate: new Date("2026-11-06T00:00:00Z"),
          enrolled: 9,
          maxTrainees: 10,
        },
      ]
    );

    expect(todos.map((t) => t.id)).toEqual(["close-a", "close-b", "fill-c"]);
    expect(todos[0].detail).toBe(
      "Terminée le 28 octobre, 3 stagiaires sans résultat"
    );
    expect(todos[0].href).toBe(
      "/admin/training/sessions/a?phase=close&section=resultats"
    );
    expect(todos[1].detail).toBe(
      "Terminée le 29 octobre, prête à être clôturée"
    );
    expect(todos[2].detail).toBe(
      "Débute le 5 novembre, 1 inscrit sur 10 places"
    );
    expect(todos[2].href).toBe(
      "/admin/training/sessions/c?phase=prepare&section=stagiaires"
    );
  });
});

describe("sortByStartDate", () => {
  it("trie par date et met les sessions sans date à la fin", () => {
    const sorted = sortByStartDate([
      { id: "none", startDate: null },
      { id: "late", startDate: new Date("2026-12-01") },
      { id: "soon", startDate: new Date("2026-11-02") },
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["soon", "late", "none"]);
  });
});
