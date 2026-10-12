"use client";

import React from "react";
import {
  Flame,
  GraduationCap,
  Heart,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";

export interface LevelProgress {
  level: string;
  nextLevel: string | null;
  completedNodes: number;
  totalNodes: number;
}

interface PlayerStatsBannerProps {
  levelProgress?: LevelProgress | null;
  streak: number;
  xp: number;
  hearts: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

function levelObjective({
  nextLevel,
  completedNodes,
  totalNodes,
}: LevelProgress): string {
  if (totalNodes === 0) return "Parcours en préparation";
  const remaining = totalNodes - completedNodes;
  if (remaining > 0) {
    const lessons = `${remaining} leçon${remaining > 1 ? "s" : ""}`;
    return nextLevel
      ? `Objectif : encore ${lessons} pour débloquer ${nextLevel}`
      : `Objectif : encore ${lessons} pour terminer le parcours`;
  }
  return nextLevel
    ? `Parcours terminé · ${nextLevel} bientôt disponible`
    : "Filière terminée, bravo !";
}

export function PlayerStatsBanner({
  levelProgress,
  streak,
  xp,
  hearts,
  soundEnabled,
  onToggleSound,
}: PlayerStatsBannerProps) {
  return (
    <section
      className="mb-8 flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-xl md:p-8"
      aria-label="Statistiques principales"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner backdrop-blur-md">
          <GraduationCap className="h-8 w-8 text-yellow-300" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            {levelProgress ? `NIVEAU ${levelProgress.level}` : "MON PARCOURS"}
          </h1>
          {levelProgress && (
            <>
              <p className="text-xs font-extrabold tracking-wider text-blue-200 uppercase">
                {levelObjective(levelProgress)}
              </p>
              {levelProgress.totalNodes > 0 && (
                <div
                  role="progressbar"
                  aria-label={`Progression du niveau ${levelProgress.level}`}
                  aria-valuemin={0}
                  aria-valuemax={levelProgress.totalNodes}
                  aria-valuenow={levelProgress.completedNodes}
                  className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-white/20"
                >
                  <div
                    className="h-full rounded-full bg-yellow-300 transition-all duration-500"
                    style={{
                      width: `${(levelProgress.completedNodes / levelProgress.totalNodes) * 100}%`,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
          <Flame className="h-5 w-5 animate-pulse fill-current text-orange-400" />
          <span className="text-sm font-black">{streak} J</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
          <Star className="h-5 w-5 fill-current text-yellow-400" />
          <span className="text-sm font-black">{xp} XP</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
          <Heart className="h-5 w-5 fill-current text-red-500" />
          <span className="text-sm font-black">{hearts} VIES</span>
        </div>

        <button
          onClick={onToggleSound}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 transition-all hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          aria-label={soundEnabled ? "Couper le son" : "Activer le son"}
        >
          {soundEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5 text-gray-300" />
          )}
        </button>
      </div>
    </section>
  );
}
