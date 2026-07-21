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

export interface ExternalTrainingAnomaly {
  code: "FUTURE_DATE" | "MISSING_INITIAL" | "FC_BEFORE_INITIAL";
  message: string;
}

/**
 * Detects anomalies for a given external training:
 * - FUTURE_DATE: obtainedAt is in the future.
 * - MISSING_INITIAL: isFC is true but no initial training (isFC = false) exists for that type.
 * - FC_BEFORE_INITIAL: isFC is true, initial training exists, but obtainedAt of FC is BEFORE or SAME AS the initial diploma date.
 */
export function detectExternalTrainingAnomalies(
  ext: ExternalTrainingEntry & { id?: string },
  inscriptions: PlatformTrainingEntry[],
  externalTrainings: Array<ExternalTrainingEntry & { id?: string }>,
  now = dayjs()
): ExternalTrainingAnomaly[] {
  const anomalies: ExternalTrainingAnomaly[] = [];

  const extObtainedAt = dayjs(ext.obtainedAt);

  // 1. Check for future date
  if (extObtainedAt.isAfter(now, "day")) {
    anomalies.push({
      code: "FUTURE_DATE",
      message: `Date d'obtention incohérente : le ${extObtainedAt.format("DD/MM/YYYY")} se situe dans le futur.`,
    });
  }

  // 2. Check for FC anomalies
  if (ext.isFC) {
    // Find all initial trainings for this type
    const platformInitialDates = inscriptions
      .filter(
        (i) =>
          i.trainingSession.type === ext.type &&
          i.status === "présent" &&
          !i.trainingSession.isFC &&
          i.trainingSession.startDate != null
      )
      .map((i) => dayjs(i.trainingSession.startDate!));

    const externalInitialDates = externalTrainings
      .filter(
        (e) =>
          e.type === ext.type && !e.isFC && (ext.id ? e.id !== ext.id : true)
      )
      .map((e) => dayjs(e.obtainedAt));

    const allInitialDates = [
      ...platformInitialDates,
      ...externalInitialDates,
    ].sort((a, b) => a.diff(b));

    if (allInitialDates.length === 0) {
      anomalies.push({
        code: "MISSING_INITIAL",
        message: `Aucune formation initiale connue pour la filière ${ext.type}.`,
      });
    } else {
      // Find the earliest initial diploma date
      const earliestInitialDate = allInitialDates[0];
      if (extObtainedAt.isBefore(earliestInitialDate, "day")) {
        anomalies.push({
          code: "FC_BEFORE_INITIAL",
          message: `Incohérence chronologique : la Formation Continue du ${extObtainedAt.format("DD/MM/YYYY")} est antérieure au diplôme initial du ${earliestInitialDate.format("DD/MM/YYYY")}.`,
        });
      }
    }
  }

  return anomalies;
}
