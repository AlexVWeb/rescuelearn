import type { ReactNode } from "react";
import { formatAnswer } from "@/lib/evaluation/format";
import type { Questionnaire } from "@/lib/evaluation/questionnaires";
import type { EvaluationAnswers } from "@/lib/evaluation/schemas";

// Récapitulatif des réponses, avant envoi ou en lecture seule après clôture

export function RecapCard({
  questionnaire,
  answers,
  headingLevel = 3,
  renderSectionAction,
}: {
  questionnaire: Questionnaire;
  answers: EvaluationAnswers;
  headingLevel?: 2 | 3;
  /** Ex. bouton « Modifier » renvoyant à l'étape */
  renderSectionAction?: (sectionIndex: number) => ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className="space-y-4">
      {questionnaire.sections.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={`recap-${section.id}`}
          className="bg-card rounded-xl border p-4 print:break-inside-avoid print:border-0 print:p-0"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Heading id={`recap-${section.id}`} className="font-semibold">
              {section.title}
            </Heading>
            {renderSectionAction?.(index)}
          </div>
          <dl className="space-y-3">
            {section.questions.map((question) => {
              const answer = formatAnswer(question, answers[question.id]);
              return (
                <div key={question.id}>
                  <dt className="text-muted-foreground text-sm">
                    {question.label}
                  </dt>
                  <dd className="font-medium break-words whitespace-pre-line">
                    {answer ?? (
                      <span className="text-muted-foreground font-normal italic">
                        Sans réponse
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
