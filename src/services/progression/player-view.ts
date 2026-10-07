import type { ProgressionExerciseType } from "@prisma/client";

// Mise en forme côté joueur : statut des nœuds, couleurs et exercices
// envoyés au client (sans les réponses).

export type NodeStatus = "completed" | "current" | "locked";

const THEME_COLORS = [
  "from-green-400 to-green-500 border-green-600 shadow-green-200",
  "from-blue-400 to-blue-500 border-blue-600 shadow-blue-200",
  "from-amber-400 to-amber-500 border-amber-600 shadow-amber-200",
  "from-purple-400 to-purple-500 border-purple-600 shadow-purple-200",
  "from-rose-400 to-rose-500 border-rose-600 shadow-rose-200",
  "from-cyan-400 to-cyan-500 border-cyan-600 shadow-cyan-200",
];

// Arbre proposé selon l'expérience déclarée à l'onboarding
export function levelForExperience(experience: string | null): string {
  if (experience === "intermediate") return "PSC";
  if (experience === "professional") return "PSE1";
  return "GQS";
}

// Filière gravie par le joueur ; le SST reste un parcours à part
export const LEVEL_CHAIN = ["GQS", "PSC", "PSE1", "PSE2"];

function isTreeCompleted(
  tree: { nodes: { id: string }[] },
  completedNodeIds: Set<string>
) {
  return (
    tree.nodes.length > 0 &&
    tree.nodes.every((node) => completedNodeIds.has(node.id))
  );
}

/**
 * Niveau courant : en partant du niveau d'onboarding, le joueur monte au
 * niveau suivant dès que son parcours est entièrement terminé, à condition
 * que le parcours suivant contienne des leçons.
 */
export function resolvePlayerLevel<
  T extends { level: string; nodes: { id: string }[] },
>(
  startLevel: string,
  trees: T[],
  completedNodeIds: Set<string>
): { tree: T; nextLevel: string | null } | null {
  const startIndex = LEVEL_CHAIN.indexOf(startLevel);
  const chain = startIndex >= 0 ? LEVEL_CHAIN.slice(startIndex) : [startLevel];

  let index = 0;
  let tree = trees.find((t) => t.level === chain[0]);
  if (!tree) return null;

  while (index + 1 < chain.length && isTreeCompleted(tree, completedNodeIds)) {
    const next = trees.find((t) => t.level === chain[index + 1]);
    if (!next || next.nodes.length === 0) break;
    tree = next;
    index++;
  }

  return { tree, nextLevel: chain[index + 1] ?? null };
}

export function themeColorForIndex(index: number): string {
  return THEME_COLORS[index % THEME_COLORS.length];
}

// Un nœud est jouable si c'est le premier ou si le précédent est terminé
export function nodeStatus(
  nodes: { id: string }[],
  index: number,
  completedNodeIds: Set<string>
): NodeStatus {
  if (completedNodeIds.has(nodes[index].id)) return "completed";
  if (index === 0 || completedNodeIds.has(nodes[index - 1].id)) {
    return "current";
  }
  return "locked";
}

type SessionExercise = {
  id: string;
  type: ProgressionExerciseType;
  order: number;
  courseTitle: string | null;
  courseContent: string | null;
  question: {
    id: number;
    text: string;
    options: { id: number; text: string }[];
  } | null;
  learningCard: {
    id: number;
    theme: string;
    niveau: string;
    info: string;
    reference: string;
  } | null;
};

export function toClientExercise(ex: SessionExercise) {
  if (ex.type === "QUIZ_QUESTION" && ex.question) {
    return {
      id: ex.id,
      type: ex.type,
      order: ex.order,
      question: {
        id: ex.question.id,
        text: ex.question.text,
        // Ni bonne réponse ni explication : révélées par answerExercise
        options: ex.question.options.map((o) => ({
          id: o.id,
          text: o.text,
        })),
      },
    };
  }
  if (ex.type === "FLASHCARD" && ex.learningCard) {
    return {
      id: ex.id,
      type: ex.type,
      order: ex.order,
      flashcard: {
        id: ex.learningCard.id,
        theme: ex.learningCard.theme,
        niveau: ex.learningCard.niveau,
        info: ex.learningCard.info,
        reference: ex.learningCard.reference,
      },
    };
  }
  return {
    id: ex.id,
    type: ex.type,
    order: ex.order,
    courseTitle: ex.courseTitle,
    courseContent: ex.courseContent,
  };
}
