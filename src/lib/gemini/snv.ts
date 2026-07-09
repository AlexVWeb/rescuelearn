import { Type } from "@google/genai";
import { stat, readFile } from "fs/promises";
import { logger } from "../logger";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";

export function buildSNVScenarioPrompt(
  topic: string,
  victimCount: number,
  level?: string
): string {
  return `Tu es un expert en secourisme et catastrophes à nombreuses victimes. Tu dois générer un scénario de Situation à Nombreuses Victimes (SNV) sur le sujet "${topic}" à partir du référentiel PDF fourni.
Le scénario doit être adapté pour le niveau de formation "${level || "PSE1"}".

Génère un scénario complet contenant exactement ${victimCount} victimes.

CONSIGNES STRICTES :
1. Ancrage factuel : Basse-toi uniquement sur le contenu du PDF fourni pour les techniques de triage et de bilan. N'invente aucune procédure clinique qui contredit le référentiel.
2. Langue : Le scénario complet (titre, description globale, descriptions de victimes, explications) doit être entièrement rédigé en français.
3. Classification de triage (correctAnswer) :
   - Pour chaque victime, la propriété "correctAnswer" doit correspondre à l'index numérique suivant du tri médical :
     * 0 = Vert (Urgence Relative / Blessé léger / Impliqué)
     * 1 = Jaune (Urgence Relative / Blessé stable)
     * 2 = Rouge (Urgence Absolue / Détresse vitale)
     * 3 = Noir (Décédé)
4. Format de réponse JSON :
   - "title" : Titre court et descriptif du scénario (Ex: "Accident de bus en montagne").
   - "level" : Le niveau de formation ciblé. Utilise "${level || "PSE1"}".
   - "description" : Description globale de la situation d'urgence, du contexte et de l'environnement (Ex: "Un bus de transport régional a dérapé sur une plaque de verglas et s'est renversé...").
   - "victimes" : Tableau de victimes contenant :
      - "description" : Description clinique détaillée de l'état de la victime (Ex: "Victime consciente, se plaint de douleurs abdominales intenses, respiration rapide, pouls filant...").
      - "correctAnswer" : Index du tri de 0 à 3.
      - "explanation" : Explication pédagogique claire et concise justifiant le niveau de tri choisi en faisant référence au référentiel.
`;
}

export async function generateSNVScenarioFromPdf({
  pdfPath,
  topic,
  victimCount,
  level,
}: {
  pdfPath: string;
  topic: string;
  victimCount: number;
  level?: string;
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

    const promptText = buildSNVScenarioPrompt(topic, victimCount, level);

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
              level: { type: Type.STRING },
              description: { type: Type.STRING },
              victimes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    correctAnswer: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ["description", "correctAnswer", "explanation"],
                },
              },
            },
            required: ["title", "level", "description", "victimes"],
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
