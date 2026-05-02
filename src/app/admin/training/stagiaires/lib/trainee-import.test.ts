import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  str,
  parseDate,
  parseRows,
  readFileAsTrainees,
} from "./trainee-import";
import * as XLSX from "xlsx";

vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
  SSF: {
    parse_date_code: vi.fn(),
  },
}));

describe("readFileAsTrainees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads and parses a CSV file", async () => {
    const mockFile = { name: "test.csv" } as File;
    const mockResult = "Prénom;Nom\nLucas;Bertrand";

    // Mock FileReader
    const mockReader = {
      readAsText: vi.fn().mockImplementation(function (this: {
        onload: (e: unknown) => void;
      }) {
        this.onload({ target: { result: mockResult } });
      }),
      readAsArrayBuffer: vi.fn(),
    };
    vi.stubGlobal(
      "FileReader",
      vi.fn(function () {
        return mockReader;
      })
    );

    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    } as unknown as XLSX.WorkBook);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { Prénom: "Lucas", Nom: "Bertrand" },
    ]);

    const result = await readFileAsTrainees(mockFile);

    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Lucas");
    expect(mockReader.readAsText).toHaveBeenCalledWith(mockFile, "UTF-8");

    vi.unstubAllGlobals();
  });

  it("reads and parses an Excel file", async () => {
    const mockFile = { name: "test.xlsx" } as File;

    // Mock FileReader
    const mockReader = {
      readAsText: vi.fn(),
      readAsArrayBuffer: vi.fn().mockImplementation(function (this: {
        onload: (e: unknown) => void;
      }) {
        this.onload({ target: { result: new ArrayBuffer(0) } });
      }),
    };
    vi.stubGlobal(
      "FileReader",
      vi.fn(function () {
        return mockReader;
      })
    );

    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    } as unknown as XLSX.WorkBook);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { Prénom: "Camille", Nom: "Durand" },
    ]);

    const result = await readFileAsTrainees(mockFile);

    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Camille");
    expect(mockReader.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);

    vi.unstubAllGlobals();
  });
});

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

describe("parseDate", () => {
  it("parses DD/MM/YYYY format", () => {
    const result = parseDate("15/03/1995");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(1995);
    expect(result?.getMonth()).toBe(2);
    expect(result?.getDate()).toBe(15);
  });

  it("returns undefined for empty string", () => {
    expect(parseDate("")).toBeUndefined();
  });

  it("parses an Excel serial date number", () => {
    vi.mocked(XLSX.SSF.parse_date_code).mockReturnValue({
      y: 1995,
      m: 3,
      d: 15,
    } as unknown as { y: number; m: number; d: number });
    const result = parseDate("34773");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(1995);
    expect(result?.getMonth()).toBe(2);
    expect(result?.getDate()).toBe(15);
  });
});

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

  it("trims whitespace from all string fields", () => {
    const rows = [{ Prénom: "  Lucas  ", Nom: "  Bertrand  " }];
    const result = parseRows(rows);
    expect(result[0].firstName).toBe("Lucas");
    expect(result[0].lastName).toBe("Bertrand");
  });
});
