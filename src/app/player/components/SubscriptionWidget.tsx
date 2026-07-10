"use client";

import React, { useState, useEffect } from "react";
import { Mail, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getPlayerSubscriptionStatusAction,
  updateQuestionSubscriptionAction,
  testSendDailyQuizEmailAction,
} from "@/app/actions/player-subscription-actions";

interface SubscriptionWidgetProps {
  playSound: (type: "click" | "success" | "locked") => void;
}

export function SubscriptionWidget({ playSound }: SubscriptionWidgetProps) {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const handleTestEmail = async () => {
    playSound("click");
    setTestingEmail(true);
    try {
      const res = await testSendDailyQuizEmailAction();
      if (res.success) {
        playSound("success");
        toast.success("E-mail de test envoyé avec succès !");
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch {
      toast.error("Erreur lors du test de l'envoi.");
    } finally {
      setTestingEmail(false);
    }
  };

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await getPlayerSubscriptionStatusAction();
        if (res.success && res.data) {
          setEnabled(res.data.enabled);
          setFrequency(res.data.frequency as "daily" | "weekly" | "monthly");
        }
      } catch {
        // Handled silently or showing error
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const handleToggle = async (nextEnabled: boolean) => {
    playSound("click");
    setSaving(true);
    try {
      const res = await updateQuestionSubscriptionAction({
        enabled: nextEnabled,
        frequency,
      });
      if (res.success) {
        setEnabled(nextEnabled);
        if (nextEnabled) {
          playSound("success");
          toast.success(
            "Abonnement activé ! Vous allez recevoir vos questions par e-mail."
          );
        } else {
          toast.success("Abonnement désactivé.");
        }
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch {
      toast.error("Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  };

  const handleFrequencyChange = async (
    nextFreq: "daily" | "weekly" | "monthly"
  ) => {
    playSound("click");
    setSaving(true);
    try {
      const res = await updateQuestionSubscriptionAction({
        enabled,
        frequency: nextFreq,
      });
      if (res.success) {
        setFrequency(nextFreq);
        playSound("success");
        toast.success(
          `Fréquence mise à jour : ${
            nextFreq === "daily"
              ? "Quotidienne"
              : nextFreq === "weekly"
                ? "Hebdomadaire"
                : "Mensuelle"
          }`
        );
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch {
      toast.error("Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Decorative gradient overlay */}
      <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-blue-50/60 blur-xl" />

      <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-800 uppercase">
        <Mail className="h-4 w-4 text-blue-500" />
        Défi par e-mail
      </h2>

      <p className="mt-2 text-xs leading-relaxed font-medium text-slate-500">
        Reçois une question de quiz aléatoire par e-mail adaptée à ton niveau
        pour progresser continuellement.
      </p>

      {/* Switch Button container */}
      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs font-black text-slate-700">M'abonner</span>
        <button
          onClick={() => handleToggle(!enabled)}
          disabled={saving}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none",
            enabled ? "bg-blue-600" : "bg-slate-200",
            saving && "cursor-not-allowed opacity-50"
          )}
          aria-pressed={enabled}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Subscription Settings (Frequency) */}
      <div
        className={cn(
          "mt-4 origin-top space-y-3 border-t border-slate-100 pt-4 transition-all duration-300",
          enabled
            ? "max-h-40 scale-y-100 opacity-100"
            : "max-h-0 scale-y-0 overflow-hidden opacity-0"
        )}
      >
        <label className="block text-[10px] font-black tracking-wider text-slate-400 uppercase">
          Fréquence d'envoi
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
          {(["daily", "weekly", "monthly"] as const).map((freq) => {
            const isSelected = frequency === freq;
            return (
              <button
                key={freq}
                disabled={saving}
                onClick={() => handleFrequencyChange(freq)}
                className={cn(
                  "rounded-lg py-1.5 text-[10px] font-black tracking-wide capitalize transition-all duration-150",
                  isSelected
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {freq === "daily"
                  ? "Jour"
                  : freq === "weekly"
                    ? "Semaine"
                    : "Mois"}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-blue-50/50 p-2.5 text-[10px] font-bold text-blue-800">
          <Sparkles className="h-3 w-3 shrink-0 text-blue-500" />
          <span>Questions adaptées à ton profil !</span>
        </div>

        {process.env.NODE_ENV === "development" && (
          <button
            disabled={testingEmail || saving}
            onClick={handleTestEmail}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/20 py-2 text-[11px] font-bold text-blue-600 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
          >
            {testingEmail ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <Mail className="h-3 w-3" />
                <span>Tester l'envoi du mail (local)</span>
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
