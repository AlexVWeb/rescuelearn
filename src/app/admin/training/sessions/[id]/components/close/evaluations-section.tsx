"use client";

import { CheckCircle2, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SessionEvaluationSummary } from "../../../../actions";
import {
  MIN_RESPONSES_FOR_DETAIL,
  type QuestionAggregate,
} from "@/lib/evaluation/aggregates";
import { RATING_SCALES } from "@/lib/evaluation/questionnaires";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Paris",
});

const percent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

function StateBadge({ state }: { state: SessionEvaluationSummary["state"] }) {
  switch (state) {
    case "upcoming":
      return (
        <Badge variant="secondary">
          <Clock aria-hidden="true" />À venir
        </Badge>
      );
    case "open":
      return (
        <Badge variant="success">
          <CheckCircle2 aria-hidden="true" />
          Ouverte
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="outline">
          <Lock aria-hidden="true" />
          Close
        </Badge>
      );
  }
}

/** Barre horizontale avec son nombre : la longueur n'est jamais la seule information. */
function Bar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate" title={label}>
        {label}
      </span>
      <span
        className="bg-muted h-2 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <span
          className="bg-primary block h-full rounded-full"
          style={{ width: `${percent(count, total)}%` }}
        />
      </span>
      <span className="text-muted-foreground tabular-nums">
        {count} ({percent(count, total)} %)
      </span>
    </li>
  );
}

function QuestionResult({ question }: { question: QuestionAggregate }) {
  const header = (summary: string) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="font-medium">{question.label}</h4>
      <span className="text-sm font-semibold tabular-nums">{summary}</span>
    </div>
  );

  switch (question.kind) {
    case "rating_1_4":
      return (
        <div className="space-y-2">
          {header(
            question.mean === null
              ? "Sans réponse"
              : `${question.mean.toFixed(1).replace(".", ",")} / 4`
          )}
          <ul className="space-y-1">
            {question.distribution.map((count, index) => (
              <Bar
                key={index}
                label={`${index + 1} · ${RATING_SCALES[question.scale][index]}`}
                count={count}
                total={question.count}
              />
            ))}
          </ul>
        </div>
      );
    case "nps":
      return (
        <div className="space-y-2">
          {header(
            question.score === null
              ? "Sans réponse"
              : `NPS ${question.score > 0 ? "+" : ""}${question.score}`
          )}
          <ul className="space-y-1">
            <Bar
              label="Promoteurs (9-10)"
              count={question.promoters}
              total={question.count}
            />
            <Bar
              label="Passifs (7-8)"
              count={question.passives}
              total={question.count}
            />
            <Bar
              label="Détracteurs (0-6)"
              count={question.detractors}
              total={question.count}
            />
          </ul>
        </div>
      );
    case "yes_no":
      return (
        <div className="space-y-2">
          {header(`${percent(question.yes, question.count)} % de oui`)}
          <ul className="space-y-1">
            <Bar label="Oui" count={question.yes} total={question.count} />
            <Bar label="Non" count={question.no} total={question.count} />
          </ul>
        </div>
      );
    case "single_choice":
    case "multi_choice":
      return (
        <div className="space-y-2">
          {header(`${question.count} réponse${question.count > 1 ? "s" : ""}`)}
          <ul className="space-y-1">
            {question.options.map((option) => (
              <Bar
                key={option.value}
                label={option.label}
                count={option.count}
                total={question.count}
              />
            ))}
          </ul>
        </div>
      );
    case "free_text":
      return (
        <div className="space-y-2">
          {header(
            `${question.count} commentaire${question.count > 1 ? "s" : ""}`
          )}
          {question.texts.length > 0 && (
            <ul className="space-y-2">
              {question.texts.map((text, index) => (
                <li
                  key={index}
                  className="bg-muted/40 rounded-md border-l-4 px-3 py-2 text-sm break-words whitespace-pre-line"
                >
                  {text}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
  }
}

export function EvaluationsSection({
  evaluations,
}: {
  evaluations: SessionEvaluationSummary[] | null;
}) {
  if (!evaluations) {
    return (
      <p className="text-muted-foreground text-sm">
        Les évaluations s&apos;ouvriront après le dernier créneau de la session.
        Ajoutez d&apos;abord le programme.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Les stagiaires présents à au moins un créneau répondent depuis leur
        espace : à chaud pendant 30 jours après la session, à froid entre 90 et
        120 jours. Le détail s&apos;affiche à partir de{" "}
        {MIN_RESPONSES_FOR_DETAIL} réponses pour préserver l&apos;anonymat.
      </p>

      {evaluations.map((evaluation) => {
        const { aggregates } = evaluation;
        return (
          <Card key={evaluation.type}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>
                  <h3>{evaluation.label}</h3>
                </CardTitle>
                <StateBadge state={evaluation.state} />
              </div>
              <CardDescription>
                Du {dayFormat.format(new Date(evaluation.opensAt))} au{" "}
                {dayFormat.format(new Date(evaluation.closesAt))} ·{" "}
                {aggregates.submittedCount} réponse
                {aggregates.submittedCount > 1 ? "s" : ""} sur{" "}
                {aggregates.eligibleCount} stagiaire
                {aggregates.eligibleCount > 1 ? "s" : ""} présent
                {aggregates.eligibleCount > 1 ? "s" : ""}
                {aggregates.responseRate !== null &&
                  ` (${Math.round(aggregates.responseRate * 100)} %)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aggregates.detailed ? (
                <div className="space-y-6">
                  {aggregates.questions.map((question) => (
                    <QuestionResult key={question.id} question={question} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {evaluation.state === "upcoming"
                    ? "Pas encore ouverte."
                    : `Résultats détaillés disponibles à partir de ${MIN_RESPONSES_FOR_DETAIL} réponses.`}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
