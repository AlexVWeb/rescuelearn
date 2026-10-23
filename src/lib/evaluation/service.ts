import { prisma } from "@/lib/prisma";
import {
  checkEvaluationEligibility,
  type EvaluationDenial,
} from "./eligibility";
import {
  EVALUATION_TYPES,
  getCurrentQuestionnaire,
  getQuestionnaire,
  type EvaluationType,
  type Questionnaire,
} from "./questionnaires";
import { parseStoredAnswers, type EvaluationAnswers } from "./schemas";
import {
  getEvaluationWindow,
  getSessionEnd,
  getWindowState,
  type EvaluationWindow,
  type EvaluationWindowState,
} from "./window";

// État des évaluations d'une inscription, lu côté serveur uniquement.

export const RESPONSE_STATUS = {
  BROUILLON: "brouillon",
  SOUMISE: "soumise",
} as const;

export interface EvaluationInscription {
  id: string;
  trainee: { isAnonymized: boolean };
  trainingSession: { id: string; status: string };
}

export interface EvaluationContext {
  type: EvaluationType;
  questionnaire: Questionnaire;
  window: EvaluationWindow | null;
  state: EvaluationWindowState | null;
  denial: EvaluationDenial | null;
  response: {
    status: string;
    submittedAt: Date | null;
    answers: EvaluationAnswers;
  } | null;
}

export async function getEvaluationContexts(
  inscription: EvaluationInscription,
  now: Date = new Date()
): Promise<EvaluationContext[]> {
  const [slots, emargements, responses] = await Promise.all([
    prisma.slot.findMany({
      where: { trainingSessionId: inscription.trainingSession.id },
      select: { date: true, startTime: true, endTime: true },
    }),
    prisma.emargement.findMany({
      where: { inscriptionId: inscription.id },
      select: { status: true },
    }),
    prisma.evaluationResponse.findMany({
      where: { inscriptionId: inscription.id },
    }),
  ]);

  const sessionEnd = getSessionEnd(slots);
  const denial = checkEvaluationEligibility({
    sessionStatus: inscription.trainingSession.status,
    isAnonymized: inscription.trainee.isAnonymized,
    emargementStatuses: emargements.map((e) => e.status),
    sessionEnd,
  });

  return EVALUATION_TYPES.map((type) => {
    const stored = responses.find((response) => response.type === type);
    // Une réponse commencée garde la version de son questionnaire
    const questionnaire =
      (stored && getQuestionnaire(stored.version)) ??
      getCurrentQuestionnaire(type);
    const window = sessionEnd ? getEvaluationWindow(type, sessionEnd) : null;

    return {
      type,
      questionnaire,
      window,
      state: window ? getWindowState(window, now) : null,
      denial,
      response: stored
        ? {
            status: stored.status,
            submittedAt: stored.submittedAt,
            answers: parseStoredAnswers(questionnaire, stored.answers),
          }
        : null,
    };
  });
}

export async function getEvaluationContext(
  inscription: EvaluationInscription,
  type: EvaluationType,
  now: Date = new Date()
): Promise<EvaluationContext> {
  const contexts = await getEvaluationContexts(inscription, now);
  const context = contexts.find((c) => c.type === type);
  if (!context) throw new Error(`Type d'évaluation inconnu : ${type}`);
  return context;
}
