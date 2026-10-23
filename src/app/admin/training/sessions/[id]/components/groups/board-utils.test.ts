import { describe, it, expect } from "vitest";
import {
  UNASSIGNED,
  buildBoard,
  moveItems,
  findContainer,
  ageFromBirthDate,
  boardKey,
} from "./board-utils";

describe("buildBoard", () => {
  it("range les inscriptions par groupe, inconnues en non affectés", () => {
    const board = buildBoard(
      [{ id: "g1" }, { id: "g2" }],
      [
        { id: "i1", groupId: "g1" },
        { id: "i2", groupId: null },
        { id: "i3", groupId: "supprimé" },
      ]
    );
    expect(board).toEqual({ [UNASSIGNED]: ["i2", "i3"], g1: ["i1"], g2: [] });
  });
});

describe("moveItems", () => {
  it("déplace plusieurs éléments en fin de cible", () => {
    const board = { [UNASSIGNED]: ["i1", "i2"], g1: ["i3"] };
    expect(moveItems(board, ["i1", "i2"], "g1")).toEqual({
      [UNASSIGNED]: [],
      g1: ["i3", "i1", "i2"],
    });
  });
  it("ignore les ids inconnus", () => {
    const board = { [UNASSIGNED]: ["i1"], g1: [] };
    expect(moveItems(board, ["x"], "g1")).toEqual(board);
  });
});

describe("findContainer", () => {
  const board = { [UNASSIGNED]: ["i1"], g1: ["i2"] };
  it("retourne le conteneur d'un item ou le conteneur lui-même", () => {
    expect(findContainer(board, "i2")).toBe("g1");
    expect(findContainer(board, "g1")).toBe("g1");
    expect(findContainer(board, "zz")).toBeUndefined();
  });
});

describe("ageFromBirthDate", () => {
  // Dates construites en heure locale : dayjs parse "YYYY-MM-DD" en local,
  // alors que new Date("YYYY-MM-DD") est en UTC (résultat dépendant du fuseau).
  const now = new Date(2026, 9, 22);
  it("calcule l'âge", () => {
    expect(ageFromBirthDate("2000-10-23", now)).toBe(25);
    expect(ageFromBirthDate("2000-10-22", now)).toBe(26);
    expect(ageFromBirthDate(new Date(2000, 9, 22), now)).toBe(26);
  });
  it("null si absente ou invalide", () => {
    expect(ageFromBirthDate(null, now)).toBeNull();
    expect(ageFromBirthDate("n/a", now)).toBeNull();
  });
});

describe("boardKey", () => {
  it("change quand un groupe ou une affectation change", () => {
    const a = boardKey(
      [{ id: "g1", name: "A", formateurId: null }],
      [{ id: "i1", groupId: "g1" }]
    );
    const b = boardKey(
      [{ id: "g1", name: "A", formateurId: null }],
      [{ id: "i1", groupId: null }]
    );
    expect(a).not.toBe(b);
  });
});
