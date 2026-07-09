"use client";

import React from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { ParticipantScore } from "@/app/actions/quiz-session-actions";

interface MultiplayerLeaderboardProps {
  leaderboard: ParticipantScore[];
  onBack: () => void;
}

export function MultiplayerLeaderboard({
  leaderboard,
  onBack,
}: MultiplayerLeaderboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-md"
    >
      <div className="inline-flex rounded-full bg-yellow-100 p-4">
        <Award className="h-12 w-12 text-yellow-600" />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-gray-800">
          Quiz Terminé !
        </h2>
        <p className="mt-1 text-gray-600">
          Félicitations à tous les participants.
        </p>
      </div>

      <div className="mx-auto max-w-md border-t border-gray-100 pt-6">
        <h3 className="mb-4 text-lg font-bold text-gray-800">
          Classement Final
        </h3>
        <div className="space-y-3">
          {leaderboard.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                index === 0
                  ? "border-yellow-200 bg-yellow-50 font-bold text-yellow-900"
                  : index === 1
                    ? "border-gray-200 bg-gray-100 text-gray-900"
                    : "border-gray-100 bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm opacity-60">#{index + 1}</span>
                <span>{item.nickname}</span>
              </div>
              <span className="font-mono">{item.score} pts</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="py-4 text-sm text-gray-600">
              Aucun score disponible.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-6 inline-flex rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Retourner au catalogue
      </button>
    </motion.div>
  );
}
