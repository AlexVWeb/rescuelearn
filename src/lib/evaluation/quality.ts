import dayjs from "dayjs";
import { MIN_RESPONSES_FOR_DETAIL } from "./aggregates";
import { checkEvaluationEligibility } from "./eligibility";
import {
  EVALUATION_TYPES,
  getCurrentQuestionnaire,
  type EvaluationType,
} from "./questionnaires";
import { parseStoredAnswers, type EvaluationAnswers } from "./schemas";
import { getEvaluationWindow, getSessionEnd, getWindowState } from "./window";

// Indicateurs qualité exprimés en personnes, pour être lus sans connaître
// l'échelle : « 46 stagiaires sur 50 satisfaits ». Même seuil d'anonymat que
// la page session : aucun pourcentage sous 5 réponses.

const SATISFACTION_QUESTION = "satisfaction_globale";
const USEFULNESS_QUESTION = "utilite";
// Notes 3 et 4 de l'échelle forcée : « satisfait », « plutôt d'accord » et plus
const POSITIVE_NOTE = 3;
// Une session est à regarder dès qu'un stagiaire sur 4 n'est pas satisfait
export const DISSATISFIED_ALERT_SHARE = 0.25;
const OVERVIEW_MONTHS = 12;
const MAX_SESSIONS_TO_REVIEW = 5;

export interface QualitySessionInput {
  id: string;
  title: string;
  status: string;
  slots: { date: Date; startTime: string; endTime: string }[];
  inscriptions: {
    trainee: { isAnonymized: boolean };
    emargements: { status: string }[];
    evaluationResponses: { type: string; version: string; answers: unknown }[];
  }[];
}

/** Part de réponses positives ; `share` est null sous le seuil d'anonymat. */
export interface PositiveShare {
  count: number;
  positive: number;
  share: number | null;
}

export interface SessionToReview {
  id: string;
  title: string;
  dissatisfied: number;
  count: number;
}

export interface QualityOverview {
  satisfaction: PositiveShare;
  usefulness: PositiveShare;
  // Stagiaires dont l'évaluation est ouverte aujourd'hui et non envoyée
  awaitingAnswer: number;
  sessionsToReview: SessionToReview[];
}

export interface EvaluationQuality {
  bySession: Record<string, PositiveShare>;
  overview: QualityOverview;
}

interface CollectedSession {
  session: QualitySessionInput;
  end: Date | null;
  eligibleCount: number;
  answers: Record<EvaluationType, EvaluationAnswers[]>;
}

function collect(session: QualitySessionInput): CollectedSession {
  const end = getSessionEnd(session.slots);
  const eligible = session.inscriptions.filter(
    (inscription) =>
      !checkEvaluationEligibility({
        sessionStatus: session.status,
        isAnonymized: inscription.trainee.isAnonymized,
        emargementStatuses: inscription.emargements.map((e) => e.status),
        sessionEnd: end,
      })
  );

  const answersOf = (type: EvaluationType) => {
    const questionnaire = getCurrentQuestionnaire(type);
    return eligible.flatMap((inscription) =>
      inscription.evaluationResponses
        .filter((r) => r.type === type && r.version === questionnaire.version)
        .map((r) => parseStoredAnswers(questionnaire, r.answers))
    );
  };

  return {
    session,
    end,
    eligibleCount: eligible.length,
    answers: { chaud: answersOf("chaud"), froid: answersOf("froid") },
  };
}

export function positiveShare(
  answers: EvaluationAnswers[],
  questionId: string
): PositiveShare {
  const notes = answers
    .map((a) => a[questionId])
    .filter((v): v is number => typeof v === "number");
  const positive = notes.filter((note) => note >= POSITIVE_NOTE).length;
  return {
    count: notes.length,
    positive,
    share:
      notes.length >= MIN_RESPONSES_FOR_DETAIL ? positive / notes.length : null,
  };
}

export function buildEvaluationQuality(
  sessions: QualitySessionInput[],
  now: Date = new Date()
): EvaluationQuality {
  const collected = sessions.map(collect);

  const bySession = Object.fromEntries(
    collected
      .filter((c) => c.answers.chaud.length > 0)
      .map((c) => [
        c.session.id,
        positiveShare(c.answers.chaud, SATISFACTION_QUESTION),
      ])
  );

  // Sessions terminées depuis moins de 12 mois
  const since = dayjs(now).subtract(OVERVIEW_MONTHS, "month").toDate();
  const recent = collected.filter(
    (c): c is CollectedSession & { end: Date } =>
      c.end !== null && c.end >= since && c.end <= now
  );

  // Stagiaires qui peuvent encore répondre : fenêtre ouverte aujourd'hui
  const awaitingAnswer = collected.reduce((total, c) => {
    if (!c.end) return total;
    const end = c.end;
    return (
      total +
      EVALUATION_TYPES.filter(
        (type) => getWindowState(getEvaluationWindow(type, end), now) === "open"
      ).reduce(
        (sum, type) =>
          sum + Math.max(0, c.eligibleCount - c.answers[type].length),
        0
      )
    );
  }, 0);

  const sessionsToReview = recent
    .map((c) => {
      const { count, positive, share } = positiveShare(
        c.answers.chaud,
        SATISFACTION_QUESTION
      );
      return {
        id: c.session.id,
        title: c.session.title,
        dissatisfied: count - positive,
        count,
        share,
      };
    })
    .filter((s) => s.share !== null && 1 - s.share >= DISSATISFIED_ALERT_SHARE)
    .sort((a, b) => b.dissatisfied / b.count - a.dissatisfied / a.count)
    .slice(0, MAX_SESSIONS_TO_REVIEW)
    .map(({ id, title, dissatisfied, count }) => ({
      id,
      title,
      dissatisfied,
      count,
    }));

  return {
    bySession,
    overview: {
      satisfaction: positiveShare(
        recent.flatMap((c) => c.answers.chaud),
        SATISFACTION_QUESTION
      ),
      usefulness: positiveShare(
        recent.flatMap((c) => c.answers.froid),
        USEFULNESS_QUESTION
      ),
      awaitingAnswer,
      sessionsToReview,
    },
  };
}
