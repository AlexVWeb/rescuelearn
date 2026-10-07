"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  PlayerStatsBanner,
  type LevelProgress,
} from "../components/PlayerStatsBanner";
import { PlayerOnboarding } from "../components/PlayerOnboarding";
import { LearningPath } from "../components/LearningPath";
import { getPlayerProgressionPathAction } from "@/app/actions/progression-player-actions";
import { useRouter } from "next/navigation";
import { usePlayerSound } from "../hooks/usePlayerSound";
import { usePlayerOnboarding } from "../hooks/usePlayerOnboarding";

interface LevelNode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: "quiz" | "snv" | "card"; // compatible with LearningPath render logic
  status: "completed" | "current" | "locked";
  xpReward: number;
  themeColor: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProgresserPage() {
  const router = useRouter();
  const { soundEnabled, toggleSound, playSound } = usePlayerSound();

  // Game States
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [hearts, setHearts] = useState(0);
  const [nextHeartAt, setNextHeartAt] = useState<string | null>(null);
  const [levels, setLevels] = useState<LevelNode[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(
    null
  );

  const loadPath = async () => {
    const pathRes = await getPlayerProgressionPathAction();
    if (pathRes.success && pathRes.data) {
      // Convert node structure to match visual component props
      const mappedNodes = pathRes.data.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        subtitle: node.subtitle,
        description: node.description,
        type: "quiz" as const, // Default fallback type for LearningPath icons
        status: node.status,
        xpReward: node.xpReward,
        themeColor: node.themeColor,
      }));
      setLevels(mappedNodes);
      setLevelProgress({
        level: pathRes.data.level,
        nextLevel: pathRes.data.nextLevel,
        completedNodes: mappedNodes.filter((n) => n.status === "completed")
          .length,
        totalNodes: mappedNodes.length,
      });
      setXp(pathRes.data.stats.xp);
      setHearts(pathRes.data.stats.hearts);
      setNextHeartAt(pathRes.data.stats.nextHeartAt);
      setStreak(pathRes.data.stats.streak);
    }
  };

  const onboarding = usePlayerOnboarding({
    onCompleted: loadPath,
    onFinishSuccess: () => playSound("success"),
  });

  if (onboarding.loadingOnboarding) return null;

  if (!onboarding.onboardingCompleted) {
    return (
      <PlayerOnboarding
        experience={onboarding.experience}
        setExperience={onboarding.setExperience}
        objective={onboarding.objective}
        setObjective={onboarding.setObjective}
        expectation={onboarding.expectation}
        setExpectation={onboarding.setExpectation}
        onFinish={onboarding.finishOnboarding}
        playSound={playSound}
      />
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-6 md:py-10">
      <PlayerStatsBanner
        levelProgress={levelProgress}
        streak={streak}
        xp={xp}
        hearts={hearts}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      {hearts <= 0 && (
        <div
          role="status"
          className="mx-auto mb-6 max-w-2xl rounded-3xl border-2 border-rose-100 bg-rose-50 p-4 text-center text-sm font-bold text-rose-800"
        >
          💔 Plus de vies !
          {nextHeartAt
            ? ` Prochaine vie à ${formatTime(nextHeartAt)}.`
            : " Reviens un peu plus tard."}
        </div>
      )}

      <div className="mx-auto max-w-2xl py-4">
        {levels.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center">
            <p className="text-lg font-semibold text-gray-700">
              Aucun arbre disponible
            </p>
            <p className="text-sm">
              Votre formateur configurera bientôt votre parcours
              d'apprentissage.
            </p>
          </div>
        ) : (
          <LearningPath
            levels={levels}
            onLevelClick={(node) => {
              if (node.status === "locked") {
                playSound("locked");
                toast.error(
                  "Cette étape est verrouillée ! Terminez l'étape précédente."
                );
              } else if (hearts <= 0) {
                playSound("locked");
                toast.error(
                  nextHeartAt
                    ? `Plus de vies ! Prochaine vie à ${formatTime(nextHeartAt)}.`
                    : "Plus de vies ! Reviens un peu plus tard."
                );
              } else {
                playSound("click");
                router.push(`/player/progression/play/${node.id}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
