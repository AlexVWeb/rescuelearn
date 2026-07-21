"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  mode: "classic" | "passphrase";
}

export function getPasswordStrength(pass?: string): PasswordStrength {
  if (!pass)
    return { score: 0, label: "", color: "bg-slate-200", mode: "classic" };

  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  const hasUnderscore = pass.includes("_");
  const length = pass.length;

  const isPassphrase = length >= 16 && hasUnderscore;
  const classicCriteria = [hasUpper, hasLower, hasDigit, hasSpecial].filter(
    Boolean
  ).length;

  if (isPassphrase) {
    return {
      score: 100,
      label: "Phrase de passe sécurisée",
      color: "bg-emerald-500",
      mode: "passphrase",
    };
  }

  if (length >= 12 && classicCriteria === 4) {
    return {
      score: 100,
      label: "Mot de passe très fort",
      color: "bg-emerald-500",
      mode: "classic",
    };
  }

  if (length >= 8 && classicCriteria >= 3) {
    return {
      score: 60,
      label: "Moyen",
      color: "bg-amber-500",
      mode: "classic",
    };
  }

  return {
    score: 30,
    label: "Faible",
    color: "bg-rose-500",
    mode: "classic",
  };
}

interface PasswordStrengthIndicatorProps {
  password?: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);

  return (
    <div className="space-y-2 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Force du mot de passe
        </span>
        <span
          className={cn(
            "text-xs font-bold",
            strength.score === 100
              ? "text-emerald-600 dark:text-emerald-400"
              : strength.score >= 60
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400"
          )}
        >
          {strength.label}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          style={{ width: `${strength.score}%` }}
          className={cn("h-full transition-all duration-300", strength.color)}
        />
      </div>

      <div className="grid grid-cols-1 gap-1.5 pt-1">
        <div className="flex items-center gap-2 text-[11px]">
          {strength.mode === "passphrase" ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Mode Phrase de passe activé : longueur optimale
              </span>
            </>
          ) : (
            <>
              {strength.score === 100 ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span
                className={cn(
                  strength.score === 100
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                12+ caractères, majuscule, chiffre, spécial
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
