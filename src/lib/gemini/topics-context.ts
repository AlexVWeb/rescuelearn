export type PromptTopic = {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  pageStart: number;
  pageEnd: number;
};

// Bloc de prompt qui cible la génération sur des sujets du référentiel
export function buildTopicsContext(
  topics: PromptTopic[],
  {
    withTopicId,
    itemLabel = "question",
  }: { withTopicId: boolean; itemLabel?: string }
): string {
  const lines = topics
    .map(
      (t) =>
        `- [id: ${t.id}] ${t.title} (pages ${t.pageStart}-${t.pageEnd}) : ${t.summary} Points clés : ${t.keyPoints.join(" ; ")}`
    )
    .join("\n");

  return `
CONTEXTE CIBLÉ :
Le document fourni ne contient que les pages utiles du référentiel. Sujets à couvrir (répartis les ${itemLabel}s équitablement, en proportion de leur richesse) :
${lines}
${withTopicId ? `Pour chaque ${itemLabel}, renseigne "topicId" avec l'id du sujet concerné.\n` : ""}`;
}
