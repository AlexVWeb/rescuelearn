"use client";

import React from "react";
import { Trophy, Flame, Star, Heart, Volume2, VolumeX } from "lucide-react";

interface PlayerStatsBannerProps {
  streak: number;
  xp: number;
  hearts: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function PlayerStatsBanner({
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
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner backdrop-blur-md">
          <Trophy className="h-8 w-8 animate-bounce text-yellow-300" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            LIGUE DE BRONZE
          </h1>
          <p className="text-xs font-extrabold tracking-wider text-blue-200 uppercase">
            Objectif : Finir dans le top 3 pour monter
          </p>
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
