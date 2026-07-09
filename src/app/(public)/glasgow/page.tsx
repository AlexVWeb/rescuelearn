"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GlasgowTableTraining } from "./components/GlasgowTableTraining";
import { GlasgowSimulator } from "./components/GlasgowSimulator";
import { RealGlasgowTable } from "./components/RealGlasgowTable";
import { MnemonicsCard } from "./components/MnemonicsCard";
import { Activity, Shield } from "lucide-react";

export default function GlasgowPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "training" | "docs">(
    "simulator"
  );

  // Schema.org JSON-LD structure data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: "Simulateur & Entraînement au Score de Glasgow | RescueLearn",
    description:
      "Plateforme d'apprentissage et simulateur clinique interactif pour maîtriser le Score de Glasgow (GCS) conforme aux recommandations nationales DGSCGC.",
    learningResourceType: "Simulation / Interactive Tool",
    educationalLevel: "PSE1, PSE2, SUAP, SST, Grand Public",
    inLanguage: "fr-FR",
    author: {
      "@type": "Organization",
      name: "RescueLearn",
      url: "https://rescuelearn.fr",
    },
  };

  return (
    <main className="dark:bg-gray-905 min-h-screen bg-gray-50/50 pb-16">
      {/* Injecting JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 px-4 py-20 text-white sm:px-6 lg:px-8"
        aria-labelledby="glasgow-hero-heading"
      >
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.1),transparent_40%)]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300"
            >
              <Activity className="h-3.5 w-3.5" />
              Référentiel National Secourisme DGSCGC
            </motion.div>

            <motion.h1
              id="glasgow-hero-heading"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 bg-gradient-to-r from-white via-blue-50 to-indigo-100 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl"
            >
              Le Score de Glasgow
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              Maîtrisez l&apos;évaluation de l&apos;état de conscience
              d&apos;une victime. Utilisez notre simulateur clinique dynamique
              et notre module d&apos;entraînement interactif pour assimiler
              rapidement les scores Oculaire, Verbal et Moteur.
            </motion.p>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-3"
            >
              <button
                onClick={() => setActiveTab("simulator")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "simulator"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                Simulateur clinique
              </button>
              <button
                onClick={() => setActiveTab("training")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "training"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                Entraînement interactif
              </button>
              <button
                onClick={() => setActiveTab("docs")}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "docs"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                Mnémotechnique & Règles
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Interactive Container */}
      <section className="relative z-20 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          {activeTab === "simulator" && (
            <motion.div
              key="tab-simulator"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GlasgowSimulator />
            </motion.div>
          )}

          {activeTab === "training" && (
            <motion.div
              key="tab-training"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GlasgowTableTraining />
            </motion.div>
          )}

          {activeTab === "docs" && (
            <motion.div
              key="tab-docs"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-12"
            >
              {/* Mnemonics side */}
              <div className="lg:col-span-6">
                <MnemonicsCard />
              </div>

              {/* Tips & Reference Table side */}
              <div className="space-y-6 lg:col-span-6">
                {/* Official table snippet */}
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                  <RealGlasgowTable />
                </div>

                {/* Important notices */}
                <div className="space-y-4 rounded-3xl border border-amber-100 bg-amber-50/50 p-6 dark:border-amber-900 dark:bg-amber-950/10">
                  <h4 className="flex items-center gap-2 text-sm font-bold tracking-wider text-amber-800 uppercase dark:text-amber-400">
                    <Shield className="h-4 w-4" /> Règles critiques en
                    secourisme
                  </h4>
                  <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-amber-600">•</span>
                      <span>
                        <strong>Règle des 8 points :</strong> Un score inférieur
                        ou égal à 8 définit un coma (urgence absolue)
                        nécessitant une intubation et une protection des voies
                        aériennes rapides.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-amber-600">•</span>
                      <span>
                        <strong>Facteurs confondants :</strong> La présence
                        d&apos;alcool, de médicaments ou de drogues peut altérer
                        artificiellement le score de Glasgow sans refléter la
                        seule gravité du traumatisme crânien.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Info Section for SEO & Learning context */}
      <section
        className="mx-auto mt-16 max-w-4xl px-4 text-center sm:px-6 lg:px-8"
        aria-labelledby="learning-info-title"
      >
        <h2
          id="learning-info-title"
          className="mb-4 text-xl font-bold text-gray-900 dark:text-white"
        >
          Pourquoi s&apos;entraîner au Score de Glasgow (GCS) ?
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Utilisé universellement en médecine d&apos;urgence et en secourisme
          (PSE1/PSE2), le score de Glasgow permet d&apos;établir un bilan
          neurologique reproductible et transmissible au médecin régulateur du
          SAMU. C&apos;est un pilier de la prise en charge des traumatismes
          crâniens et des troubles neurologiques.
        </p>
      </section>
    </main>
  );
}
