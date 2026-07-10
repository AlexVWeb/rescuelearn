"use client";

import React from "react";
import { Award } from "lucide-react";

export function BoutiqueWidget() {
  return (
    <section className="space-y-4 rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-900 uppercase">
        <Award className="h-4 w-4 text-indigo-500" />
        Boutique Récompenses
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <div>
            <h4 className="text-xs font-bold text-gray-900">Gel de série</h4>
            <p className="text-[9px] text-gray-400">Garde ta série active</p>
          </div>
          <button className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black text-white hover:bg-blue-700">
            200 XP
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <div>
            <h4 className="text-xs font-bold text-gray-900">
              Remplir tes vies
            </h4>
            <p className="text-[9px] text-gray-400">Recharge les cœurs à max</p>
          </div>
          <button className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black text-white hover:bg-blue-700">
            350 XP
          </button>
        </div>
      </div>
    </section>
  );
}
