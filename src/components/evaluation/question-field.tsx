"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  FREE_TEXT_MAX_LENGTH,
  RATING_SCALES,
  type Question,
} from "@/lib/evaluation/questionnaires";
import type { AnswerValue } from "@/lib/evaluation/schemas";
import { cn } from "@/lib/utils";
import { OptionGroup, type OptionItem } from "./option-group";

// Une question = un fieldset + legend (ou un label pour le texte libre),
// message d'erreur relié par aria-describedby.

export const fieldId = (questionId: string) => `question-${questionId}`;
const errorId = (questionId: string) => `question-${questionId}-erreur`;
const hintId = (questionId: string) => `question-${questionId}-aide`;

const NPS_OPTIONS: OptionItem[] = Array.from({ length: 11 }, (_, note) => ({
  value: String(note),
  label: `${note} sur 10`,
  shortLabel: String(note),
}));

const YES_NO_OPTIONS: OptionItem[] = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];

/** Valeur du formulaire telle que les inputs natifs la portent. */
export function toFormValues(value: AnswerValue | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "boolean") return [value ? "oui" : "non"];
  return [String(value)];
}

function fromFormValue(question: Question, value: string): AnswerValue {
  switch (question.kind) {
    case "rating_1_4":
    case "nps":
      return Number(value);
    case "yes_no":
      return value === "oui";
    default:
      return value;
  }
}

interface QuestionFieldProps {
  question: Question;
  value: AnswerValue | undefined;
  error?: string;
  disabled?: boolean;
  onChange: (value: AnswerValue | undefined) => void;
}

export function QuestionField({
  question,
  value,
  error,
  disabled,
  onChange,
}: QuestionFieldProps) {
  const describedBy =
    [
      question.hint ? hintId(question.id) : null,
      error ? errorId(question.id) : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const selected = toFormValues(value);

  const label = (
    <>
      {question.label}
      {question.required ? (
        <span className="text-muted-foreground font-normal">
          {" "}
          (obligatoire)
        </span>
      ) : (
        <span className="text-muted-foreground font-normal"> (facultatif)</span>
      )}
    </>
  );

  const messages = (
    <>
      {question.hint && (
        <p id={hintId(question.id)} className="text-muted-foreground text-sm">
          {question.hint}
        </p>
      )}
      {error && (
        <p
          id={errorId(question.id)}
          className="text-destructive text-sm font-medium"
        >
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </>
  );

  if (question.kind === "free_text") {
    const text = typeof value === "string" ? value : "";
    const counterId = `${fieldId(question.id)}-compteur`;
    return (
      <div id={fieldId(question.id)} className="space-y-2">
        <label
          htmlFor={`${fieldId(question.id)}-input`}
          className="block font-medium"
        >
          {label}
        </label>
        {messages}
        <Textarea
          id={`${fieldId(question.id)}-input`}
          name={question.id}
          value={text}
          maxLength={FREE_TEXT_MAX_LENGTH}
          rows={4}
          inputMode="text"
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value || undefined)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, counterId].filter(Boolean).join(" ")}
          className="text-base"
        />
        <p id={counterId} className="text-muted-foreground text-right text-xs">
          {text.length} / {FREE_TEXT_MAX_LENGTH} caractères
        </p>
      </div>
    );
  }

  let options: OptionItem[];
  let layout: string;
  switch (question.kind) {
    case "rating_1_4":
      options = RATING_SCALES[question.scale].map((text, index) => ({
        value: String(index + 1),
        label: text,
      }));
      layout = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      break;
    case "nps":
      options = NPS_OPTIONS;
      layout = "grid-cols-6 sm:grid-cols-11";
      break;
    case "yes_no":
      options = YES_NO_OPTIONS;
      layout = "grid-cols-2";
      break;
    case "single_choice":
    case "multi_choice":
      options = question.options;
      layout = "grid-cols-1 sm:grid-cols-2";
      break;
  }

  const multiple = question.kind === "multi_choice";

  return (
    <fieldset id={fieldId(question.id)} className="min-w-0 space-y-2">
      <legend className="mb-2 font-medium">{label}</legend>
      {messages}
      <OptionGroup
        name={question.id}
        type={multiple ? "checkbox" : "radio"}
        options={options}
        selected={selected}
        disabled={disabled}
        invalid={Boolean(error)}
        describedBy={describedBy}
        className={cn(layout)}
        onToggle={(optionValue, checked) => {
          if (multiple) {
            const next = checked
              ? [...selected, optionValue]
              : selected.filter((v) => v !== optionValue);
            onChange(next.length > 0 ? next : undefined);
          } else if (checked) {
            onChange(fromFormValue(question, optionValue));
          }
        }}
      />
    </fieldset>
  );
}
