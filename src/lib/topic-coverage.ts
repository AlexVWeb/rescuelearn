// Seuil sous lequel un sujet est considéré comme « trou » de couverture
export const COVERAGE_GAP_THRESHOLD = 0.5;

export function topicCoverage(questionCount: number, capacity: number): number {
  if (capacity <= 0) return 1;
  return Math.min(1, questionCount / capacity);
}

export function remainingCapacity(
  questionCount: number,
  capacity: number
): number {
  return Math.max(0, capacity - questionCount);
}

// Nombre maximum de sujets par génération (taille du prompt et des pages envoyées)
export const MAX_TOPICS_PER_GENERATION = 10;

const DEFAULT_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 30;

/**
 * Nombre de questions proposé pour une sélection de sujets : la capacité
 * restante cumulée, plafonnée à 30. Si tout est déjà couvert, valeur par défaut.
 */
export function suggestedQuestionCount(
  topics: { questionCount: number; capacity: number }[]
): number {
  const remaining = topics.reduce(
    (sum, t) => sum + remainingCapacity(t.questionCount, t.capacity),
    0
  );
  if (remaining === 0) return DEFAULT_QUESTION_COUNT;
  return Math.min(MAX_QUESTION_COUNT, remaining);
}
