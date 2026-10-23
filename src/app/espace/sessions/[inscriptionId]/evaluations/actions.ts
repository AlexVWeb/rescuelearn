"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkCanEdit } from "@/lib/evaluation/eligibility";
import { isEvaluationType } from "@/lib/evaluation/questionnaires";
import {
  CONSENT_FIELD,
  CONSENT_MESSAGE,
  readAnswersFromForm,
  readConsent,
  validateAnswers,
  type EvaluationAnswers,
  type ValidationMode,
} from "@/lib/evaluation/schemas";
import {
  getEvaluationContext,
  RESPONSE_STATUS,
  type EvaluationContext,
} from "@/lib/evaluation/service";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  assertNotRateLimited,
  getClientIp,
  RateLimitError,
  registerFailure,
} from "@/lib/rate-limit";
import { getTraineeInscription, requireTrainee } from "@/lib/trainee-session";

export type EvaluationActionState =
  | { status: "idle" }
  | { status: "saved"; savedAt: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      // Réponses valides renvoyées au formulaire : sans JS, il est réaffiché
      // depuis le serveur et ne doit pas perdre la saisie
      values?: EvaluationAnswers;
    };

// Même message quels que soient la cause et le stagiaire : pas d'oracle
const NOT_AVAILABLE = "Cette évaluation n'est pas accessible.";

const MESSAGES = {
  not_open: "Cette évaluation n'est pas encore ouverte.",
  closed: "Cette évaluation est close : les réponses ne sont plus modifiables.",
  invalid: "Certaines réponses sont à corriger.",
  rate_limited:
    "Trop d'envois en peu de temps. Patientez quelques minutes avant de réessayer.",
} as const;

// Chaque envoi compte (pas seulement les échecs) : brouillons par étape compris
const rateRules = async (inscriptionId: string) => [
  {
    key: `evaluation:inscription:${inscriptionId}`,
    max: 30,
    windowSeconds: 10 * 60,
  },
  {
    key: `evaluation:ip:${await getClientIp()}`,
    max: 120,
    windowSeconds: 10 * 60,
  },
];

/** Identifiant pseudonyme pour les logs : jamais l'identifiant ni le token. */
function logId(inscriptionId: string): string {
  return createHash("sha256")
    .update(`evaluation:${inscriptionId}`)
    .digest("hex")
    .slice(0, 12);
}

type Guarded =
  | { ok: true; inscriptionId: string; context: EvaluationContext }
  | { ok: false; state: EvaluationActionState };

/**
 * Garde commune : le stagiaire vient du cookie, l'inscription doit être la
 * sienne, il doit être éligible et la fenêtre ouverte. Rien n'est lu du client
 * hormis l'inscription visée (vérifiée) et le type.
 */
async function guard(inscriptionId: string, type: string): Promise<Guarded> {
  const access = await requireTrainee();
  const inscription = await getTraineeInscription(access, inscriptionId);
  if (!inscription || !isEvaluationType(type)) {
    return { ok: false, state: { status: "error", message: NOT_AVAILABLE } };
  }

  const context = await getEvaluationContext(inscription, type);
  if (context.denial || !context.state) {
    return { ok: false, state: { status: "error", message: NOT_AVAILABLE } };
  }
  const editDenial = checkCanEdit(context.state);
  if (editDenial) {
    return {
      ok: false,
      state: { status: "error", message: MESSAGES[editDenial] },
    };
  }

  try {
    for (const rule of await rateRules(inscription.id)) {
      await assertNotRateLimited(rule);
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        ok: false,
        state: { status: "error", message: MESSAGES.rate_limited },
      };
    }
    throw error;
  }
  for (const rule of await rateRules(inscription.id)) {
    await registerFailure(rule);
  }

  return { ok: true, inscriptionId: inscription.id, context };
}

function validate(
  context: EvaluationContext,
  formData: FormData,
  mode: ValidationMode
) {
  return validateAnswers(
    context.questionnaire,
    readAnswersFromForm(context.questionnaire, formData),
    mode
  );
}

export async function saveEvaluationDraft(
  inscriptionId: string,
  type: string,
  _prev: EvaluationActionState,
  formData: FormData
): Promise<EvaluationActionState> {
  const guarded = await guard(inscriptionId, type);
  if (!guarded.ok) return guarded.state;
  const { context } = guarded;

  // Une réponse soumise ne redevient pas un brouillon : seule une nouvelle
  // soumission la modifie
  if (context.response?.status === RESPONSE_STATUS.SOUMISE) {
    return { status: "idle" };
  }

  const result = validate(context, formData, "draft");
  if (!result.success) {
    return {
      status: "error",
      message: MESSAGES.invalid,
      fieldErrors: result.fieldErrors,
    };
  }

  await prisma.evaluationResponse.upsert({
    where: {
      inscriptionId_type: {
        inscriptionId: guarded.inscriptionId,
        type: context.type,
      },
    },
    create: {
      inscriptionId: guarded.inscriptionId,
      type: context.type,
      version: context.questionnaire.version,
      answers: result.answers,
    },
    // Le statut n'est jamais modifié ici : pas de retour au brouillon
    update: { answers: result.answers },
  });

  return { status: "saved", savedAt: new Date().toISOString() };
}

export async function submitEvaluation(
  inscriptionId: string,
  type: string,
  _prev: EvaluationActionState,
  formData: FormData
): Promise<EvaluationActionState> {
  const guarded = await guard(inscriptionId, type);
  if (!guarded.ok) return guarded.state;
  const { context } = guarded;

  const result = validate(context, formData, "submit");
  const consent = readConsent(formData);
  if (!result.success || !consent) {
    const draft = validate(context, formData, "draft");
    return {
      status: "error",
      message: MESSAGES.invalid,
      fieldErrors: {
        ...(result.success ? {} : result.fieldErrors),
        ...(consent ? {} : { [CONSENT_FIELD]: CONSENT_MESSAGE }),
      },
      values: draft.success ? draft.answers : undefined,
    };
  }

  const now = new Date();
  // Upsert sur (inscription, type) : une seule réponse, un double envoi la
  // met à jour au lieu d'en créer une seconde
  await prisma.evaluationResponse.upsert({
    where: {
      inscriptionId_type: {
        inscriptionId: guarded.inscriptionId,
        type: context.type,
      },
    },
    create: {
      inscriptionId: guarded.inscriptionId,
      type: context.type,
      version: context.questionnaire.version,
      answers: result.answers,
      status: RESPONSE_STATUS.SOUMISE,
      submittedAt: now,
    },
    update: {
      answers: result.answers,
      status: RESPONSE_STATUS.SOUMISE,
      submittedAt: now,
    },
  });

  logger.info("Évaluation soumise", {
    type: context.type,
    ref: logId(guarded.inscriptionId),
    at: now.toISOString(),
  });

  revalidatePath(`/espace/sessions/${guarded.inscriptionId}`);
  redirect(
    `/espace/sessions/${guarded.inscriptionId}/evaluations/${context.type}/merci`
  );
}

/** Le stagiaire coupe les rappels par email ; l'évaluation reste accessible. */
export async function setEvaluationReminders(
  inscriptionId: string,
  enabled: boolean
): Promise<void> {
  const access = await requireTrainee();
  const inscription = await getTraineeInscription(access, inscriptionId);
  if (!inscription) return;

  await prisma.inscription.update({
    where: { id: inscription.id },
    data: { evaluationRemindersOptOut: !enabled },
  });
  revalidatePath(`/espace/sessions/${inscription.id}`);
}
