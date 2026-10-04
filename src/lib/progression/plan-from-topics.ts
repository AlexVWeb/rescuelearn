export type PlannableTopic = {
  id: string;
  chapter: string;
  title: string;
  order: number;
  levels: string[];
  questionCapacity: number;
};

export type PlannedNode = { title: string; topicIds: string[] };

const MAX_TOPICS_PER_NODE = 3;
// Un sujet assez riche pour remplir une leçon à lui seul
const RICH_TOPIC_CAPACITY = 12;

// Découpe n sujets en paquets équilibrés de 3 au plus (4 → 2+2, 7 → 3+2+2)
function balancedChunks<T>(items: T[]): T[][] {
  const count = Math.ceil(items.length / MAX_TOPICS_PER_NODE);
  const base = Math.floor(items.length / count);
  const extra = items.length % count;
  const chunks: T[][] = [];
  let start = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    chunks.push(items.slice(start, start + size));
    start += size;
  }
  return chunks;
}

/**
 * Filtre par niveau, trie par order, regroupe des sujets consécutifs du même
 * chapitre en nœuds de 1 à 3 sujets. Un sujet riche (capacity >= 12) reste seul.
 * Un sujet sans niveau est considéré comme commun à tous les niveaux.
 */
export function planNodesFromTopics(
  topics: PlannableTopic[],
  level: string
): PlannedNode[] {
  const sorted = topics
    .filter((t) => t.levels.length === 0 || t.levels.includes(level))
    .sort((a, b) => a.order - b.order);

  // Groupes de sujets à traiter ensemble : suites d'un même chapitre, sujets riches isolés
  const runs: PlannableTopic[][] = [];
  let run: PlannableTopic[] = [];
  const flush = () => {
    if (run.length) runs.push(...balancedChunks(run));
    run = [];
  };
  for (const topic of sorted) {
    if (topic.questionCapacity >= RICH_TOPIC_CAPACITY) {
      flush();
      runs.push([topic]);
      continue;
    }
    if (run.length && run[0].chapter !== topic.chapter) flush();
    run.push(topic);
  }
  flush();

  const chapterTitleCount = new Map<string, number>();
  return runs.map((group) => {
    if (group.length === 1) {
      return { title: group[0].title, topicIds: [group[0].id] };
    }
    const chapter = group[0].chapter;
    const count = (chapterTitleCount.get(chapter) ?? 0) + 1;
    chapterTitleCount.set(chapter, count);
    return {
      title: count > 1 ? `${chapter} (${count})` : chapter,
      topicIds: group.map((t) => t.id),
    };
  });
}
