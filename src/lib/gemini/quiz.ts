import { Type } from "@google/genai";
import { stat, readFile } from "fs/promises";
import { logger } from "../logger";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";

export function buildPrompt(
  topic: string,
  questionCount: number,
  level?: string,
  existingQuestions: string[] = [],
  existingTags: string[] = []
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

  return prompt;
}

export async function generateQuizFromPdf({
  pdfPath,
  topic,
  questionCount,
  level,
  existingQuestions = [],
  existingTags = [],
}: {
  pdfPath: string;
  topic: string;
  questionCount: number;
  level?: string;
  existingQuestions?: string[];
  existingTags?: string[];
}) {
  const ai = getAiClient();

  const fileStats = await stat(pdfPath);
  const fileSizeMB = fileStats.size / (1024 * 1024);

  let pdfContentPart:
    | Awaited<ReturnType<ReturnType<typeof getAiClient>["files"]["upload"]>>
    | { inlineData: { data: string; mimeType: string } };
  let fileUploadName: string | null = null;

  try {
    if (fileSizeMB >= 15) {
      logger.info(
        `PDF is large (${fileSizeMB.toFixed(2)} MB), uploading to Gemini Files API...`
      );
      const uploadResult = await ai.files.upload({
        file: pdfPath,
        config: {
          mimeType: "application/pdf",
        },
      });
      if (!uploadResult.name) {
        throw new Error("Upload failed: file name is undefined");
      }
      fileUploadName = uploadResult.name;

      // Poll until file is active
      let fileState = uploadResult.state;
      while (fileState === "PROCESSING") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const fileInfo = await ai.files.get({ name: uploadResult.name });
        fileState = fileInfo.state;
      }

      if (fileState !== "ACTIVE") {
        throw new Error(`Uploaded file is not active: ${fileState}`);
      }

      pdfContentPart = uploadResult;
    } else {
      logger.info(
        `PDF is small (${fileSizeMB.toFixed(2)} MB), sending inline...`
      );
      const pdfBuffer = await readFile(pdfPath);
      pdfContentPart = {
        inlineData: {
          data: pdfBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      };
    }

    const promptText = buildPrompt(
      topic,
      questionCount,
      level,
      existingQuestions,
      existingTags
    );

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
                  properties: {
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
                  },
                  required: [
                    "question",
                    "options",
                    "correctAnswer",
                    "explanation",
                    "tags",
                  ],
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
  } finally {
    if (fileUploadName) {
      try {
        logger.info(`Deleting file ${fileUploadName} from Gemini Files API...`);
        await ai.files.delete({ name: fileUploadName });
      } catch (err) {
        logger.error(`Failed to delete uploaded file ${fileUploadName}:`, err);
      }
    }
  }
}
