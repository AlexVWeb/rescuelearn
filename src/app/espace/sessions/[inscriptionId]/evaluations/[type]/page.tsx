import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { RecapCard } from "@/components/evaluation/recap-card";
import {
  EVALUATION_TYPE_LABELS,
  isEvaluationType,
} from "@/lib/evaluation/questionnaires";
import { RESPONSE_STATUS } from "@/lib/evaluation/service";
import { EspaceHeader } from "../../../../components/espace-header";
import { formatParisDay } from "../../../../lib/format";
import { EvaluationForm } from "./evaluation-form";
import { loadEvaluation } from "./load";

export const dynamic = "force-dynamic";

type Params = Promise<{ inscriptionId: string; type: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { type } = await params;
  return {
    title: isEvaluationType(type)
      ? `${EVALUATION_TYPE_LABELS[type]} · Mon espace de formation`
      : "Mon espace de formation",
  };
}

export default async function EvaluationPage({ params }: { params: Params }) {
  const { inscriptionId, type } = await params;
  const { inscription, context, window, state } = await loadEvaluation(
    inscriptionId,
    type
  );
  const session = inscription.trainingSession;
  const { questionnaire, response } = context;
  const submitted = response?.status === RESPONSE_STATUS.SOUMISE;

  return (
    <>
      <EspaceHeader organisme={session.organisme} />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          <Link
            href={`/espace/sessions/${inscription.id}`}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-sm print:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour à ma formation
          </Link>
          <p className="text-muted-foreground text-sm">{session.title}</p>
          <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
          {state === "open" && (
            <>
              <p>{questionnaire.intro}</p>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Environ {questionnaire.estimatedMinutes} minutes
              </p>
            </>
          )}
        </div>

        {state === "upcoming" && (
          <p className="bg-card rounded-xl border p-4">
            Cette évaluation ouvrira le {formatParisDay(window.opensAt)}. Vous
            recevrez un email à ce moment-là.
          </p>
        )}

        {state === "closed" &&
          (submitted && response ? (
            <>
              <p className="bg-card rounded-xl border p-4">
                Cette évaluation est close depuis le{" "}
                {formatParisDay(window.closesAt)}. Merci pour vos réponses,
                rappelées ci-dessous.
              </p>
              <RecapCard
                questionnaire={questionnaire}
                answers={response.answers}
                headingLevel={2}
              />
            </>
          ) : (
            <p className="bg-card rounded-xl border p-4">
              Cette évaluation est close depuis le{" "}
              {formatParisDay(window.closesAt)}.
            </p>
          ))}

        {state === "open" && (
          <EvaluationForm
            inscriptionId={inscription.id}
            questionnaire={questionnaire}
            initialAnswers={response?.answers ?? {}}
            alreadySubmitted={submitted}
            organismeName={session.organisme.name}
            closesAtLabel={formatParisDay(window.closesAt)}
          />
        )}
      </main>
    </>
  );
}
