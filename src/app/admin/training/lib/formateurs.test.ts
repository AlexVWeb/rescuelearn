import { describe, it, expect } from "vitest";
import { toPdfFormateur } from "./formateurs";

const fallback = { lastName: "CONNECTE", firstName: "User" };

describe("toPdfFormateur", () => {
  it("joins all assigned formateurs", () => {
    expect(
      toPdfFormateur(
        [
          { lastName: "DUPONT", firstName: "Jean" },
          { lastName: "MARTIN", firstName: null },
        ],
        fallback
      )
    ).toEqual({ lastName: "DUPONT Jean, MARTIN", firstName: null });
  });

  it("falls back when no formateur is assigned", () => {
    expect(toPdfFormateur([], fallback)).toBe(fallback);
  });

  it("falls back when assigned formateurs have no name", () => {
    expect(
      toPdfFormateur([{ lastName: null, firstName: null }], fallback)
    ).toBe(fallback);
  });
});
