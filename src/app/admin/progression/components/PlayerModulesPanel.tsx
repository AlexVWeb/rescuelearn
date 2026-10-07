"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getPlayerModulesAction,
  updatePlayerModuleAction,
} from "@/app/actions/system-settings-actions";
import {
  ALL_PLAYER_MODULES,
  PLAYER_MODULE_LABELS,
  type PlayerModuleKey,
  type PlayerModulesState,
} from "@/types/player-modules";

export function PlayerModulesPanel() {
  const [modules, setModules] = useState<PlayerModulesState | null>(null);
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPlayerModulesAction().then((res) => {
      if (res.success && res.data) {
        setModules(res.data);
      } else {
        toast.error(res.error || "Erreur de chargement des modules");
      }
    });
  }, []);

  const handleToggle = async (key: PlayerModuleKey) => {
    if (!modules) return;
    const newValue = !modules[key];
    setLoadingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await updatePlayerModuleAction(key, newValue);
      if (res.success) {
        setModules((prev) => (prev ? { ...prev, [key]: newValue } : prev));
        toast.success(
          `${PLAYER_MODULE_LABELS[key].title} ${newValue ? "activé" : "désactivé"}.`
        );
      } else {
        toast.error(res.error || "Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur inattendue.");
    } finally {
      setLoadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Modules de l&apos;espace élève
        </CardTitle>
        <CardDescription>
          Masquez temporairement un module du tableau de bord élève en cas de
          souci. Les changements peuvent prendre jusqu&apos;à une minute pour
          être visibles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!modules ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center text-sm font-semibold">
            Chargement des modules...
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {ALL_PLAYER_MODULES.map((key) => {
              const { title, description } = PLAYER_MODULE_LABELS[key];
              const isEnabled = modules[key];
              const isLoading = loadingKeys[key];

              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {title}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          isEnabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isEnabled ? "Actif" : "Désactivé"}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(key)}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                      isEnabled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={title}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    >
                      {isLoading && (
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
