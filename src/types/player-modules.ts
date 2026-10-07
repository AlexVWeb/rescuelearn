// Modules (widgets) du tableau de bord élève, activables depuis /admin/progression.
// Stockés dans SystemSetting avec le préfixe MODULE_ ; absents = actifs.
export const PlayerModuleKey = {
  MASCOT: "MODULE_MASCOT",
  DAILY_STATS: "MODULE_DAILY_STATS",
  DAILY_QUESTS: "MODULE_DAILY_QUESTS",
  SUBSCRIPTION: "MODULE_SUBSCRIPTION",
  LEADERBOARD: "MODULE_LEADERBOARD",
  BOUTIQUE: "MODULE_BOUTIQUE",
} as const;

export type PlayerModuleKey =
  (typeof PlayerModuleKey)[keyof typeof PlayerModuleKey];

export const ALL_PLAYER_MODULES = Object.values(PlayerModuleKey);

export type PlayerModulesState = Record<PlayerModuleKey, boolean>;

export const isPlayerModuleKey = (key: string): key is PlayerModuleKey =>
  (ALL_PLAYER_MODULES as string[]).includes(key);

export function buildPlayerModulesState(
  settings: { key: string; value: string }[]
): PlayerModulesState {
  const state = Object.fromEntries(
    ALL_PLAYER_MODULES.map((key) => [key, true])
  ) as PlayerModulesState;

  settings.forEach((s) => {
    if (isPlayerModuleKey(s.key)) {
      state[s.key] = s.value === "true";
    }
  });

  return state;
}

export const PLAYER_MODULE_LABELS: Record<
  PlayerModuleKey,
  { title: string; description: string }
> = {
  [PlayerModuleKey.MASCOT]: {
    title: "Mascotte",
    description: "Carte de la mascotte et accès au questionnaire d'accueil.",
  },
  [PlayerModuleKey.DAILY_STATS]: {
    title: "Statistiques du jour",
    description: "Résumé de l'activité et de la progression de l'élève.",
  },
  [PlayerModuleKey.DAILY_QUESTS]: {
    title: "Défis quotidiens",
    description: "Liste des défis du jour et de leurs récompenses en XP.",
  },
  [PlayerModuleKey.SUBSCRIPTION]: {
    title: "Abonnement aux questions",
    description: "Inscription à la réception de questions par e-mail.",
  },
  [PlayerModuleKey.LEADERBOARD]: {
    title: "Classement Ligue",
    description: "Classement des élèves par XP.",
  },
  [PlayerModuleKey.BOUTIQUE]: {
    title: "Boutique Récompenses",
    description: "Boutique d'échange des récompenses.",
  },
};
