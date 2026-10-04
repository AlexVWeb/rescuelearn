export const REFERENCIEL_LEVELS = [
  "GQS",
  "PSC",
  "SST",
  "PSE1",
  "PSE2",
  "FORMATEUR",
] as const;

export type ReferencielLevel = (typeof REFERENCIEL_LEVELS)[number];

export function filterReferencielLevels(values: unknown[]): string[] {
  const allowed: readonly string[] = REFERENCIEL_LEVELS;
  return Array.from(
    new Set(
      values.filter(
        (v): v is string => typeof v === "string" && allowed.includes(v)
      )
    )
  );
}
