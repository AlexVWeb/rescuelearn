"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressionStats } from "@/lib/progression/player-stats";

interface DailyStatsWidgetProps {
  stats: (ProgressionStats & { level: string }) | null;
  loading: boolean;
}

function scoreColor(score: number, kind: "text" | "bg") {
  if (score >= 75)
    return kind === "text" ? "text-emerald-500" : "bg-emerald-500";
  if (score >= 50) return kind === "text" ? "text-amber-500" : "bg-amber-500";
  return kind === "text" ? "text-rose-500" : "bg-rose-500";
}

export function DailyStatsWidget({ stats, loading }: DailyStatsWidgetProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!stats || stats.completedNodes === 0) {
    return (
      <section className="rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-800 uppercase">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Mes Statistiques
        </h2>
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <Map className="mb-2 h-10 w-10 text-slate-300" />
          <p className="text-xs font-bold text-slate-500">
            Aucune leçon terminée pour le moment.
          </p>
          <Link
            href="/player/progresser"
            className="mt-3 rounded-xl bg-blue-500 px-4 py-2 text-[10px] font-black tracking-wider text-white uppercase transition-colors hover:bg-blue-600"
          >
            Commencer mon parcours
          </Link>
        </div>
      </section>
    );
  }

  const pathRate =
    stats.totalNodes > 0
      ? Math.round((stats.completedNodes / stats.totalNodes) * 100)
      : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-blue-50/40 blur-xl" />

      <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-800 uppercase">
        <BarChart3 className="h-4 w-4 text-blue-500" />
        Mes Statistiques
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-2">
          <span className="text-2xl font-black text-slate-800">
            {stats.completedNodes}
            <span className="text-base text-slate-400">
              /{stats.totalNodes}
            </span>
          </span>
          <span className="mt-1 text-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Leçons terminées
          </span>
        </div>
        <div className="flex flex-col items-center justify-center pl-2">
          <span
            className={cn(
              "text-2xl font-black",
              stats.averageScore === null
                ? "text-slate-400"
                : scoreColor(stats.averageScore, "text")
            )}
          >
            {stats.averageScore === null ? "—" : `${stats.averageScore}%`}
          </span>
          <span className="mt-1 text-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
            Score moyen
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-1.5 border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-slate-400 uppercase">
          <span>Parcours {stats.level}</span>
          <span>{pathRate}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            style={{ width: `${pathRate}%` }}
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
          />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <h3 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
          Dernières leçons
        </h3>
        <div className="space-y-3">
          {stats.lessons.map((lesson) => (
            <div key={lesson.nodeId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-bold text-slate-700">
                  {lesson.title}
                </span>
                <span className="font-black text-slate-500">
                  {lesson.score === null ? "—" : `${lesson.score}%`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{ width: `${lesson.score ?? 0}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    lesson.score !== null && scoreColor(lesson.score, "bg")
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
