export const FeatureKey = {
  PLAYER_SYSTEM: "PLAYER_SYSTEM",
  DUOLINGO_SYSTEM: "DUOLINGO_SYSTEM",
  GLASGOW_SYSTEM: "GLASGOW_SYSTEM",
  SNV_SYSTEM: "SNV_SYSTEM",
  QUIZ_SYSTEM: "QUIZ_SYSTEM",
} as const;

export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

export const ALL_FEATURES = Object.values(FeatureKey);
