"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

interface MascotWidgetProps {
  onResetOnboarding: () => void;
}

export function MascotWidget({ onResetOnboarding }: MascotWidgetProps) {
  return (
    <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border-2 border-gray-100 bg-white p-6 text-center shadow-sm">
      <div className="absolute top-0 right-0 h-16 w-16 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-tr from-blue-500 to-indigo-600 text-4xl text-white shadow-md">
        🚑
        <span className="absolute right-0 bottom-0 rounded-full border-2 border-white bg-emerald-500 p-1">
          <span className="block h-2 w-2 animate-pulse rounded-full bg-white" />
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-black text-gray-900">Rescuy</h3>
        <p className="text-xs font-bold tracking-widest text-blue-600 uppercase">
          Conseiller Secourisme
        </p>
      </div>
      <p className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600 italic">
        "Chaque jour est une opportunité d'apprendre les gestes qui sauvent.
        Enchaîne les leçons pour débloquer ton prochain insigne !"
      </p>

      <button
        onClick={onResetOnboarding}
        className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label="Recommencer le questionnaire d'onboarding"
      >
        <RotateCcw className="h-3 w-3" /> Recommencer le questionnaire
      </button>
    </div>
  );
}
