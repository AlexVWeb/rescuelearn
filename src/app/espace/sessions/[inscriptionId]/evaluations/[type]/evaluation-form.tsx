"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionField, fieldId } from "@/components/evaluation/question-field";
import { RecapCard } from "@/components/evaluation/recap-card";
import { StepProgress } from "@/components/evaluation/step-progress";
import { useMounted } from "@/hooks/use-mounted";
import type { Questionnaire } from "@/lib/evaluation/questionnaires";
import {
  CONSENT_FIELD,
  CONSENT_MESSAGE,
  validateAnswers,
  type AnswerValue,
  type EvaluationAnswers,
} from "@/lib/evaluation/schemas";
import { formatParisTime } from "@/lib/slot-window";
import {
  saveEvaluationDraft,
  submitEvaluation,
  type EvaluationActionState,
} from "../actions";

// Une section par étape, puis le récapitulatif. Sans JS (ou avant
// l'hydratation), toutes les sections s'affichent dans un seul formulaire,
// envoyable tel quel : les étapes masquées restent dans le DOM (`hidden`),
// leurs réponses partent donc avec le formulaire.

interface EvaluationFormProps {
  inscriptionId: string;
  questionnaire: Questionnaire;
  initialAnswers: EvaluationAnswers;
  alreadySubmitted: boolean;
  organismeName: string;
  closesAtLabel: string;
}

const IDLE: EvaluationActionState = { status: "idle" };
const RECAP_TITLE = "Récapitulatif et envoi";
const CONSENT_ID = "evaluation-consentement";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-12 w-full sm:w-auto" disabled={pending}>
      {pending ? (
        <>
          <RefreshCw
            className="h-4 w-4 motion-safe:animate-spin"
            aria-hidden="true"
          />
          Envoi en cours…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}

export function EvaluationForm({
  inscriptionId,
  questionnaire,
  initialAnswers,
  alreadySubmitted,
  organismeName,
  closesAtLabel,
}: EvaluationFormProps) {
  const { sections, type } = questionnaire;
  const totalSteps = sections.length + 1;

  const [submitState, submitAction] = useActionState(
    submitEvaluation.bind(null, inscriptionId, type),
    IDLE
  );
  const [draftState, draftAction, draftPending] = useActionState(
    saveEvaluationDraft.bind(null, inscriptionId, type),
    IDLE
  );
  const mounted = useMounted();
  const formRef = useRef<HTMLFormElement>(null);

  // Sans JS, le serveur réaffiche le formulaire avec la saisie renvoyée
  const [answers, setAnswers] = useState<EvaluationAnswers>(
    submitState.status === "error" && submitState.values
      ? submitState.values
      : initialAnswers
  );
  const [errors, setErrors] = useState<Record<string, string>>(
    submitState.status === "error" ? (submitState.fieldErrors ?? {}) : {}
  );
  const [step, setStep] = useState(0);
  const [focusTarget, setFocusTarget] = useState<{
    id: string;
    n: number;
  } | null>(null);
  const isRecap = step === sections.length;

  const stepOf = (questionId: string) => {
    const index = sections.findIndex((s) =>
      s.questions.some((q) => q.id === questionId)
    );
    return index === -1 ? sections.length : index;
  };

  function focus(id: string) {
    setFocusTarget((previous) => ({ id, n: (previous?.n ?? 0) + 1 }));
  }

  function focusFirstError(fieldErrors: Record<string, string>) {
    const ordered = [
      ...sections.flatMap((s) => s.questions.map((q) => q.id)),
      CONSENT_FIELD,
    ];
    const first = ordered.find((id) => fieldErrors[id]);
    if (!first) return;
    setStep(stepOf(first));
    focus(first === CONSENT_FIELD ? CONSENT_ID : fieldId(first));
  }

  // Réponse du serveur : erreurs affichées à l'étape concernée (ajustement
  // pendant le rendu plutôt qu'un effet, cf. « You might not need an effect »)
  const [handledState, setHandledState] = useState(submitState);
  if (submitState !== handledState) {
    setHandledState(submitState);
    if (submitState.status === "error" && submitState.fieldErrors) {
      setErrors(submitState.fieldErrors);
      focusFirstError(submitState.fieldErrors);
    }
  }

  // Le focus suit l'étape ou le premier champ en erreur
  useEffect(() => {
    if (!focusTarget) return;
    const element = document.getElementById(focusTarget.id);
    const target = element?.matches("input, textarea, h2")
      ? element
      : element?.querySelector<HTMLElement>("input:checked, input, textarea");
    target?.focus();
  }, [focusTarget]);

  function setAnswer(questionId: string, value: AnswerValue | undefined) {
    setAnswers((previous) => {
      const next = { ...previous };
      if (value === undefined) delete next[questionId];
      else next[questionId] = value;
      return next;
    });
    setErrors(({ [questionId]: _removed, ...rest }) => rest);
  }

  function errorsFor(questionIds: string[]): Record<string, string> {
    const result = validateAnswers(questionnaire, answers, "submit");
    if (result.success) return {};
    return Object.fromEntries(
      Object.entries(result.fieldErrors).filter(([id]) =>
        questionIds.includes(id)
      )
    );
  }

  function saveDraft() {
    // Une réponse déjà envoyée n'est modifiée que par un nouvel envoi
    if (alreadySubmitted || !formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(() => draftAction(formData));
  }

  function goTo(next: number, { validate }: { validate: boolean }) {
    if (validate && !isRecap) {
      const stepErrors = errorsFor(sections[step].questions.map((q) => q.id));
      if (Object.keys(stepErrors).length > 0) {
        setErrors((previous) => ({ ...previous, ...stepErrors }));
        focusFirstError(stepErrors);
        return;
      }
    }
    saveDraft();
    setStep(next);
    focus(`etape-${next}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Pré-validation pour le confort ; le serveur revalide toujours
    const allErrors = errorsFor(
      sections.flatMap((s) => s.questions.map((q) => q.id))
    );
    const consent =
      new FormData(event.currentTarget).get(CONSENT_FIELD) === "on";
    if (!consent) allErrors[CONSENT_FIELD] = CONSENT_MESSAGE;
    if (Object.keys(allErrors).length > 0) {
      event.preventDefault();
      setErrors(allErrors);
      focusFirstError(allErrors);
    }
  }

  const status =
    submitState.status === "error"
      ? submitState.message
      : draftState.status === "error"
        ? draftState.message
        : draftPending
          ? "Enregistrement…"
          : draftState.status === "saved"
            ? `Réponses enregistrées à ${formatParisTime(new Date(draftState.savedAt))}.`
            : "";
  const statusIsError =
    submitState.status === "error" || draftState.status === "error";

  return (
    <form
      ref={formRef}
      action={submitAction}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      {mounted && (
        <StepProgress
          current={step + 1}
          total={totalSteps}
          title={isRecap ? RECAP_TITLE : sections[step].title}
        />
      )}

      {/* Région live toujours présente : annonces d'enregistrement et d'erreur */}
      <p
        aria-live="polite"
        role="status"
        className={
          statusIsError
            ? "text-destructive text-sm font-medium"
            : "text-muted-foreground text-sm"
        }
      >
        {statusIsError && status ? <span aria-hidden="true">⚠ </span> : null}
        {status}
      </p>

      {sections.map((section, index) => (
        <div
          key={section.id}
          hidden={mounted && index !== step}
          className="space-y-6"
        >
          <h2
            id={`etape-${index}`}
            tabIndex={-1}
            className="text-xl font-semibold outline-none focus-visible:underline"
          >
            {section.title}
          </h2>
          {section.questions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id]}
              error={errors[question.id]}
              onChange={(value) => setAnswer(question.id, value)}
            />
          ))}
          {mounted && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="h-12"
                disabled={index === 0}
                onClick={() => goTo(index - 1, { validate: false })}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Précédent
              </Button>
              <Button
                type="button"
                className="h-12"
                onClick={() => goTo(index + 1, { validate: true })}
              >
                Suivant
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      ))}

      <div hidden={mounted && !isRecap} className="space-y-6">
        <h2
          id={`etape-${sections.length}`}
          tabIndex={-1}
          className="text-xl font-semibold outline-none focus-visible:underline"
        >
          {RECAP_TITLE}
        </h2>

        {mounted && (
          <RecapCard
            questionnaire={questionnaire}
            answers={answers}
            renderSectionAction={(index) => (
              <Button
                type="button"
                variant="link"
                className="h-11 px-0"
                onClick={() => goTo(index, { validate: false })}
              >
                Modifier
                <span className="sr-only"> : {sections[index].title}</span>
              </Button>
            )}
          />
        )}

        <div className="bg-muted/40 space-y-3 rounded-xl border p-4 text-sm">
          <p>
            Vos réponses sont utilisées par {organismeName} pour évaluer et
            améliorer ses formations (démarche qualité Qualiopi).
            L&apos;organisme consulte les résultats de façon globale, à partir
            de 5 réponses. Elles sont conservées avec votre dossier de formation
            ; vous pouvez demander à les consulter ou à les supprimer en
            contactant {organismeName}.
          </p>
          <div className="flex items-start gap-3">
            <input
              id={CONSENT_ID}
              type="checkbox"
              name={CONSENT_FIELD}
              aria-invalid={errors[CONSENT_FIELD] ? true : undefined}
              aria-describedby={
                errors[CONSENT_FIELD] ? `${CONSENT_ID}-erreur` : undefined
              }
              onChange={() =>
                setErrors(({ [CONSENT_FIELD]: _removed, ...rest }) => rest)
              }
              className="accent-primary focus-visible:ring-ring mt-0.5 h-6 w-6 shrink-0 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            <label htmlFor={CONSENT_ID} className="font-medium">
              J&apos;accepte que mes réponses soient utilisées dans ce cadre
              (obligatoire)
            </label>
          </div>
          {errors[CONSENT_FIELD] && (
            <p
              id={`${CONSENT_ID}-erreur`}
              className="text-destructive font-medium"
            >
              <span aria-hidden="true">⚠ </span>
              {errors[CONSENT_FIELD]}
            </p>
          )}
        </div>

        <p className="text-muted-foreground text-sm">
          {alreadySubmitted
            ? `Vous pouvez modifier vos réponses jusqu'au ${closesAtLabel}.`
            : `Après l'envoi, vous pourrez encore modifier vos réponses jusqu'au ${closesAtLabel}.`}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {mounted ? (
            <Button
              type="button"
              variant="outline"
              className="h-12"
              onClick={() => goTo(sections.length - 1, { validate: false })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Précédent
            </Button>
          ) : (
            !alreadySubmitted && (
              <Button
                type="submit"
                variant="outline"
                className="h-12"
                formAction={draftAction}
              >
                Enregistrer sans envoyer
              </Button>
            )
          )}
          <SubmitButton
            label={
              alreadySubmitted
                ? "Mettre à jour mes réponses"
                : "Envoyer mes réponses"
            }
          />
        </div>
      </div>
    </form>
  );
}
