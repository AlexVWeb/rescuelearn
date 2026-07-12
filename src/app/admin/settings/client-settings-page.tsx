"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureKey } from "@/types/features";
import { updateSystemSettingAction } from "@/app/actions/system-settings-actions";
import { toast } from "sonner";
import {
  ShieldAlert,
  Users,
  Milestone,
  Activity,
  BookOpen,
  RefreshCw,
} from "lucide-react";

import { ClientSettingsPageProps } from "./interfaces";

export function ClientSettingsPage({
  initialSettings,
}: ClientSettingsPageProps) {
  const [settings, setSettings] = useState<Record<FeatureKey, boolean>>(() => {
    const state: Record<FeatureKey, boolean> = {
      [FeatureKey.PLAYER_SYSTEM]: true,
      [FeatureKey.DUOLINGO_SYSTEM]: true,
      [FeatureKey.GLASGOW_SYSTEM]: true,
      [FeatureKey.SNV_SYSTEM]: true,
      [FeatureKey.QUIZ_SYSTEM]: true,
    };

    initialSettings.forEach((s) => {
      if (s.key in state) {
        state[s.key as FeatureKey] = s.value === "true";
      }
    });

    return state;
  });

  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});

  const handleToggle = async (key: FeatureKey) => {
    setLoadingKeys((prev) => ({ ...prev, [key]: true }));
    const newValue = !settings[key];

    try {
      const result = await updateSystemSettingAction(key, newValue);
      if (result.success) {
        setSettings((prev) => ({ ...prev, [key]: newValue }));
        toast.success(`Option mise à jour avec succès.`);
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    } catch {
      toast.error("Une erreur s'est produite lors de la mise à jour.");
    } finally {
      setLoadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const featureConfigs = [
    {
      key: FeatureKey.PLAYER_SYSTEM,
      title: "Système Player & Connexions",
      description:
        "Désactive l'accès à l'espace élève et bloque les connexions pour les comptes élèves. Les administrateurs et formateurs gardent l'accès.",
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      key: FeatureKey.DUOLINGO_SYSTEM,
      title: "Système de Progression (Duolingo)",
      description:
        "Suspend le parcours d'apprentissage (carte interactive) et le lancement des exercices pour les élèves.",
      icon: Milestone,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      key: FeatureKey.GLASGOW_SYSTEM,
      title: "Simulateur Score de Glasgow",
      description:
        "Désactive l'accès à la page d'entraînement public et d'apprentissage du score de Glasgow.",
      icon: Activity,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      key: FeatureKey.SNV_SYSTEM,
      title: "Simulateur SNV (Nombreuses Victimes)",
      description:
        "Désactive l'accès public au simulateur de triage en situation d'urgence à nombreuses victimes (SNV).",
      icon: ShieldAlert,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      key: FeatureKey.QUIZ_SYSTEM,
      title: "Système de Quiz",
      description:
        "Suspend l'accès public aux Quiz, à la création de quiz IA et aux sessions de quiz en ligne.",
      icon: BookOpen,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-950">
          Options Système
        </h1>
        <p className="mt-1 text-gray-500">
          Désactivez temporairement des sections entières de RescueLearn en cas
          de maintenance ou de mise à jour.
        </p>
      </div>

      <div className="grid gap-4">
        {featureConfigs.map((config) => {
          const Icon = config.icon;
          const isEnabled = settings[config.key];
          const isLoading = loadingKeys[config.key];

          return (
            <Card
              key={config.key}
              className="overflow-hidden border-gray-200 transition-all hover:shadow-sm"
            >
              <CardContent className="flex items-start gap-4 p-6">
                <div
                  className={`rounded-xl border p-3 ${config.color} shrink-0`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-base leading-none font-semibold text-gray-900">
                      {config.title}
                    </span>
                    <button
                      onClick={() => handleToggle(config.key)}
                      disabled={isLoading}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                        isEnabled ? "bg-blue-600" : "bg-gray-200"
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none flex inline-block h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      >
                        {isLoading && (
                          <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                        )}
                      </span>
                    </button>
                  </div>
                  <p className="pr-12 text-sm leading-relaxed text-gray-500">
                    {config.description}
                  </p>
                  <div className="flex items-center gap-1.5 pt-2">
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${
                        isEnabled
                          ? "animate-pulse bg-emerald-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-gray-450 text-xs font-semibold tracking-wider uppercase">
                      {isEnabled ? "Actif" : "Désactivé"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
