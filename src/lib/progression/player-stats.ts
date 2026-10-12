import dayjs from "dayjs";

export const MAX_HEARTS = 5;
// Une vie est regagnée toutes les 4 heures, jusqu'au maximum.
export const HEART_REGEN_MS = 4 * 60 * 60 * 1000;

export interface HeartsState {
  hearts: number;
  heartsUpdatedAt: Date | null;
}

/**
 * Calcule le nombre de vies après régénération passive.
 * `heartsUpdatedAt` marque le début du cycle de recharge en cours ;
 * il vaut null quand les vies sont au maximum.
 */
export function regenerateHearts(
  state: HeartsState,
  now: Date = new Date()
): HeartsState & { changed: boolean } {
  const { hearts, heartsUpdatedAt } = state;

  if (hearts >= MAX_HEARTS) {
    return {
      hearts: MAX_HEARTS,
      heartsUpdatedAt: null,
      changed: hearts !== MAX_HEARTS || heartsUpdatedAt !== null,
    };
  }

  // Ancien compte sans date de cycle : on démarre le cycle maintenant.
  if (!heartsUpdatedAt) {
    return { hearts, heartsUpdatedAt: now, changed: true };
  }

  const elapsed = now.getTime() - heartsUpdatedAt.getTime();
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) {
    return { hearts, heartsUpdatedAt, changed: false };
  }

  const nextHearts = Math.min(MAX_HEARTS, hearts + gained);
  return {
    hearts: nextHearts,
    heartsUpdatedAt:
      nextHearts >= MAX_HEARTS
        ? null
        : new Date(heartsUpdatedAt.getTime() + gained * HEART_REGEN_MS),
    changed: true,
  };
}

/** Date à laquelle la prochaine vie sera regagnée, ou null si les vies sont pleines. */
export function nextHeartAt(state: HeartsState): Date | null {
  if (state.hearts >= MAX_HEARTS || !state.heartsUpdatedAt) return null;
  return new Date(state.heartsUpdatedAt.getTime() + HEART_REGEN_MS);
}

/**
 * Série affichée : la série stockée n'est remise à zéro qu'à la prochaine
 * leçon terminée, donc on la considère perdue si la dernière activité
 * date d'avant-hier ou plus.
 */
export function displayedStreak(
  streak: number,
  lastActiveAt: Date | null,
  now: Date = new Date()
): number {
  if (!lastActiveAt) return 0;
  const diffInDays = dayjs(now)
    .startOf("day")
    .diff(dayjs(lastActiveAt).startOf("day"), "day");
  return diffInDays > 1 ? 0 : streak;
}

/**
 * Série après une leçon terminée : +1 si la dernière activité date d'hier,
 * inchangée le même jour, remise à 1 après un jour manqué.
 */
export function nextStreak(
  streak: number,
  lastActiveAt: Date | null,
  now: Date = new Date()
): number {
  if (!lastActiveAt) return 1;
  const diffInDays = dayjs(now)
    .startOf("day")
    .diff(dayjs(lastActiveAt).startOf("day"), "day");
  if (diffInDays === 1) return streak + 1;
  if (diffInDays > 1) return 1;
  return streak;
}

export interface LessonStat {
  nodeId: string;
  title: string;
  score: number | null;
}

export interface ProgressionStats {
  completedNodes: number;
  totalNodes: number;
  averageScore: number | null;
  lessons: LessonStat[];
}

/**
 * Statistiques du parcours : seules les leçons de l'arbre courant comptent,
 * les plus récemment terminées en premier.
 */
export function computeProgressionStats(
  nodes: { id: string; title: string }[],
  progress: { nodeId: string; score: number | null; completedAt: Date }[],
  maxLessons = 5
): ProgressionStats {
  const titles = new Map(nodes.map((n) => [n.id, n.title]));
  const completed = progress
    .filter((p) => titles.has(p.nodeId))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

  const scores = completed
    .map((p) => p.score)
    .filter((s): s is number => s !== null);

  return {
    completedNodes: completed.length,
    totalNodes: nodes.length,
    averageScore:
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null,
    lessons: completed.slice(0, maxLessons).map((p) => ({
      nodeId: p.nodeId,
      title: titles.get(p.nodeId)!,
      score: p.score,
    })),
  };
}

/**
 * Score d'une leçon : seules les questions de quiz sont notées, les
 * micro-cours et fiches mémo ne comptent pas. Sans quiz, la leçon vaut 100 %.
 */
export function lessonScore(
  exercises: { type: string }[],
  correctAnswers: number
): number {
  const graded = exercises.filter((ex) => ex.type === "QUIZ_QUESTION").length;
  return graded > 0 ? Math.round((correctAnswers / graded) * 100) : 100;
}
