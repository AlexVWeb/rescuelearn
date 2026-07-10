"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { PlayerStatsBanner } from "../components/PlayerStatsBanner";
import { PlayerOnboarding } from "../components/PlayerOnboarding";
import { LearningPath } from "../components/LearningPath";
import {
  getPlayerOnboardingStatusAction,
  savePlayerOnboardingAction,
} from "@/app/actions/player-actions";
import { getPlayerProgressionPathAction } from "@/app/actions/progression-player-actions";
import { useRouter } from "next/navigation";

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

export default function ProgresserPage() {
  const [mounted, setMounted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const router = useRouter();

  // Onboarding Wizard States
  const [experience, setExperience] = useState("");
  const [objective, setObjective] = useState("");
  const [expectation, setExpectation] = useState("");

  // Game States
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [levels, setLevels] = useState<LevelNode[]>([]);

  useEffect(() => {
    setMounted(true);
    async function loadStatus() {
      try {
        const res = await getPlayerOnboardingStatusAction();
        if (res.success && res.data) {
          setOnboardingCompleted(res.data.completed);
          setExperience(res.data.experience);
          setObjective(res.data.objective);
          setExpectation(res.data.expectation);

          if (res.data.completed) {
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
              setXp(pathRes.data.stats.xp);
              setHearts(pathRes.data.stats.hearts);
              setStreak(pathRes.data.stats.streak);
            }
          }
        }
      } finally {
        setLoadingOnboarding(false);
      }
    }
    loadStatus();
  }, []);

  const handleFinishOnboarding = async () => {
    try {
      const res = await savePlayerOnboardingAction({
        experience,
        objective,
        expectation,
      });
      if (res.success) {
        setOnboardingCompleted(true);
        playSound("success");
        toast.success("Profil d'apprentissage configuré avec succès !");

        // Load path
        const pathRes = await getPlayerProgressionPathAction();
        if (pathRes.success && pathRes.data) {
          const mappedNodes = pathRes.data.nodes.map((node) => ({
            id: node.id,
            title: node.title,
            subtitle: node.subtitle,
            description: node.description,
            type: "quiz" as const,
            status: node.status,
            xpReward: node.xpReward,
            themeColor: node.themeColor,
          }));
          setLevels(mappedNodes);
          setXp(pathRes.data.stats.xp);
          setHearts(pathRes.data.stats.hearts);
          setStreak(pathRes.data.stats.streak);
        }
      } else {
        toast.error(
          res.error || "Une erreur est survenue lors de la configuration."
        );
      }
    } catch (error) {
      logger.error(
        "Erreur inattendue durant la configuration de l'onboarding :",
        error
      );
      toast.error("Une erreur inattendue est survenue.");
    }
  };

  const playSound = (type: "click" | "success" | "locked") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "locked") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      logger.warn("Web Audio failed to load:", e);
    }
  };

  if (!mounted || loadingOnboarding) return null;

  if (!onboardingCompleted) {
    return (
      <PlayerOnboarding
        experience={experience}
        setExperience={setExperience}
        objective={objective}
        setObjective={setObjective}
        expectation={expectation}
        setExpectation={setExpectation}
        onFinish={handleFinishOnboarding}
        playSound={playSound}
      />
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-6 md:py-10">
      <PlayerStatsBanner
        streak={streak}
        xp={xp}
        hearts={hearts}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

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
