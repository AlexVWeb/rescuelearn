"use client";

import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

import { PlayerStatsBanner } from "./components/PlayerStatsBanner";
import { PlayerOnboarding } from "./components/PlayerOnboarding";
import { LearningPath } from "./components/LearningPath";
import { MascotWidget } from "./components/MascotWidget";
import { LeaderboardWidget } from "./components/LeaderboardWidget";
import { BoutiqueWidget } from "./components/BoutiqueWidget";
import {
  getPlayerOnboardingStatusAction,
  savePlayerOnboardingAction,
  resetPlayerOnboardingAction,
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

export default function PlayerPage() {
  const [mounted, setMounted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Onboarding Wizard States
  const [experience, setExperience] = useState("");
  const [objective, setObjective] = useState("");
  const [expectation, setExpectation] = useState("");

  // Game States
  const [streak] = useState(5);
  const [xp] = useState(1250);
  const [hearts] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load onboarding state and protect against SSR hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Justification : Nécessaire pour éviter les erreurs d'hydratation (hydration mismatch) en forçant un rendu côté client après le montage.
    setMounted(true);
    async function loadStatus() {
      const res = await getPlayerOnboardingStatusAction();
      if (res.success && res.data) {
        setOnboardingCompleted(res.data.completed);
        setExperience(res.data.experience);
        setObjective(res.data.objective);
        setExpectation(res.data.expectation);
      }
    }
    loadStatus();
  }, []);

  const handleFinishOnboarding = async () => {
    const res = await savePlayerOnboardingAction({
      experience,
      objective,
      expectation,
    });
    if (res.success) {
      setOnboardingCompleted(true);
      playSound("success");
    }
  };

  const resetOnboarding = async () => {
    const res = await resetPlayerOnboardingAction();
    if (res.success) {
      setOnboardingCompleted(false);
      setExperience("");
      setObjective("");
      setExpectation("");
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

  const leaderboard = [
    { name: "Thomas (Formateur)", xp: 1850, avatar: "👨‍🏫", current: false },
    { name: "Toi", xp: 1250, avatar: "⚡", current: true },
    { name: "Sarah B.", xp: 980, avatar: "👩‍⚕️", current: false },
    { name: "Lucas M.", xp: 850, avatar: "👷", current: false },
    { name: "Camille D.", xp: 620, avatar: "👩‍🚒", current: false },
  ];

  const dailyQuests = [
    {
      text: "Réalise un sans-faute sur un quiz",
      progress: 0,
      target: 1,
      xp: 100,
    },
    {
      text: "Complète 1 scénario SNV",
      progress: 1,
      target: 1,
      xp: 150,
      completed: true,
    },
    { text: "Réviser 5 cartes mémo", progress: 2, target: 5, xp: 50 },
  ];

  if (!mounted) return null;

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

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Column 1: Mascot & Daily Quests */}
        <aside className="space-y-6 lg:col-span-3">
          <MascotWidget onResetOnboarding={resetOnboarding} />

          <section
            className="space-y-4 rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm"
            aria-labelledby="quests-title-left"
          >
            <h2
              id="quests-title-left"
              className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-900 uppercase"
            >
              <Trophy className="h-4 w-4 text-yellow-500" />
              Défis quotidiens
            </h2>
            <div className="space-y-4">
              {dailyQuests.map((quest, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "text-xs font-bold",
                        quest.completed
                          ? "text-gray-400 line-through"
                          : "text-gray-700"
                      )}
                    >
                      {quest.text}
                    </span>
                    <span className="shrink-0 text-[10px] font-black text-yellow-600">
                      +{quest.xp} XP
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        style={{
                          width: `${(quest.progress / quest.target) * 100}%`,
                        }}
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          quest.completed ? "bg-emerald-500" : "bg-blue-600"
                        )}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-gray-500">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Column 2: Center Learning Path */}
        <LearningPath
          levels={levels}
          onLevelClick={(node) => {
            if (node.status === "locked") playSound("locked");
            else if (node.status === "completed") playSound("success");
            else playSound("click");
          }}
        />

        {/* Column 3: Leaderboard & Boutique */}
        <aside className="space-y-6 lg:col-span-3">
          <LeaderboardWidget leaderboard={leaderboard} />
          <BoutiqueWidget />
        </aside>
      </div>
    </div>
  );
}
