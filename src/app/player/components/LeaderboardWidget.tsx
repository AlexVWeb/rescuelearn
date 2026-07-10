"use client";

import React from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardUser {
  name: string;
  xp: number;
  avatar: string;
  current: boolean;
}

interface LeaderboardWidgetProps {
  leaderboard: LeaderboardUser[];
}

export function LeaderboardWidget({ leaderboard }: LeaderboardWidgetProps) {
  return (
    <section
      className="space-y-4 rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm"
      aria-labelledby="leaderboard-title"
    >
      <h2
        id="leaderboard-title"
        className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-900 uppercase"
      >
        <Trophy className="h-4 w-4 text-yellow-500" />
        Classement Ligue
      </h2>
      <div className="space-y-3">
        {leaderboard.map((user, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-between rounded-2xl p-2.5 transition-all",
              user.current
                ? "border-2 border-blue-200 bg-blue-50/70 shadow-sm"
                : "border-2 border-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="w-4 text-xs font-black text-gray-400">
                {idx + 1}
              </span>
              <span className="text-2xl">{user.avatar}</span>
              <span
                className={cn(
                  "max-w-[100px] truncate text-xs font-bold",
                  user.current
                    ? "font-extrabold text-blue-700"
                    : "text-gray-700"
                )}
              >
                {user.name}
              </span>
            </div>
            <span className="text-xs font-black text-gray-900">
              {user.xp} XP
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
