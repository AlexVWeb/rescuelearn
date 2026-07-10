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

interface LevelNode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: "quiz" | "snv" | "card";
  status: "completed" | "current" | "locked";
  xpReward: number;
  themeColor: string;
}

export default function ProgresserPage() {
  const [mounted, setMounted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  // Onboarding Wizard States
  const [experience, setExperience] = useState("");
  const [objective, setObjective] = useState("");
  const [expectation, setExpectation] = useState("");

  // Game States
  const [streak] = useState(5);
  const [xp] = useState(1250);
  const [hearts] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const levels: LevelNode[] = [
    {
      id: "1",
      title: "Hémorragies Externes",
      subtitle: "Niveau 1 - Quiz",
      description: "Compresser et alerter face à un saignement important.",
      type: "quiz",
      status: "completed",
      xpReward: 100,
      themeColor:
        "from-green-400 to-green-500 border-green-600 shadow-green-200",
    },
    {
      id: "2",
      title: "Le Garrot de Secours",
      subtitle: "Niveau 2 - Fiche Mémo",
      description: "Apprends à poser un garrot tourniquet de manière conforme.",
      type: "card",
      status: "completed",
      xpReward: 50,
      themeColor: "from-blue-400 to-blue-500 border-blue-600 shadow-blue-200",
    },
    {
      id: "3",
      title: "Victime Inconsciente",
      subtitle: "Niveau 3 - Scénario SNV",
      description: "Libération des Voies Aériennes (LVA) et PLS.",
      type: "snv",
      status: "current",
      xpReward: 150,
      themeColor:
        "from-amber-400 to-amber-500 border-amber-600 shadow-amber-200",
    },
    {
      id: "4",
      title: "Arrêt Cardiaque",
      subtitle: "Niveau 4 - Quiz",
      description: "Massage cardiaque et utilisation du DAE.",
      type: "quiz",
      status: "locked",
      xpReward: 200,
      themeColor:
        "from-purple-400 to-purple-500 border-purple-600 shadow-purple-200",
    },
    {
      id: "5",
      title: "Obstructions Aiguës",
      subtitle: "Niveau 5 - Scénario SNV",
      description: "Claques dans le dos et compressions abdominales.",
      type: "snv",
      status: "locked",
      xpReward: 150,
      themeColor: "from-rose-400 to-rose-500 border-rose-600 shadow-rose-200",
    },
    {
      id: "6",
      title: "Malaises & Alertes",
      subtitle: "Niveau 6 - Fiche Mémo",
      description: "Reconnaître l'AVC, l'infarctus et transmettre l'alerte.",
      type: "card",
      status: "locked",
      xpReward: 50,
      themeColor: "from-cyan-400 to-cyan-500 border-cyan-600 shadow-cyan-200",
    },
  ];

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
        <LearningPath
          levels={levels}
          onLevelClick={(node) => {
            if (node.status === "locked") playSound("locked");
            else if (node.status === "completed") playSound("success");
            else playSound("click");
          }}
        />
      </div>
    </div>
  );
}
