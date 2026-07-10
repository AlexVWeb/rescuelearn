import { Type, Schema } from "@google/genai";
import { stat, readFile } from "fs/promises";
import { logger } from "../logger";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";

export function buildProgressionPrompt(
  topic: string,
  structureConfig: {
    microCourseCount: number;
    quizCount: number;
    flashcardCount: number;
  },
  level?: string
): string {
  const requirements: string[] = [];
  const exerciseCounts: string[] = [];

  if (structureConfig.microCourseCount > 0) {
    exerciseCounts.push(
      `- ${structureConfig.microCourseCount} exercice${structureConfig.microCourseCount > 1 ? "s" : ""} de type "MICRO_COURSE"`
    );
    requirements.push(
      `   - MICRO_COURSE : Contient obligatoirement un titre "courseTitle" et le contenu théorique complet rédigé et détaillé au format Markdown dans "courseContent" (explications, étapes du geste, consignes de sécurité, etc.). Ne laisse jamais le champ "courseContent" vide.`
    );
  }
  if (structureConfig.quizCount > 0) {
    exerciseCounts.push(
      `- ${structureConfig.quizCount} exercice${structureConfig.quizCount > 1 ? "s" : ""} de type "QUIZ_QUESTION"`
    );
    requirements.push(
      `   - QUIZ_QUESTION : Contient une question sous "questionText", un tableau "options" d'exactement 4 choix, "correctAnswer" qui est l'index de la bonne réponse (0 à 3), et une "explanation" concise faisant référence au document.`
    );
  }
  if (structureConfig.flashcardCount > 0) {
    exerciseCounts.push(
      `- ${structureConfig.flashcardCount} exercice${structureConfig.flashcardCount > 1 ? "s" : ""} de type "FLASHCARD"`
    );
    requirements.push(
      `   - FLASHCARD : Contient un "flashcardTheme", un "flashcardInfo" (la notion clé à mémoriser), et une "flashcardReference" (le chapitre/la page du document).`
    );
  }

  const exercisesList = exerciseCounts.join("\n");
  const requirementsList = requirements.join("\n");

  return `Tu es un expert en secourisme et pédagogie. Tu dois générer une leçon/session d'apprentissage sur le sujet "${topic}" à partir du référentiel PDF fourni.
La leçon ciblera le niveau "${level || "GQS"}".

Tu dois générer exactement :
${exercisesList}

${exerciseCounts.length > 1 ? "Tu peux les entrelacer dans un ordre pédagogiquement logique (ex: commencer par le micro-cours théorique, suivi de questions de quiz pour valider la compréhension, puis finir par des flashcards de mémorisation)." : ""}

CONSIGNES STRICTES :
1. Ancrage factuel : Basse-toi uniquement sur le contenu du PDF fourni. N'invente aucune procédure ou information absente.
2. Langue : Tout doit être rédigé en français.
3. Remplissage des champs : Pour chaque exercice généré, renseigne UNIQUEMENT les champs correspondant à son type (ex: "courseTitle" et "courseContent" pour un MICRO_COURSE) et laisse absolument tous les autres champs (ex: "explanation", "questionText", "options", etc.) vides ou non définis. Ne mets pas le contenu du cours dans "explanation".
4. Formats d'exercices :
${requirementsList}
`;
}

export async function generateProgressionNodeFromPdf({
  pdfPath,
  topic,
  structureConfig,
  level,
}: {
  pdfPath: string;
  topic: string;
  structureConfig: {
    microCourseCount: number;
    quizCount: number;
    flashcardCount: number;
  };
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

    const promptText = buildProgressionPrompt(topic, structureConfig, level);

    const exerciseProperties: Record<string, Schema> = {
      type: {
        type: Type.STRING,
        enum: [
          ...(structureConfig.microCourseCount > 0 ? ["MICRO_COURSE"] : []),
          ...(structureConfig.quizCount > 0 ? ["QUIZ_QUESTION"] : []),
          ...(structureConfig.flashcardCount > 0 ? ["FLASHCARD"] : []),
        ],
      },
    };
    const exerciseRequired = ["type"];

    if (structureConfig.microCourseCount > 0) {
      exerciseProperties.courseTitle = { type: Type.STRING };
      exerciseProperties.courseContent = { type: Type.STRING };
      if (
        structureConfig.quizCount === 0 &&
        structureConfig.flashcardCount === 0
      ) {
        exerciseRequired.push("courseTitle", "courseContent");
      }
    }
    if (structureConfig.quizCount > 0) {
      exerciseProperties.questionText = { type: Type.STRING };
      exerciseProperties.options = {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      };
      exerciseProperties.correctAnswer = { type: Type.INTEGER };
      exerciseProperties.explanation = { type: Type.STRING };
      if (
        structureConfig.microCourseCount === 0 &&
        structureConfig.flashcardCount === 0
      ) {
        exerciseRequired.push("questionText", "options", "correctAnswer");
      }
    }
    if (structureConfig.flashcardCount > 0) {
      exerciseProperties.flashcardTheme = { type: Type.STRING };
      exerciseProperties.flashcardInfo = { type: Type.STRING };
      exerciseProperties.flashcardReference = { type: Type.STRING };
      if (
        structureConfig.microCourseCount === 0 &&
        structureConfig.quizCount === 0
      ) {
        exerciseRequired.push(
          "flashcardTheme",
          "flashcardInfo",
          "flashcardReference"
        );
      }
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
              description: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: exerciseProperties,
                  required: exerciseRequired,
                },
              },
            },
            required: ["title", "description", "exercises"],
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

export function buildEntireTreePrompt(level: string, topic: string): string {
  return `Tu es un expert en secourisme et pédagogie. Tu dois concevoir l'intégralité d'un parcours d'apprentissage (arbre de progression de leçons) sur le sujet général "${topic}" pour la formation de niveau "${level}".
Le parcours doit être basé uniquement sur le contenu factuel du référentiel PDF fourni.

Génère entre 4 et 6 étapes (nœuds de progression) ordonnées de manière logique et progressive (ex: Étape 1 : Protection et Alerte, Étape 2 : Hémorragies, Étape 3 : Obstruction des voies aériennes, etc.).

Pour chaque étape, tu dois définir :
- Un titre "title"
- Une description "description"
- Une récompense en XP "xpReward" (ex: entre 50 et 150)
- Une liste ordonnée d'exercices "exercises" (entre 2 et 4 exercices par étape) de type :
  - MICRO_COURSE : "courseTitle" et le cours complet détaillé rédigé au format Markdown dans "courseContent". Ce cours doit être riche en explications pédagogiques basées sur le PDF. Ne laisse jamais "courseContent" vide.
  - QUIZ_QUESTION : "questionText", "options" (4 choix), "correctAnswer" (index 0-3), "explanation".
  - FLASHCARD : "flashcardTheme", "flashcardInfo", "flashcardReference".

Toutes les explications et contenus rédigés doivent être en français.
`;
}

export async function generateEntireTreeFromPdf({
  pdfPath,
  level,
  topic,
}: {
  pdfPath: string;
  level: string;
  topic: string;
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

    const promptText = buildEntireTreePrompt(level, topic);

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
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    xpReward: { type: Type.INTEGER },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: {
                            type: Type.STRING,
                            enum: [
                              "MICRO_COURSE",
                              "QUIZ_QUESTION",
                              "FLASHCARD",
                            ],
                          },
                          // Micro-cours
                          courseTitle: { type: Type.STRING },
                          courseContent: { type: Type.STRING },
                          // Quiz
                          questionText: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          correctAnswer: { type: Type.INTEGER },
                          explanation: { type: Type.STRING },
                          // Flashcard
                          flashcardTheme: { type: Type.STRING },
                          flashcardInfo: { type: Type.STRING },
                          flashcardReference: { type: Type.STRING },
                        },
                        required: ["type"],
                      },
                    },
                  },
                  required: ["title", "description", "xpReward", "exercises"],
                },
              },
            },
            required: ["nodes"],
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
