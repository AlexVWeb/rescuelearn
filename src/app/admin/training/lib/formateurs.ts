export interface FormateurName {
  lastName: string | null;
  firstName: string | null;
}

export function formatFormateurName(f: FormateurName): string {
  return `${f.lastName ?? ""} ${f.firstName ?? ""}`.trim();
}

/**
 * Les générateurs PDF attendent un seul `{ lastName, firstName }` et affichent
 * `${lastName} ${firstName}`. On y concatène tous les formateurs affectés ;
 * repli sur `fallback` (utilisateur connecté) si aucun nom exploitable.
 */
export function toPdfFormateur(
  formateurs: FormateurName[],
  fallback: FormateurName
): FormateurName {
  const names = formateurs.map(formatFormateurName).filter(Boolean);
  if (names.length === 0) return fallback;
  return { lastName: names.join(", "), firstName: null };
}
