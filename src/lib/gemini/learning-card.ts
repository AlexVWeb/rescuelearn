import { Type, type Schema } from "@google/genai";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";
import { withPdfPart } from "./pdf-part";
import { buildTopicsContext, type PromptTopic } from "./topics-context";

export function buildLearningCardPrompt(
  topic: string,
  cardCount: number,
  level?: string,
  topics?: PromptTopic[]
): string {
  const context = topics?.length
    ? buildTopicsContext(topics, { withTopicId: true, itemLabel: "carte" })
    : "";
  return `Tu es un expert en secourisme et pédagogie. Tu dois générer des cartes d'apprentissage sur le sujet "${topic}" à partir du référentiel PDF fourni.
Génère exactement ${cardCount} cartes d'apprentissage.${level ? ` Le niveau ciblé est "${level}".` : ""}

CONSIGNES STRICTES :
1. Ancrage factuel : Basse-toi uniquement sur le contenu du PDF fourni. N'invente aucune procédure, séquence, dosage ou information absente du document. Si le sujet demandé n'est pas couvert par le document, génère moins de cartes (ou aucune) plutôt que d'inventer des informations.
2. Langue : Les cartes d'apprentissage doivent être entièrement rédigées en français.
3. Format de chaque carte d'apprentissage :
   - "theme" : Le thème général ou la catégorie de la carte (Ex: "Arrêt Cardio-Respiratoire", "Hémorragies", "Traumatismes").
   - "niveau" : Le niveau de la carte (Ex: "Grand Public", "PSC1", "PSE1", "PSE2"). Utilise "${level || "Tous publics"}" par défaut.
   - "info" : L'explication pédagogique claire, concise, et synthétique décrivant le geste, la technique ou le point clé de la procédure.
   - "reference" : Référence précise à la page ou section du document (Ex: "Page 45", "Section 3.2").
${context}`;
}

export async function generateLearningCardsFromPdf({
  pdf,
  topic,
  cardCount,
  level,
  topics,
}: {
  pdf: Uint8Array;
  topic: string;
  cardCount: number;
  level?: string;
  topics?: PromptTopic[];
}) {
  const ai = getAiClient();

  const cardProperties: Record<string, Schema> = {
    theme: { type: Type.STRING },
    niveau: { type: Type.STRING },
    info: { type: Type.STRING },
    reference: { type: Type.STRING },
  };
  const cardRequired = ["theme", "niveau", "info", "reference"];
  if (topics?.length) {
    cardProperties.topicId = {
      type: Type.STRING,
      enum: topics.map((t) => t.id),
    };
    cardRequired.push("topicId");
  }

  return withPdfPart(pdf, async (pdfContentPart) => {
    const promptText = buildLearningCardPrompt(topic, cardCount, level, topics);

    const response = await retryWithBackoff(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [pdfContentPart, promptText],
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: cardProperties,
                  required: cardRequired,
                },
              },
            },
            required: ["cards"],
          },
        },
      })
    );

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No text response received from Gemini");
    }

    return JSON.parse(responseText);
  });
}
