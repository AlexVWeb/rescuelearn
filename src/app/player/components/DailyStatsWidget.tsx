"use client";

import React from "react";
import { BarChart3, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagStat {
  tag: string;
  total: number;
  correct: number;
  rate: number;
}

interface DailyStatsWidgetProps {
  stats: {
    total: number;
    correct: number;
    successRate: number;
    tagStats: TagStat[];
  } | null;
  loading: boolean;
}

const TAG_LABELS: Record<string, string> = {
  hemorragie: "🚑 Hémorragies",
  inconscient: "🛌 Victime Ininconsciente",
  "arret cardiaque": "❤️ Arrêt Cardiaque",
  obstruction: "💨 Obstruction Voies Aériennes",
  malaise: "🧠 AVC & Malaises",
};

function formatTag(tag: string): string {
  const normalized = tag.toLowerCase().trim();
  return TAG_LABELS[normalized] || `🏷️ ${tag}`;
}

export function DailyStatsWidget({ stats, loading }: DailyStatsWidgetProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <section className="rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-800 uppercase">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Mes Statistiques
        </h2>
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <HelpCircle className="text-slate-350 mb-2 h-10 w-10" />
          <p className="text-xs font-bold text-slate-500">
            Aucun défi quotidien complété pour le moment.
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            Réponds aux questions reçues par e-mail pour voir tes statistiques
            ici !
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-blue-50/40 blur-xl" />

      <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-800 uppercase">
        <BarChart3 className="h-4 w-4 text-blue-500" />
        Mes Statistiques
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-2">
          <span className="text-2xl font-black text-slate-800">
            {stats.total}
          </span>
          <span className="mt-1 text-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Défis Relevés
          </span>
        </div>
        <div className="flex flex-col items-center justify-center pl-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-2xl font-black",
                stats.successRate >= 75
                  ? "text-emerald-500"
                  : stats.successRate >= 50
                    ? "text-amber-500"
                    : "text-rose-500"
              )}
            >
              {stats.successRate}%
            </span>
          </div>
          <span className="mt-1 text-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Taux de Réussite
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <h3 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
          Maîtrise par geste
        </h3>
        <div className="space-y-3">
          {stats.tagStats.map((tagStat) => (
            <div key={tagStat.tag} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  {formatTag(tagStat.tag)}
                </span>
                <span className="font-black text-slate-500">
                  {tagStat.rate}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{ width: `${tagStat.rate}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    tagStat.rate >= 75
                      ? "bg-emerald-500"
                      : tagStat.rate >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  )}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                <span>
                  {tagStat.correct} correct{tagStat.correct > 1 ? "s" : ""}
                </span>
                <span>
                  {tagStat.total} essai{tagStat.total > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
