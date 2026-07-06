import * as XLSX from "xlsx";

export interface ParsedTrainee {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: string;
}

export function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}`);
  }
  const num = Number(value);
  if (!isNaN(num) && num > 0) {
    const info = XLSX.SSF.parse_date_code(num);
    if (info) return new Date(info.y, info.m - 1, info.d);
  }
  return undefined;
}

export function parseRows(rows: Record<string, unknown>[]): ParsedTrainee[] {
  return rows
    .filter((row) => row["Prénom"] && row["Nom"])
    .map((row) => {
      const address = [
        str(row["Adresse"]),
        str(row["Code postal"]),
        str(row["Ville"]),
      ]
        .filter(Boolean)
        .join(", ");

      return {
        firstName: str(row["Prénom"]),
        lastName: str(row["Nom"]),
        email: str(row["Email"]) || undefined,
        phone: str(row["Téléphone"]) || undefined,
        dateOfBirth: parseDate(str(row["Date de naissance"])),
        address: address || undefined,
      };
    });
}
export async function readFileAsTrainees(file: File): Promise<ParsedTrainee[]> {
  return new Promise((resolve, reject) => {
    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let workbook: XLSX.WorkBook;
        if (isCSV) {
          const text = e.target?.result as string;
          workbook = XLSX.read(text, { type: "string", FS: ";" });
        } else {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: "array" });
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });
        resolve(parseRows(rows));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));

    if (isCSV) {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
