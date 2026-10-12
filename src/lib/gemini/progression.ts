import { Type, Schema } from "@google/genai";
import { getAiClient, retryWithBackoff, GEMINI_MODEL } from "./client";
import { logger } from "../logger";
import { withPdfPart } from "./pdf-part";
import { buildTopicsContext, type PromptTopic } from "./topics-context";
import type { AiGeneratedExercise } from "@/types/progression";

type StructureConfig = {
  microCourseCount: number;
  quizCount: number;
  flashcardCount: number;
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? "s" : ""}`;

export function buildProgressionPrompt(
  topic: string,
  structureConfig: StructureConfig,
  level?: string,
  topics?: PromptTopic[]
): string {
  const sections: string[] = [];

  if (structureConfig.microCourseCount > 0) {
    sections.push(
      `- "microCourses" : ${plural(structureConfig.microCourseCount, "micro-cours")}. Chacun a un titre "courseTitle" et le contenu théorique complet rédigé et détaillé au format Markdown dans "courseContent" (explications, étapes du geste, consignes de sécurité, etc.). "courseContent" ne doit jamais être vide.`
    );
  }
  if (structureConfig.quizCount > 0) {
    sections.push(
      `- "quizzes" : ${plural(structureConfig.quizCount, "question")} de quiz. Chacune a une question "questionText", un tableau "options" d'exactement 4 choix, "correctAnswer" qui est l'index de la bonne réponse (0 à 3), et une "explanation" concise faisant référence au document.`
    );
  }
  if (structureConfig.flashcardCount > 0) {
    sections.push(
      `- "flashcards" : ${plural(structureConfig.flashcardCount, "flashcard")}. Chacune a un "flashcardTheme", un "flashcardInfo" (la notion clé à mémoriser, jamais vide), et une "flashcardReference" (le chapitre/la page du document).`
    );
  }

  return `Tu es un expert en secourisme et pédagogie. Tu dois générer une leçon/session d'apprentissage sur le sujet "${topic}" à partir du référentiel PDF fourni.
La leçon ciblera le niveau "${level || "GQS"}".

Tu dois remplir exactement :
${sections.join("\n")}

Les questions de quiz valident la compréhension du micro-cours, les flashcards fixent les notions clés à mémoriser.

CONSIGNES STRICTES :
1. Ancrage factuel : Base-toi uniquement sur le contenu du PDF fourni. N'invente aucune procédure ou information absente.
2. Langue : Tout doit être rédigé en français.
3. Complétude : Tous les champs décrits ci-dessus sont obligatoires et ne doivent jamais être vides.
${topics?.length ? buildTopicsContext(topics, { withTopicId: false }) : ""}`;
}

const MAX_INCOMPLETE_ATTEMPTS = 3;

type GeneratedExercise = {
  type?: string;
  courseContent?: string;
  questionText?: string;
  options?: unknown[];
  correctAnswer?: number;
  flashcardInfo?: string;
};

const isFilled = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Le schéma de réponse est commun à tous les types d'exercice : Gemini ne peut
 * donc pas y imposer les champs de chaque type et renvoie parfois un quiz sans
 * options. Retourne la description du premier exercice incomplet, ou null.
 */
export function findIncompleteExercise(
  exercises: GeneratedExercise[]
): string | null {
  for (const [index, ex] of exercises.entries()) {
    const label = `exercice ${index + 1} (${ex.type})`;
    if (ex.type === "QUIZ_QUESTION") {
      if (!isFilled(ex.questionText)) return `${label} : question vide`;
      if (
        !Array.isArray(ex.options) ||
        ex.options.length !== 4 ||
        !ex.options.every(isFilled)
      ) {
        return `${label} : options manquantes`;
      }
      if (
        !Number.isInteger(ex.correctAnswer) ||
        ex.correctAnswer! < 0 ||
        ex.correctAnswer! > 3
      ) {
        return `${label} : bonne réponse invalide`;
      }
    }
    if (ex.type === "MICRO_COURSE" && !isFilled(ex.courseContent)) {
      return `${label} : cours vide`;
    }
    if (ex.type === "FLASHCARD" && !isFilled(ex.flashcardInfo)) {
      return `${label} : fiche vide`;
    }
  }
  return null;
}

// Relance la génération tant qu'un exercice revient incomplet
async function generateUntilComplete<T>(
  generate: () => Promise<T>,
  getExercises: (result: T) => GeneratedExercise[]
): Promise<T> {
  let problem = "";
  for (let attempt = 1; attempt <= MAX_INCOMPLETE_ATTEMPTS; attempt++) {
    const result = await generate();
    const incomplete = findIncompleteExercise(getExercises(result));
    if (!incomplete) return result;
    problem = incomplete;
    logger.warn(
      `Gemini a renvoyé un exercice incomplet (${problem}), tentative ${attempt}/${MAX_INCOMPLETE_ATTEMPTS}`
    );
  }
  throw new Error(
    `Génération IA incomplète après plusieurs essais : ${problem}`
  );
}

// Un tableau typé par sorte d'exercice : contrairement à un tableau mixte, le
// schéma peut y imposer chaque champ (Gemini omettait sinon courseContent ou
// options). Les exercices sont ensuite remis dans l'ordre pédagogique.
function buildProgressionSchema(structureConfig: StructureConfig): Schema {
  const properties: Record<string, Schema> = {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
  };
  const required = ["title", "description"];
  const array = (
    count: number,
    itemProperties: Record<string, Schema>,
    itemRequired: string[]
  ): Schema => ({
    type: Type.ARRAY,
    minItems: String(count),
    maxItems: String(count),
    items: {
      type: Type.OBJECT,
      properties: itemProperties,
      required: itemRequired,
    },
  });

  if (structureConfig.microCourseCount > 0) {
    properties.microCourses = array(
      structureConfig.microCourseCount,
      {
        courseTitle: { type: Type.STRING },
        courseContent: { type: Type.STRING },
      },
      ["courseTitle", "courseContent"]
    );
    required.push("microCourses");
  }
  if (structureConfig.quizCount > 0) {
    properties.quizzes = array(
      structureConfig.quizCount,
      {
        questionText: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          minItems: "4",
          maxItems: "4",
          items: { type: Type.STRING },
        },
        correctAnswer: { type: Type.INTEGER },
        explanation: { type: Type.STRING },
      },
      ["questionText", "options", "correctAnswer", "explanation"]
    );
    required.push("quizzes");
  }
  if (structureConfig.flashcardCount > 0) {
    properties.flashcards = array(
      structureConfig.flashcardCount,
      {
        flashcardTheme: { type: Type.STRING },
        flashcardInfo: { type: Type.STRING },
        flashcardReference: { type: Type.STRING },
      },
      ["flashcardTheme", "flashcardInfo", "flashcardReference"]
    );
    required.push("flashcards");
  }

  return { type: Type.OBJECT, properties, required };
}

type ProgressionAiResponse = {
  title?: string;
  description?: string;
  microCourses?: Omit<AiGeneratedExercise, "type">[];
  quizzes?: Omit<AiGeneratedExercise, "type">[];
  flashcards?: Omit<AiGeneratedExercise, "type">[];
};

// Cours, puis quiz, puis flashcards : format exercises attendu par les appelants
export function toProgressionLesson(response: ProgressionAiResponse): {
  title: string;
  description: string;
  exercises: AiGeneratedExercise[];
} {
  return {
    title: response.title ?? "",
    description: response.description ?? "",
    exercises: [
      ...(response.microCourses ?? []).map((ex) => ({
        ...ex,
        type: "MICRO_COURSE" as const,
      })),
      ...(response.quizzes ?? []).map((ex) => ({
        ...ex,
        type: "QUIZ_QUESTION" as const,
      })),
      ...(response.flashcards ?? []).map((ex) => ({
        ...ex,
        type: "FLASHCARD" as const,
      })),
    ],
  };
}

export async function generateProgressionNodeFromPdf({
  pdf,
  topic,
  structureConfig,
  level,
  topics,
}: {
  pdf: Uint8Array;
  topic: string;
  structureConfig: StructureConfig;
  level?: string;
  topics?: PromptTopic[];
}) {
  const ai = getAiClient();
  return withPdfPart(pdf, async (pdfContentPart) => {
    const promptText = buildProgressionPrompt(
      topic,
      structureConfig,
      level,
      topics
    );
    const responseSchema = buildProgressionSchema(structureConfig);

    const generate = async () => {
      const response = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [pdfContentPart, promptText],
          config: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema,
          },
        })
      );

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini");
      }

      return toProgressionLesson(JSON.parse(responseText));
    };

    return generateUntilComplete(generate, (result) => result.exercises);
  });
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
  pdf,
  level,
  topic,
}: {
  pdf: Uint8Array;
  level: string;
  topic: string;
}) {
  const ai = getAiClient();
  return withPdfPart(pdf, async (pdfContentPart) => {
    const promptText = buildEntireTreePrompt(level, topic);

    const generate = async () => {
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
    };

    return generateUntilComplete(generate, (result) =>
      Array.isArray(result?.nodes)
        ? result.nodes.flatMap((node: { exercises?: GeneratedExercise[] }) =>
            Array.isArray(node.exercises) ? node.exercises : []
          )
        : []
    );
  });
}
