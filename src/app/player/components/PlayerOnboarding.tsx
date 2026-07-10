"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, UserCheck } from "lucide-react";

interface PlayerOnboardingProps {
  experience: string;
  setExperience: (val: string) => void;
  objective: string;
  setObjective: (val: string) => void;
  expectation: string;
  setExpectation: (val: string) => void;
  onFinish: () => void;
  playSound: (type: "click" | "success" | "locked") => void;
}

export function PlayerOnboarding({
  experience,
  setExperience,
  objective,
  setObjective,
  expectation,
  setExpectation,
  onFinish,
  playSound,
}: PlayerOnboardingProps) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const progressPercent = (onboardingStep / 4) * 100;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-between px-4 py-8 md:py-16">
      {/* Onboarding Header with Progress Bar */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              onboardingStep > 1 && setOnboardingStep(onboardingStep - 1)
            }
            disabled={onboardingStep === 1}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30"
            aria-label="Étape précédente"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="text-sm font-extrabold tracking-widest text-gray-500 uppercase">
            Étape {onboardingStep} sur 4
          </span>
          <div className="w-6" />
        </div>

        <div className="h-4 w-full overflow-hidden rounded-full border border-gray-200/50 bg-gray-100">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md transition-all duration-300"
            data-testid="onboarding-progress-bar"
          />
        </div>
      </header>

      {/* Onboarding Main Form Section */}
      <main className="my-8 flex flex-1 flex-col justify-center gap-8">
        {/* Mascot Speech Bubble Row */}
        <div className="flex items-start gap-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-tr from-blue-500 to-indigo-600 text-2xl shadow">
            🚑
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black tracking-widest text-blue-600 uppercase">
              Rescuy
            </h4>
            <p className="text-sm leading-relaxed font-semibold text-blue-900">
              {onboardingStep === 1 &&
                "Sélectionne ton expérience en secourisme pour qu'on adapte le niveau des défis !"}
              {onboardingStep === 2 &&
                "Parfait ! Dis-moi maintenant quel est ton objectif sur RescueLearn."}
              {onboardingStep === 3 &&
                "Super. Quels types de supports pédagogiques as-tu le plus hâte d'essayer ?"}
              {onboardingStep === 4 &&
                "Génial ! Ton profil d'entraînement personnalisé est prêt. C'est parti !"}
            </p>
          </div>
        </div>

        {/* Step 1: Experience Select */}
        {onboardingStep === 1 && (
          <div className="space-y-4">
            <label
              htmlFor="experience-select"
              className="block text-center text-xl font-black text-gray-900 md:text-left"
            >
              Quelle est ton expérience en secourisme ?
            </label>
            <div className="relative">
              <select
                id="experience-select"
                value={experience}
                onChange={(e) => {
                  setExperience(e.target.value);
                  playSound("click");
                }}
                className="w-full cursor-pointer appearance-none rounded-2xl border-2 border-gray-200 bg-white p-4 pr-12 text-base font-extrabold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none md:text-lg"
              >
                <option value="" disabled>
                  -- Choisis ton expérience --
                </option>
                <option value="beginner">
                  Débutant complet (Je n'ai jamais pratiqué)
                </option>
                <option value="intermediate">
                  Initié (J'ai fait un PSC1, SST ou équivalent)
                </option>
                <option value="professional">
                  Professionnel / Actif (PSE1, PSE2, Formateur...)
                </option>
              </select>
              <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-400">
                <ChevronDown className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Objective Select */}
        {onboardingStep === 2 && (
          <div className="space-y-4">
            <label
              htmlFor="objective-select"
              className="block text-center text-xl font-black text-gray-900 md:text-left"
            >
              Quel est ton objectif principal ?
            </label>
            <div className="relative">
              <select
                id="objective-select"
                value={objective}
                onChange={(e) => {
                  setObjective(e.target.value);
                  playSound("click");
                }}
                className="w-full cursor-pointer appearance-none rounded-2xl border-2 border-gray-200 bg-white p-4 pr-12 text-base font-extrabold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none md:text-lg"
              >
                <option value="" disabled>
                  -- Choisis ton objectif --
                </option>
                <option value="exam">
                  Réviser pour obtenir un diplôme / certificat
                </option>
                <option value="safety">
                  Être prêt à agir et sauver des vies en situation réelle
                </option>
                <option value="general">
                  Culture générale et rappel des bons gestes
                </option>
              </select>
              <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-400">
                <ChevronDown className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Expectation Select */}
        {onboardingStep === 3 && (
          <div className="space-y-4">
            <label
              htmlFor="expectation-select"
              className="block text-center text-xl font-black text-gray-900 md:text-left"
            >
              Qu'attends-tu le plus de RescueLearn ?
            </label>
            <div className="relative">
              <select
                id="expectation-select"
                value={expectation}
                onChange={(e) => {
                  setExpectation(e.target.value);
                  playSound("click");
                }}
                className="w-full cursor-pointer appearance-none rounded-2xl border-2 border-gray-200 bg-white p-4 pr-12 text-base font-extrabold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none md:text-lg"
              >
                <option value="" disabled>
                  -- Choisis tes préférences --
                </option>
                <option value="quizzes">
                  Des quiz réguliers et stimulants
                </option>
                <option value="snv">
                  Des simulations interactives (Scénarios SNV)
                </option>
                <option value="memos">
                  Des fiches mémo visuelles et rapides
                </option>
              </select>
              <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-400">
                <ChevronDown className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Celebration */}
        {onboardingStep === 4 && (
          <div className="space-y-6 text-center">
            <div className="inline-flex h-20 w-20 animate-bounce items-center justify-center rounded-3xl border-2 border-emerald-100 bg-emerald-50 text-3xl text-emerald-500 shadow">
              🎉
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900">
                Profil d'apprentissage configuré !
              </h3>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-gray-500">
                En fonction de ton profil, nous avons défini ton point de départ
                au **Niveau 1** des fondations du secourisme.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Onboarding Navigation Footer */}
      <footer>
        {onboardingStep < 4 ? (
          <button
            onClick={() => {
              setOnboardingStep(onboardingStep + 1);
              playSound("click");
            }}
            disabled={
              (onboardingStep === 1 && !experience) ||
              (onboardingStep === 2 && !objective) ||
              (onboardingStep === 3 && !expectation)
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-blue-600 px-6 py-4 text-center font-extrabold text-white transition-all duration-150 hover:bg-blue-500 active:translate-y-1 active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-6 py-4 text-center font-extrabold text-white transition-all duration-150 hover:bg-emerald-500 active:translate-y-1 active:border-b-0"
          >
            <UserCheck className="h-5 w-5" />
            Accéder à mon parcours !
          </button>
        )}
      </footer>
    </div>
  );
}
