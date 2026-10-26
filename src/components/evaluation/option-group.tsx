"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Groupe de radios ou de cases natifs : clavier (flèches, espace) et envoi
// sans JS fournis par le navigateur. L'option choisie se lit à la bordure,
// à la graisse et à la coche, jamais à la seule couleur.

export interface OptionItem {
  value: string;
  label: string;
  /** Texte visible plus court (ex. « 3 ») ; `label` reste le nom accessible */
  shortLabel?: string;
}

interface OptionGroupProps {
  name: string;
  type: "radio" | "checkbox";
  options: OptionItem[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  disabled?: boolean;
}

export function OptionGroup({
  name,
  type,
  options,
  selected,
  onToggle,
  invalid,
  describedBy,
  className,
  disabled,
}: OptionGroupProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {options.map((option) => {
        const checked = selected.includes(option.value);
        const id = `${name}-${option.value}`;
        return (
          <div key={option.value} className="relative">
            <input
              id={id}
              type={type}
              name={name}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={(event) => onToggle(option.value, event.target.checked)}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <label
              htmlFor={id}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-colors select-none",
                "peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
                "motion-reduce:transition-none",
                checked
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-input bg-background hover:bg-muted/50",
                option.shortLabel && "justify-center",
                invalid && !checked && "border-destructive/60"
              )}
            >
              {option.shortLabel ? (
                checked && (
                  <Check
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    strokeWidth={3}
                  />
                )
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center border",
                    type === "radio" ? "rounded-full" : "rounded-[3px]",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  )}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
              {option.shortLabel ? (
                <>
                  <span aria-hidden="true">{option.shortLabel}</span>
                  <span className="sr-only">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </label>
          </div>
        );
      })}
    </div>
  );
}
