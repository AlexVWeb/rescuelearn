import dayjs from "dayjs";

export interface PlatformTrainingEntry {
  status: string;
  trainingSession: {
    type: string;
    startDate: Date | string | null;
    isFC: boolean;
  };
}

export interface ExternalTrainingEntry {
  type: string;
  obtainedAt: Date | string;
  isFC: boolean;
}

export interface FiliereResult {
  type: string;
  effectiveExpiry: dayjs.Dayjs;
  expired: boolean;
  diplomaDate: Date | string | null | undefined;
  lastFCDate: Date | string | null | undefined;
}

function latestDate(
  entries: Array<PlatformTrainingEntry | ExternalTrainingEntry>
): Date | string | null {
  const dates = entries
    .map((i) =>
      "trainingSession" in i ? i.trainingSession.startDate : i.obtainedAt
    )
    .filter((d): d is Date | string => d != null)
    .sort((a, b) => dayjs(b).diff(dayjs(a)));
  return dates[0] ?? null;
}

/**
 * Groups trainings by type and computes validity summary for each.
 * Extracted from training-history-section.tsx.
 */
export function computeFilieres(
  inscriptions: PlatformTrainingEntry[],
  externalTrainings: ExternalTrainingEntry[],
  now = dayjs()
): FiliereResult[] {
  const allTypes = new Set([
    ...inscriptions.map((i) => i.trainingSession.type),
    ...externalTrainings.map((e) => e.type),
  ]);

  return [...allTypes]
    .map((type) => {
      const platformPresent = inscriptions.filter(
        (i) => i.trainingSession.type === type && i.status === "présent"
      );
      const externals = externalTrainings.filter((e) => e.type === type);

      const expiryDates = [
        ...platformPresent.map((i) =>
          i.trainingSession.startDate
            ? dayjs(i.trainingSession.startDate).add(1, "year").endOf("year")
            : null
        ),
        ...externals.map((e) =>
          dayjs(e.obtainedAt).add(1, "year").endOf("year")
        ),
      ].filter((d): d is dayjs.Dayjs => d != null);

      if (expiryDates.length === 0) return null;

      const effectiveExpiry = expiryDates.reduce((max, d) =>
        d.isAfter(max) ? d : max
      );
      const expired = effectiveExpiry.isBefore(now);

      const diplomaTrainings = [
        ...platformPresent.filter((i) => !i.trainingSession.isFC),
        ...externals.filter((e) => !e.isFC),
      ];
      const fcTrainings = [
        ...platformPresent.filter((i) => i.trainingSession.isFC),
        ...externals.filter((e) => e.isFC),
      ];

      return {
        type,
        effectiveExpiry,
        expired,
        diplomaDate: latestDate(diplomaTrainings),
        lastFCDate: latestDate(fcTrainings),
      };
    })
    .filter((f): f is NonNullable<typeof f> => f != null) as FiliereResult[];
}

/**
 * Returns training types that are currently valid (effectiveExpiry >= now).
 */
export function computeValidCompetences(
  inscriptions: PlatformTrainingEntry[],
  externalTrainings: ExternalTrainingEntry[],
  now = dayjs()
): string[] {
  return computeFilieres(inscriptions, externalTrainings, now)
    .filter((f) => !f.expired)
    .map((f) => f.type);
}

/**
 * Returns the most urgent expiry (soonest date) among valid competences.
 * Returns null if no valid competences.
 */
export function computeNextExpiry(
  inscriptions: PlatformTrainingEntry[],
  externalTrainings: ExternalTrainingEntry[],
  now = dayjs()
): { type: string; expiryDate: dayjs.Dayjs } | null {
  const validFilieres = computeFilieres(
    inscriptions,
    externalTrainings,
    now
  ).filter((f) => !f.expired);
  if (validFilieres.length === 0) return null;

  const soonest = validFilieres.reduce((min, f) =>
    f.effectiveExpiry.isBefore(min.effectiveExpiry) ? f : min
  );
  return { type: soonest.type, expiryDate: soonest.effectiveExpiry };
}
