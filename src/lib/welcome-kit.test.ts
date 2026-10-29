import { describe, it, expect } from "vitest";
import {
  isBeforeSession,
  parseChecklist,
  parseDateMap,
  preReadVisibleFrom,
  readiness,
  resolveToBring,
} from "./welcome-kit";

describe("parseChecklist", () => {
  it("garde les items valides, dans l'ordre", () => {
    expect(
      parseChecklist([
        { id: "a", label: "Tenue de sport" },
        { id: "b", label: "Pièce d'identité" },
      ])
    ).toEqual([
      { id: "a", label: "Tenue de sport" },
      { id: "b", label: "Pièce d'identité" },
    ]);
  });

  it("écarte les entrées malformées, vides ou en double", () => {
    expect(
      parseChecklist([
        { id: "a", label: "  " },
        { id: 3, label: "x" },
        "texte",
        { id: "b", label: "Gourde" },
        { id: "b", label: "Doublon" },
      ])
    ).toEqual([{ id: "b", label: "Gourde" }]);
  });

  it("renvoie [] pour une valeur non tableau", () => {
    expect(parseChecklist(null)).toEqual([]);
    expect(parseChecklist({})).toEqual([]);
  });
});

describe("parseDateMap", () => {
  it("garde les clés à valeur chaîne", () => {
    expect(parseDateMap({ a: "2026-11-01T10:00:00.000Z", b: 3 })).toEqual({
      a: "2026-11-01T10:00:00.000Z",
    });
  });

  it("renvoie {} pour null ou un tableau", () => {
    expect(parseDateMap(null)).toEqual({});
    expect(parseDateMap([])).toEqual({});
  });
});

describe("resolveToBring", () => {
  it("fusionne modèle et ajout de session, une ligne = une puce", () => {
    expect(
      resolveToBring("Tenue de sport\n\n  Gourde  ", "Masque de poche")
    ).toEqual(["Tenue de sport", "Gourde", "Masque de poche"]);
  });

  it("gère l'absence des deux", () => {
    expect(resolveToBring(null, null)).toEqual([]);
  });
});

describe("preReadVisibleFrom", () => {
  it("null si pas de délai ou pas de date de début", () => {
    expect(preReadVisibleFrom(new Date("2026-11-12"), null)).toBeNull();
    expect(preReadVisibleFrom(null, 7)).toBeNull();
  });

  it("minuit à Paris, heure d'hiver", () => {
    expect(preReadVisibleFrom(new Date("2026-11-12"), 7)?.toISOString()).toBe(
      "2026-11-04T23:00:00.000Z"
    );
  });

  it("minuit à Paris, heure d'été", () => {
    expect(preReadVisibleFrom(new Date("2026-06-10"), 3)?.toISOString()).toBe(
      "2026-06-06T22:00:00.000Z"
    );
  });

  it("à cheval sur le changement d'heure (25 oct. 2026)", () => {
    // Début en heure d'hiver, J-7 en heure d'été
    expect(preReadVisibleFrom(new Date("2026-10-27"), 7)?.toISOString()).toBe(
      "2026-10-19T22:00:00.000Z"
    );
  });

  it("J-0 = minuit du premier jour", () => {
    expect(preReadVisibleFrom(new Date("2026-11-12"), 0)?.toISOString()).toBe(
      "2026-11-11T23:00:00.000Z"
    );
  });
});

describe("isBeforeSession", () => {
  const slot = {
    date: new Date("2026-11-12"),
    startTime: "09:00",
    endTime: "12:30",
  };

  it("vrai jusqu'à 1h avant le premier créneau", () => {
    expect(
      isBeforeSession([slot], null, new Date("2026-11-12T06:59:00.000Z"))
    ).toBe(true);
    expect(
      isBeforeSession([slot], null, new Date("2026-11-12T07:00:00.000Z"))
    ).toBe(false);
  });

  it("prend le créneau le plus tôt, quel que soit l'ordre", () => {
    const later = { ...slot, date: new Date("2026-11-13") };
    expect(
      isBeforeSession([later, slot], null, new Date("2026-11-12T08:00:00.000Z"))
    ).toBe(false);
  });

  it("sans créneau : minuit (Paris) de startDate", () => {
    const start = new Date("2026-11-12");
    expect(
      isBeforeSession([], start, new Date("2026-11-11T22:59:00.000Z"))
    ).toBe(true);
    expect(
      isBeforeSession([], start, new Date("2026-11-11T23:00:00.000Z"))
    ).toBe(false);
  });

  it("faux sans créneau ni date", () => {
    expect(isBeforeSession([], null, new Date())).toBe(false);
  });
});

describe("readiness", () => {
  const base = {
    checklist: [
      { id: "tenue", label: "Tenue de sport" },
      { id: "id", label: "Pièce d'identité" },
    ],
    checklistDone: {},
    hasTerms: true,
    termsAccepted: false,
    preReads: [{ id: "doc1", title: "Fiche Bilans" }],
    prereadOpened: {},
  };

  it("CGV, pré-lectures puis items manuels", () => {
    const result = readiness(base);
    expect(result.items.map((i) => i.id)).toEqual([
      "terms",
      "preread:doc1",
      "tenue",
      "id",
    ]);
    expect(result).toMatchObject({ done: 0, total: 4 });
  });

  it("compte les items faits", () => {
    const result = readiness({
      ...base,
      termsAccepted: true,
      checklistDone: { tenue: "2026-11-01T10:00:00.000Z" },
      prereadOpened: { doc1: "2026-11-02T10:00:00.000Z" },
    });
    expect(result).toMatchObject({ done: 3, total: 4 });
  });

  it("ignore les coches orphelines", () => {
    const result = readiness({
      ...base,
      checklistDone: { supprime: "2026-11-01T10:00:00.000Z" },
    });
    expect(result).toMatchObject({ done: 0, total: 4 });
  });

  it("pas d'item CGV sans CGV, pas d'item pré-lecture sans document", () => {
    const result = readiness({ ...base, hasTerms: false, preReads: [] });
    expect(result.items.map((i) => i.kind)).toEqual(["manual", "manual"]);
  });

  it("total 0 sans rien", () => {
    expect(
      readiness({ ...base, checklist: [], hasTerms: false, preReads: [] })
    ).toEqual({ done: 0, total: 0, items: [] });
  });
});
