import { Type, type Schema } from "@google/genai";
import type { AnalysisBatch, Chapter } from "../pdf/chapters";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";
import { withPdfPart } from "./pdf-part";

export const SUGGESTED_FORMATS = [
  "QUIZ",
  "MICRO_COURSE",
  "FLASHCARD",
  "MINI_GAME",
] as const;

export type AnalyzedTopic = {
  chapter: string;
  title: string;
  summary: string;
  keyPoints: string[];
  pageStart: number; // relatif à l'extrait (1-based)
  pageEnd: number;
  levels?: string[];
  questionCapacity: number;
  suggestedFormats: string[];
};

export function buildChapterPlanPrompt(): string {
  return `Tu es un expert en secourisme et en ingénierie pédagogique.
Liste les chapitres du référentiel PDF fourni avec leurs pages de début et de fin (numéros de page du PDF, 1-based, pas la pagination imprimée).
Entre 5 et 40 chapitres, dans l'ordre du document, sans recouvrement. Ignore la page de garde, le sommaire et l'index. Titres en français, tels qu'ils apparaissent dans le document.`;
}

export function buildTopicsPrompt({
  referencielTitle,
  batch,
  levels,
}: {
  referencielTitle: string;
  batch: AnalysisBatch;
  levels: string[];
}): string {
  const toRelative = (page: number) => page - batch.pageStart + 1;
  const sections = batch.sections
    .map(
      (s) =>
        `- pages ${toRelative(s.pageStart)} à ${toRelative(s.pageEnd)} : ${s.title}`
    )
    .join("\n");
  const levelRule =
    levels.length > 1
      ? `\n- "levels" : sous-ensemble de ${JSON.stringify(levels)} indiquant à quelle(s) formation(s) le sujet appartient (d'après les mentions explicites du document ; si non précisé, mets tous les niveaux).`
      : "";

  return `Tu es un expert en secourisme et en ingénierie pédagogique.
Le document fourni est un extrait du référentiel "${referencielTitle}" : pages ${batch.pageStart} à ${batch.pageEnd} du référentiel complet. La page 1 de l'extrait correspond à la page ${batch.pageStart}.

Sections de l'extrait (d'après le sommaire du PDF, pages de l'extrait) :
${sections}

Découpe cet extrait en sujets pédagogiques au niveau "fiche technique" : un sujet = une notion, un geste ou une conduite à tenir autonome (ex : "Garrot", "Compression manuelle", "PLS chez l'adulte"). Ignore sommaires, pages de garde, index, glossaires, listes d'abréviations, annexes administratives et pages blanches.

Pour chaque sujet :
- "chapter" : nom court de la grande partie thématique du référentiel à laquelle appartient le sujet (ex : "Bilans", "Urgences vitales", "Traumatismes"), sans code ni numéro de version. Utilise exactement le même nom pour tous les sujets d'une même partie.
- "title" : titre court, tel qu'il apparaît dans le document si possible, sans code ni numéro de version.
- "summary" : 2 à 4 phrases factuelles.
- "keyPoints" : 3 à 8 notions clés à retenir (chiffres, étapes, critères).
- "pageStart" / "pageEnd" : pages DE L'EXTRAIT (1-based) couvrant le sujet.
- "questionCapacity" : nombre de questions QCM distinctes et non triviales que le contenu permet (1 à 30).
- "suggestedFormats" : parmi ${JSON.stringify(SUGGESTED_FORMATS)} ; MINI_GAME uniquement si le sujet décrit une procédure ordonnée.${levelRule}

Règles : uniquement le contenu du document, rien d'inventé. Tout en français. Si l'extrait ne contient aucun contenu pédagogique, renvoie une liste vide.`;
}

function buildTopicsSchema(levels: string[]): Schema {
  const properties: Record<string, Schema> = {
    chapter: { type: Type.STRING },
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    pageStart: { type: Type.INTEGER },
    pageEnd: { type: Type.INTEGER },
    questionCapacity: { type: Type.INTEGER },
    suggestedFormats: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: [...SUGGESTED_FORMATS] },
    },
  };
  const required = [
    "chapter",
    "title",
    "summary",
    "keyPoints",
    "pageStart",
    "pageEnd",
    "questionCapacity",
    "suggestedFormats",
  ];
  if (levels.length > 1) {
    properties.levels = {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: levels },
    };
    required.push("levels");
  }

  return {
    type: Type.OBJECT,
    properties: {
      topics: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties, required },
      },
    },
    required: ["topics"],
  };
}

async function generateJson<T>(
  pdf: Uint8Array,
  prompt: string,
  responseSchema: Schema
): Promise<T> {
  const ai = getAiClient();
  return withPdfPart(pdf, async (pdfPart) => {
    const response = await retryWithBackoff(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [pdfPart, prompt],
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema,
        },
      })
    );
    if (!response.text) {
      throw new Error("No text response received from Gemini");
    }
    return JSON.parse(response.text) as T;
  });
}

// Repli quand le PDF n'a pas de signets exploitables
export async function analyzeChapterPlan(pdf: Uint8Array): Promise<Chapter[]> {
  const result = await generateJson<{ chapters: Chapter[] }>(
    pdf,
    buildChapterPlanPrompt(),
    {
      type: Type.OBJECT,
      properties: {
        chapters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pageStart: { type: Type.INTEGER },
              pageEnd: { type: Type.INTEGER },
            },
            required: ["title", "pageStart", "pageEnd"],
          },
        },
      },
      required: ["chapters"],
    }
  );
  return result.chapters ?? [];
}

// pdf = extrait du lot seulement
export async function analyzeChapterTopics({
  pdf,
  referencielTitle,
  batch,
  levels,
}: {
  pdf: Uint8Array;
  referencielTitle: string;
  batch: AnalysisBatch;
  levels: string[];
}): Promise<AnalyzedTopic[]> {
  const result = await generateJson<{ topics: AnalyzedTopic[] }>(
    pdf,
    buildTopicsPrompt({ referencielTitle, batch, levels }),
    buildTopicsSchema(levels)
  );
  return result.topics ?? [];
}
