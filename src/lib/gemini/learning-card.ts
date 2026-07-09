import { Type } from "@google/genai";
import { stat, readFile } from "fs/promises";
import { logger } from "../logger";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";

export function buildLearningCardPrompt(
  topic: string,
  cardCount: number,
  level?: string
): string {
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
`;
}

export async function generateLearningCardsFromPdf({
  pdfPath,
  topic,
  cardCount,
  level,
}: {
  pdfPath: string;
  topic: string;
  cardCount: number;
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

    const promptText = buildLearningCardPrompt(topic, cardCount, level);

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
                  properties: {
                    theme: { type: Type.STRING },
                    niveau: { type: Type.STRING },
                    info: { type: Type.STRING },
                    reference: { type: Type.STRING },
                  },
                  required: ["theme", "niveau", "info", "reference"],
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
