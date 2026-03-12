import { describe, it, expect } from "vitest";
import { str, parseDate, parseRows } from "./trainee-import";

// ─── str ─────────────────────────────────────────────────────────────────────

describe("str", () => {
  it("converts a string and trims whitespace", () => {
    expect(str("  Lucas  ")).toBe("Lucas");
  });

  it("converts a number to string", () => {
    expect(str(678451290)).toBe("678451290");
  });

  it("returns empty string for null", () => {
    expect(str(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(str(undefined)).toBe("");
  });
});

// ─── parseDate ───────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it("parses DD/MM/YYYY format", () => {
    const result = parseDate("15/03/1995");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(1995);
    expect(result?.getMonth()).toBe(2); // 0-indexed
    expect(result?.getDate()).toBe(15);
  });

  it("returns undefined for empty string", () => {
    expect(parseDate("")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(parseDate(undefined)).toBeUndefined();
  });

  it("returns undefined for an invalid format", () => {
    expect(parseDate("1995-03-15")).toBeUndefined();
    expect(parseDate("not-a-date")).toBeUndefined();
  });

  it("parses an Excel serial date number", () => {
    // Excel serial 34773 = 15/03/1995
    const result = parseDate("34773");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(1995);
    expect(result?.getMonth()).toBe(2);
    expect(result?.getDate()).toBe(15);
  });
});

// ─── parseRows ───────────────────────────────────────────────────────────────

describe("parseRows", () => {
  it("maps CSV columns to trainee fields", () => {
    const rows = [
      {
        Prénom: "Lucas",
        Nom: "Bertrand",
        Email: "lucas.bertrand@gmail.com",
        Téléphone: "0678451290",
        "Date de naissance": "15/03/1995",
        Adresse: "12 rue des Acacias",
        "Code postal": "69003",
        Ville: "Lyon",
      },
    ];

    const result = parseRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Lucas");
    expect(result[0].lastName).toBe("Bertrand");
    expect(result[0].email).toBe("lucas.bertrand@gmail.com");
    expect(result[0].phone).toBe("0678451290");
    expect(result[0].address).toBe("12 rue des Acacias, 69003, Lyon");
    expect(result[0].dateOfBirth?.getFullYear()).toBe(1995);
  });

  it("filters rows missing Prénom or Nom", () => {
    const rows = [
      { Prénom: "", Nom: "Bertrand" },
      { Prénom: "Lucas", Nom: "" },
      { Prénom: "Camille", Nom: "Durand" },
    ];

    const result = parseRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Camille");
  });

  it("sets email to undefined when empty", () => {
    const rows = [{ Prénom: "Lucas", Nom: "Bertrand", Email: "" }];
    const result = parseRows(rows);
    expect(result[0].email).toBeUndefined();
  });

  it("sets phone to undefined when empty", () => {
    const rows = [{ Prénom: "Lucas", Nom: "Bertrand", Téléphone: "" }];
    const result = parseRows(rows);
    expect(result[0].phone).toBeUndefined();
  });

  it("handles phone numbers stored as numbers by xlsx", () => {
    const rows = [{ Prénom: "Lucas", Nom: "Bertrand", Téléphone: 678451290 }];
    const result = parseRows(rows);
    expect(result[0].phone).toBe("678451290");
  });

  it("concatenates address parts and omits empty parts", () => {
    const rows = [
      {
        Prénom: "Lucas",
        Nom: "Bertrand",
        Adresse: "12 rue des Acacias",
        "Code postal": "",
        Ville: "Lyon",
      },
    ];
    const result = parseRows(rows);
    expect(result[0].address).toBe("12 rue des Acacias, Lyon");
  });

  it("sets address to undefined when all address parts are empty", () => {
    const rows = [
      {
        Prénom: "Lucas",
        Nom: "Bertrand",
        Adresse: "",
        "Code postal": "",
        Ville: "",
      },
    ];
    const result = parseRows(rows);
    expect(result[0].address).toBeUndefined();
  });

  it("returns an empty array for an empty input", () => {
    expect(parseRows([])).toEqual([]);
  });

  it("trims whitespace from all string fields", () => {
    const rows = [{ Prénom: "  Lucas  ", Nom: "  Bertrand  " }];
    const result = parseRows(rows);
    expect(result[0].firstName).toBe("Lucas");
    expect(result[0].lastName).toBe("Bertrand");
  });
});
