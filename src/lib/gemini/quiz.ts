import { Type, type Schema } from "@google/genai";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";
import { withPdfPart } from "./pdf-part";
import { buildTopicsContext, type PromptTopic } from "./topics-context";

export function buildPrompt(
  topic: string,
  questionCount: number,
  level?: string,
  existingQuestions: string[] = [],
  existingTags: string[] = [],
  topics?: PromptTopic[]
): string {
  let prompt = `Tu es un expert en secourisme et pédagogie. Tu dois générer un quiz sur le sujet "${topic}" à partir du référentiel PDF fourni.
Génère exactement ${questionCount} questions.${level ? ` Le niveau ciblé est "${level}".` : ""}

CONSIGNES STRICTES :
1. Ancrage factuel : Basse-toi uniquement sur le contenu du PDF fourni. N'invente aucune procédure, séquence, dosage ou information absente du document. Si le sujet demandé n'est pas couvert par le document, génère moins de questions (ou aucune) plutôt que d'inventer des informations.
2. Langue : Le quiz entier (titre, questions, options, explications, tags) doit être rédigé en français.
3. Format des questions :
   - Chaque question doit proposer exactement 4 options. Une seule option doit être correcte.
   - "correctAnswer" doit être l'index 0-based de la réponse correcte dans le tableau "options" (0 = A, 1 = B, 2 = C, 3 = D).
   - Fournis une explication concise et claire justifiant la bonne réponse en faisant explicitement référence au document.
4. Système de tags :
   - Associe à chaque question un tableau de tags pertinents (ex: ["ACR", "Réanimation", "AVC", "Hémorragie", "Brancardage"]).
   - Liste de tags déjà existants dans le système : ${JSON.stringify(existingTags)}.
   - Réutilise EN PRIORITÉ les tags de cette liste s'ils sont pertinents. Ne crée un nouveau tag que si aucun tag existant ne correspond au sujet de la question.
`;

  if (existingQuestions.length > 0) {
    prompt += `\n5. Anti-duplication :
   - Ne génère pas de questions similaires ou identiques aux questions déjà existantes suivantes :
   ${existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}
`;
  }

  if (topics?.length) {
    prompt += buildTopicsContext(topics, { withTopicId: true });
  }

  return prompt;
}

export async function generateQuizFromPdf({
  pdf,
  topic,
  questionCount,
  level,
  existingQuestions = [],
  existingTags = [],
  topics,
}: {
  pdf: Uint8Array;
  topic: string;
  questionCount: number;
  level?: string;
  existingQuestions?: string[];
  existingTags?: string[];
  topics?: PromptTopic[];
}) {
  const ai = getAiClient();

  return withPdfPart(pdf, async (pdfContentPart) => {
    const promptText = buildPrompt(
      topic,
      questionCount,
      level,
      existingQuestions,
      existingTags,
      topics
    );

    const questionProperties: Record<string, Schema> = {
      question: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      correctAnswer: { type: Type.INTEGER },
      explanation: { type: Type.STRING },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    };
    const questionRequired = [
      "question",
      "options",
      "correctAnswer",
      "explanation",
      "tags",
    ];
    if (topics?.length) {
      questionProperties.topicId = {
        type: Type.STRING,
        enum: topics.map((t) => t.id),
      };
      questionRequired.push("topicId");
    }

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
              title: { type: Type.STRING },
              timePerQuestion: { type: Type.INTEGER },
              passingScore: { type: Type.INTEGER },
              modeRandom: { type: Type.BOOLEAN },
              level: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: questionProperties,
                  required: questionRequired,
                },
              },
            },
            required: [
              "title",
              "timePerQuestion",
              "passingScore",
              "modeRandom",
              "questions",
            ],
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
