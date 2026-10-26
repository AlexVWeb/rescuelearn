import Link from "next/link";
import {
  ArrowRight,
  Info,
  MessageSquareHeart,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MIN_RESPONSES_FOR_DETAIL } from "@/lib/evaluation/aggregates";
import type { PositiveShare, QualityOverview } from "@/lib/evaluation/quality";

const percent = (share: number) => `${Math.round(share * 100)} %`;
const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? "s" : ""}`;

/** Un chiffre clé, toujours accompagné du nombre de personnes derrière. */
function Headline({
  result,
  label,
  title,
  sentence,
  waiting,
}: {
  result: PositiveShare;
  /** Libellé autonome, affiché tant qu'il n'y a pas de pourcentage */
  label: string;
  /** Suite du pourcentage : « 92 % satisfaits » */
  title: string;
  /** « se disent satisfaits… » : suite de « X stagiaires sur Y » */
  sentence: string;
  waiting: string;
}) {
  if (result.share === null) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </p>
        <p className="text-xs text-slate-500">
          {waiting} Résultat affiché à partir de {MIN_RESPONSES_FOR_DETAIL}{" "}
          réponses ({result.count} pour l&apos;instant).
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        <span className="text-2xl font-extrabold tabular-nums">
          {percent(result.share)}
        </span>{" "}
        {title}
      </p>
      <p className="text-xs text-slate-500">
        {result.positive} stagiaire{result.positive > 1 ? "s" : ""} sur{" "}
        {result.count} {sentence}
      </p>
    </div>
  );
}

/** Ce que disent les stagiaires, en clair, et ce qui mérite attention. */
export function QualityCard({ overview }: { overview: QualityOverview }) {
  const { satisfaction, usefulness, awaitingAnswer, sessionsToReview } =
    overview;
  const nothingYet =
    satisfaction.count === 0 && usefulness.count === 0 && awaitingAnswer === 0;
  const hasAttention = sessionsToReview.length > 0 || awaitingAnswer > 0;

  return (
    <section aria-labelledby="quality-title">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="quality-title"
          className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-500 uppercase"
        >
          <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
          Avis des stagiaires
        </h2>
        <span className="text-xs font-semibold text-slate-500">
          12 derniers mois
        </span>
      </div>

      <Card className="border py-0 shadow-sm">
        <CardContent className="space-y-4 p-4">
          {nothingYet ? (
            <p className="text-xs text-slate-500">
              À la fin de chaque session, les stagiaires présents reçoivent un
              court questionnaire. Leurs avis apparaîtront ici.
            </p>
          ) : (
            <>
              <Headline
                result={satisfaction}
                label="Satisfaction en fin de formation"
                title="satisfaits"
                sentence="se disent satisfaits ou très satisfaits de leur formation."
                waiting="Questionnaire envoyé à la fin de chaque session."
              />
              {(usefulness.count > 0 || satisfaction.share !== null) && (
                <Headline
                  result={usefulness}
                  label="Utilité 3 mois après"
                  title="trouvent la formation utile, 3 mois après"
                  sentence="disent s'en servir dans leur quotidien."
                  waiting="Questionnaire envoyé 3 mois après la formation."
                />
              )}

              {hasAttention && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    À regarder
                  </p>
                  <ul className="space-y-2 text-sm">
                    {sessionsToReview.map((session) => (
                      <li key={session.id}>
                        <Link
                          href={`/admin/training/sessions/${session.id}?phase=close&section=evaluations`}
                          className="group flex items-start gap-2 rounded-md underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <TriangleAlert
                            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-semibold">
                              {session.title}
                            </span>{" "}
                            : {session.dissatisfied} stagiaire
                            {session.dissatisfied > 1 ? "s" : ""} sur{" "}
                            {session.count} pas satisfait
                            {session.dissatisfied > 1 ? "s" : ""}
                          </span>
                          <ArrowRight
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                    {awaitingAnswer > 0 && (
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                        <Info
                          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                        <span>
                          {plural(awaitingAnswer, "stagiaire")}{" "}
                          {awaitingAnswer > 1 ? "n'ont" : "n'a"} pas encore
                          répondu. Ils sont relancés automatiquement par email.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
