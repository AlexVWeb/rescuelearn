"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  AlertTriangle,
  BookOpen,
  Brain,
  ArrowRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Check,
  ChevronRight,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { LearningBar } from "../learning/components/LearningBar";

// Animations configurations
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

// Static Data lists
const quizQuestions = [
  {
    text: "Une victime présente une hémorragie externe importante au bras. Quelle est votre action immédiate ?",
    options: [
      "Poser immédiatement un garrot tourniquet",
      "Compresser directement la plaie avec la main gantée ou un tissu propre",
      "Allonger la victime et lui surélever les jambes",
      "Nettoyer la plaie à l'eau claire avant d'agir",
    ],
    correctOption: 1,
    explanation:
      "La compression directe arrête le saignement en attendant les secours. Si elle est inefficace ou impossible, un garrot peut être envisagé.",
  },
  {
    text: "Devant un adulte inconscient qui ne respire pas, après avoir fait alerter les secours, que devez-vous faire ?",
    options: [
      "Pratiquer une réanimation cardiopulmonaire (30 compressions, 2 insufflations)",
      "Mettre la victime en Position Latérale de Secours (PLS)",
      "Lui donner des claques dans le dos",
      "Attendre l'arrivée des secours sans rien toucher",
    ],
    correctOption: 0,
    explanation:
      "L'arrêt cardiorespiratoire impose de débuter immédiatement la RCP (30 compressions thoraciques suivies de 2 insufflations).",
  },
  {
    text: "Quel est le premier geste à effectuer face à une brûlure thermique simple et récente ?",
    options: [
      "Appliquer de l'huile ou du beurre",
      "Percer les cloches (phlyctènes)",
      "Arroser immédiatement la zone avec de l'eau tempérée (15-20°C)",
      "Mettre un pansement sec et serré",
    ],
    correctOption: 2,
    explanation:
      "Le refroidissement à l'eau tempérée limite la propagation de la chaleur et soulage la douleur.",
  },
];

const victimsData = [
  {
    description:
      "Une victime au sol ne répond pas et ne réagit pas quand on lui serre la main. Après LVA (Libération des Voies Aériennes), elle recommence à respirer de manière régulière.",
    correctAnswer: 2, // Rouge (Index 2)
    explanation:
      "Après libération des voies aériennes (LVA), le retour de la respiration qualifie la victime en Urgence Absolue (Rouge).",
  },
  {
    description:
      "Une victime est assise, consciente, présente une plaie simple à la main et marche spontanément vers le point de rassemblement.",
    correctAnswer: 0, // Vert (Index 0)
    explanation:
      "Une victime consciente qui se déplace seule (marchante) est classifiée en Urgence Relative (Vert).",
  },
  {
    description:
      "Une victime au sol ne respire plus du tout. Malgré la libération des voies aériennes (LVA), aucune activité ventilatoire ne reprend.",
    correctAnswer: 3, // Noir (Index 3)
    explanation:
      "L'absence de respiration après libération des voies aériennes classe la victime comme décédée/non urgente (Noir) en situation de SNV.",
  },
  {
    description:
      "Une victime au sol gémit, répond aux ordres simples, respire régulièrement mais présente une suspicion de fracture fermée de la cuisse l'empêchant de marcher.",
    correctAnswer: 1, // Jaune (Index 1)
    explanation:
      "Une victime consciente, non marchante, mais dont l'état ventilatoire et circulatoire est stable est classée en Urgence Relative (Jaune).",
  },
];

export function HomeClient() {
  // 1. Glasgow mini-simulator state
  const [glasgowEye, setGlasgowEye] = useState<number>(4);
  const [glasgowVerbal, setGlasgowVerbal] = useState<number>(5);
  const [glasgowMotor, setGlasgowMotor] = useState<number>(6);

  const totalGlasgow = glasgowEye + glasgowVerbal + glasgowMotor;
  const getGlasgowSeverity = (score: number) => {
    if (score >= 13)
      return {
        text: "Conscience normale",
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    if (score >= 9)
      return {
        text: "Altération de la conscience",
        color: "bg-amber-100 text-amber-800 border-amber-200",
      };
    return {
      text: "Victime inconsciente (Coma / Bilan Jaune)",
      color: "bg-rose-100 text-rose-800 border-rose-200",
    };
  };
  const severity = getGlasgowSeverity(totalGlasgow);

  // 2. Quiz mini-teaser state (randomized client-side to prevent hydration mismatch)
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // 3. SNV mini-triage simulator state (randomized client-side to prevent hydration mismatch)
  const [victimIndex, setVictimIndex] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [showSNVFeedback, setShowSNVFeedback] = useState<boolean>(false);

  // Randomize on client mount (avoids hydration issues)
  useEffect(() => {
    const randomize = () => {
      setQuizIndex(Math.floor(Math.random() * quizQuestions.length));
      setVictimIndex(Math.floor(Math.random() * victimsData.length));
    };
    randomize();
  }, []);

  const currentQuestion = quizQuestions[quizIndex];
  const currentVictim = victimsData[victimIndex];

  const handleQuizAnswer = (idx: number) => {
    if (quizAnswered) return;
    setSelectedOption(idx);
    setQuizAnswered(true);
  };

  const resetQuiz = () => {
    setSelectedOption(null);
    setQuizAnswered(false);
    // Move to next random question on reset
    setQuizIndex((prev) => (prev + 1) % quizQuestions.length);
  };

  const handleColorSelect = (index: number) => {
    if (showSNVFeedback) return;
    setSelectedColor(index);
    setShowSNVFeedback(true);
  };

  const nextVictim = () => {
    setSelectedColor(null);
    setShowSNVFeedback(false);
    setVictimIndex((prev) => (prev + 1) % victimsData.length);
  };

  const colors = [
    {
      name: "Vert",
      bg: "bg-green-500 hover:bg-green-600",
      activeRing: "ring-2 ring-green-600 offset-2",
    },
    {
      name: "Jaune",
      bg: "bg-yellow-500 hover:bg-yellow-600",
      activeRing: "ring-2 ring-yellow-600 offset-2",
    },
    {
      name: "Rouge",
      bg: "bg-red-500 hover:bg-red-600",
      activeRing: "ring-2 ring-red-600 offset-2",
    },
    {
      name: "Noir",
      bg: "bg-gray-900 hover:bg-gray-800",
      activeRing: "ring-2 ring-gray-900 offset-2",
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-blue-100/70 blur-[100px]" />
      <div className="absolute top-1/3 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-purple-100/70 blur-[120px]" />

      {/* Hero Section */}
      <section
        className="relative pt-20 pb-16 md:pt-28 md:pb-24"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <motion.div
              className="lg:col-span-6"
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
                <span>Nouveau : Mode Multijoueur Live & Génération IA</span>
              </div>

              <h1
                id="hero-heading"
                className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl"
              >
                Maîtrisez les gestes qui{" "}
                <span className="relative inline-block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  sauvent des vies
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
                RescueLearn réinvente l&apos;apprentissage du secourisme.
                Entraînez-vous avec des quiz de secourisme, des simulations de
                Score de Glasgow et des scénarios de Sauvetage à Nombreuses
                Victimes (SNV) conformes aux référentiels de la DGSCGC.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/quiz"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
                >
                  <span>Accéder aux Quiz</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/snv"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Scénarios SNV</span>
                </Link>
              </div>

              {/* Quick stats badges */}
              <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
                <div>
                  <p className="text-2xl font-bold text-slate-950">100%</p>
                  <p className="text-sm font-medium text-slate-500">
                    Conforme DGSCGC
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-950">4</p>
                  <p className="text-sm font-medium text-slate-500">
                    Modules Interactifs
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-950">
                    Temps Réel
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    Multijoueurs Live
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Interactive Mockup: Real Quiz Interface Styling */}
            <motion.div
              className="relative lg:col-span-6"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                {/* Simulated App Header */}
                <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 animate-pulse text-red-600" />
                    <h2 className="text-sm font-bold text-slate-800">
                      Quiz : Démo Interactive
                    </h2>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Question active
                  </div>
                </div>

                {/* Simulated Quiz Body matching real page.tsx style */}
                <div>
                  <h3 className="mb-4 min-h-[48px] text-base font-semibold text-slate-800">
                    {currentQuestion.text}
                  </h3>

                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, idx) => {
                      const isCorrect = idx === currentQuestion.correctOption;
                      const isSelected = selectedOption === idx;

                      let btnStyle = "border-gray-200 hover:border-blue-400";
                      let badgeStyle = "bg-gray-100 text-gray-700";

                      if (quizAnswered) {
                        if (isCorrect) {
                          btnStyle =
                            "border-green-600 bg-green-50 text-green-950";
                          badgeStyle = "bg-green-600 text-white";
                        } else if (isSelected) {
                          btnStyle = "border-red-600 bg-red-50 text-red-950";
                          badgeStyle = "bg-red-600 text-white";
                        } else {
                          btnStyle =
                            "border-gray-100 opacity-60 cursor-not-allowed";
                        }
                      } else if (isSelected) {
                        btnStyle = "border-blue-600 bg-blue-50";
                        badgeStyle = "bg-blue-600 text-white";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(idx)}
                          disabled={quizAnswered}
                          className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left text-sm font-medium transition-all ${btnStyle}`}
                        >
                          <div className="flex items-center">
                            <div
                              className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeStyle}`}
                            >
                              {quizAnswered && isCorrect ? (
                                <CheckCircle className="h-4 w-4 text-white" />
                              ) : quizAnswered && isSelected && !isCorrect ? (
                                <XCircle className="h-4 w-4 text-white" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                            <span className="text-slate-850">{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {quizAnswered && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-slate-700"
                      >
                        <div className="flex items-start space-x-2">
                          {selectedOption === currentQuestion.correctOption ? (
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                          )}
                          <div className="flex-1">
                            <p className="mb-1 font-semibold text-slate-800">
                              {selectedOption === currentQuestion.correctOption
                                ? "Bonne réponse !"
                                : "Mauvaise réponse"}
                            </p>
                            <p className="text-xs leading-relaxed text-slate-600">
                              {currentQuestion.explanation}
                            </p>
                          </div>
                          <button
                            onClick={resetQuiz}
                            className="self-start rounded p-1 text-slate-400 transition-colors hover:bg-gray-200 hover:text-slate-700"
                            title="Question suivante"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Core Modules Showcases */}
      <section
        className="border-t border-slate-100 bg-white py-20"
        aria-labelledby="modules-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2
              id="modules-heading"
              className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
            >
              Une suite conforme aux modules officiels
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Découvrez des simulations calquées sur vos outils de formation
              habituels pour une expérience immersive.
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 gap-8 lg:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* SNV Triage Simulator - Exactly matching real page.tsx style */}
            <motion.div
              variants={fadeInUp}
              className="group relative rounded-2xl border border-slate-100 bg-slate-50/50 p-8 shadow-md transition-all hover:border-slate-200 hover:bg-white"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-amber-100 bg-amber-50">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                Simulateur Triage SNV
              </h3>
              <p className="mb-6 text-slate-600">
                Entraînez-vous à la classification immédiate des victimes en cas
                d&apos;accident à nombreuses victimes.
              </p>

              {/* Real-Styled Triage Widget */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Alerte Multi-Victimes
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Victime active
                  </span>
                </div>

                <div className="mb-4 min-h-[96px] rounded-lg bg-slate-50 p-4">
                  <h4 className="mb-1 text-xs font-bold tracking-wider text-slate-600 uppercase">
                    État clinique
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-700">
                    {currentVictim.description}
                  </p>
                </div>

                {/* 4 real colors buttons */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {colors.map((color, index) => {
                    const isSelected = selectedColor === index;
                    const isCorrect = index === currentVictim.correctAnswer;

                    let ringStyle = "";
                    if (showSNVFeedback && isSelected) {
                      ringStyle = isCorrect
                        ? "ring-2 ring-green-500 ring-offset-2"
                        : "ring-2 ring-red-500 ring-offset-2";
                    }

                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => handleColorSelect(index)}
                        disabled={showSNVFeedback}
                        className={`${color.bg} ${ringStyle} rounded-lg px-4 py-3 text-xs font-semibold text-white shadow-sm transition-all ${showSNVFeedback ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                      >
                        {color.name}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback like the real game */}
                <AnimatePresence>
                  {showSNVFeedback && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start space-x-2">
                        {selectedColor === currentVictim.correctAnswer ? (
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">
                            {selectedColor === currentVictim.correctAnswer
                              ? "Bonne réponse !"
                              : "Mauvaise réponse"}
                          </p>
                          <p className="text-2xs mt-1 leading-relaxed text-slate-600">
                            {currentVictim.explanation}
                          </p>
                          <button
                            onClick={nextVictim}
                            className="text-2xs mt-2 inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                          >
                            <span>Cas suivant</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/snv"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <span>Accéder au catalogue SNV</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Glasgow Table Trainer - Matches GlasgowTableTraining style */}
            <motion.div
              variants={fadeInUp}
              className="group relative rounded-2xl border border-slate-100 bg-slate-50/50 p-8 shadow-md transition-all hover:border-slate-200 hover:bg-white"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                Entraînement Glasgow
              </h3>
              <p className="mb-6 text-slate-600">
                Maîtrisez le calcul neurologique en manipulant la réponse
                oculaire, verbale et motrice.
              </p>

              {/* Glasgow Simulated Dashboard */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="glasgow-eye"
                      className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase"
                    >
                      Yeux (Y)
                    </label>
                    <select
                      id="glasgow-eye"
                      value={glasgowEye}
                      onChange={(e) => setGlasgowEye(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value={4}>4 - Spontanée</option>
                      <option value={3}>3 - Au bruit</option>
                      <option value={2}>2 - À la douleur</option>
                      <option value={1}>1 - Nulle</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="glasgow-verbal"
                      className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase"
                    >
                      Verbal (V)
                    </label>
                    <select
                      id="glasgow-verbal"
                      value={glasgowVerbal}
                      onChange={(e) => setGlasgowVerbal(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value={5}>5 - Orientée</option>
                      <option value={4}>4 - Confuse</option>
                      <option value={3}>3 - Inappropriée</option>
                      <option value={2}>2 - Incompréhensible</option>
                      <option value={1}>1 - Nulle</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="glasgow-motor"
                      className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase"
                    >
                      Moteur (M)
                    </label>
                    <select
                      id="glasgow-motor"
                      value={glasgowMotor}
                      onChange={(e) => setGlasgowMotor(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value={6}>6 - Obéit</option>
                      <option value={5}>5 - Localise</option>
                      <option value={4}>4 - Évitement</option>
                      <option value={3}>3 - Flexion</option>
                      <option value={2}>2 - Extension</option>
                      <option value={1}>1 - Nulle</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-slate-500">
                      Score Glasgow :
                    </span>
                    <span className="text-xl font-extrabold text-blue-600">
                      {totalGlasgow}
                    </span>
                    <span className="text-xs text-slate-400">/ 15</span>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${severity.color}`}
                  >
                    {severity.text}
                  </span>
                </div>
              </div>

              <Link
                href="/glasgow"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <span>Accéder au module complet</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Quiz Multiplayer Option */}
            <motion.div
              variants={fadeInUp}
              className="group relative rounded-2xl border border-slate-100 bg-slate-50/50 p-8 shadow-md transition-all hover:border-slate-200 hover:bg-white"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-purple-100 bg-purple-50">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                Quiz en mode Multijoueurs
              </h3>
              <p className="mb-6 text-slate-600">
                Créez une session de quiz, partagez le code d&apos;accès avec
                vos collègues ou stagiaires et lancez une compétition amicale.
              </p>
              <Link
                href="/quiz"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <span>Rejoindre un salon de quiz</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* AI Flashcards */}
            <motion.div
              variants={fadeInUp}
              className="group relative rounded-2xl border border-slate-100 bg-slate-50/50 p-8 shadow-md transition-all hover:border-slate-200 hover:bg-white"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                <BookOpen className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                Cartes d&apos;Apprentissage
              </h3>
              <p className="mb-6 text-slate-600">
                Révisez à l&apos;aide de fiches pédagogiques dynamiques,
                classées par niveaux (PSE1, PSE2, grand public).
              </p>
              <Link
                href="/learning"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <span>Consulter les cartes</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Target Audiences: For Trainees & Training Centers */}
      <section
        className="border-t border-slate-100 bg-slate-50/50 py-20"
        aria-labelledby="audience-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2
                id="audience-heading"
                className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
              >
                Conçu pour les secouristes et les organismes de formation
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Idéal pour consolider vos acquis réglementaires individuels ou
                encadrer numériquement des promotions entières de stagiaires.
              </p>

              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <strong className="font-semibold text-slate-950">
                      Validation continue
                    </strong>
                    <span className="block text-sm text-slate-500">
                      Accédez à des statistiques précises de réussite sur vos
                      différents modules.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <strong className="font-semibold text-slate-950">
                      Espace Formateur Dédié
                    </strong>
                    <span className="block text-sm text-slate-500">
                      Gérez des sessions de quiz de groupe, animez des sessions
                      interactives en présentiel.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <strong className="font-semibold text-slate-950">
                      Actualisation automatique (IA)
                    </strong>
                    <span className="block text-sm text-slate-500">
                      Notre moteur d&apos;IA s&apos;appuie sur les
                      recommandations réglementaires de la DGSCGC.
                    </span>
                  </div>
                </li>
              </ul>

              <div className="mt-8">
                <Link
                  href="/formations"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
                >
                  <Building2 className="h-5 w-5" />
                  <span>Espace Organismes de Formation</span>
                </Link>
              </div>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md">
                100% Réglementaire
              </div>

              <h3 className="mb-4 text-lg font-bold text-slate-900">
                Garantie de conformité technique
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">
                Le contenu pédagogique proposé sur RescueLearn est entièrement
                basé sur les référentiels nationaux de recommandations de
                premiers secours, assurant des révisions rigoureuses.
              </p>

              <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="animate-pulse text-sm font-semibold text-slate-800">
                    Sécurité & Accessibilité
                  </h4>
                  <p className="text-xs text-slate-500">
                    Navigation accessible (WCAG / RGAA) et protection de la
                    confidentialité.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Bottom Learning Bar Component */}
      <LearningBar />
    </div>
  );
}
