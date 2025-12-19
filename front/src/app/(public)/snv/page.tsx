"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { SNVScenario, SNVCollection } from "./interfaces/SNV";
import { EcgLine } from "../quiz/components/EcgLine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { snvService } from "./services/snvService";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

const SNVCatalogue = () => {
  const [mounted, setMounted] = useState(false);
  const [scenarios, setScenarios] = useState<SNVScenario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [selectedTime, setSelectedTime] = useState<number>(60);
  const [totalPages, setTotalPages] = useState<number>(1);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchScenarios = async () => {
      try {
        setLoading(true);
        const data: SNVCollection =
          await snvService.getAllScenarios(currentPage);
        setScenarios(data.member);
        setTotalPages(Math.ceil(data.totalItems / 10));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, [currentPage, mounted]);

  const handleScenarioStart = (difficulty: "easy" | "medium" | "hard") => {
    if (selectedScenarioId) {
      const time = difficulty === "hard" ? 10 : selectedTime;
      router.push(
        `/snv/${selectedScenarioId}?difficulty=${difficulty}&random=${isRandomMode}&time=${time}`
      );
      setIsModalOpen(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <EcgLine />

      <div className="mx-auto max-w-7xl">
        <div className="relative z-10 mb-12 text-center">
          <div className="mb-4 inline-flex items-center space-x-2">
            <AlertTriangle className="h-7 w-7 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-800 md:text-4xl">
              Scénarios SNV
            </h1>
          </div>
          <p className="mx-auto max-w-3xl text-lg text-gray-600">
            Entraînez-vous à la classification des victimes dans des situations
            d&apos;urgence à nombreuses victimes.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <p className="text-center">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {scenarios.map((scenario) => (
              <motion.div
                key={scenario.title}
                className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg"
                variants={itemVariants}
              >
                <div className="flex h-full flex-col p-6">
                  <div className="flex-grow">
                    <div className="-mx-6 -mt-6 mb-6 border-b border-yellow-100 bg-yellow-50 p-6">
                      <h3 className="flex min-h-[56px] items-center text-xl leading-tight font-bold text-gray-800">
                        {scenario.title}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center rounded-lg bg-gray-50 p-3">
                        <AlertTriangle className="mr-3 h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Niveau
                          </p>
                          <p className="text-sm text-gray-600">
                            {scenario.level}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center rounded-lg bg-gray-50 p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Nombre de victimes
                          </p>
                          <p className="text-sm text-gray-600">
                            {scenario.victimesCount ||
                              scenario.victimes?.length ||
                              0}{" "}
                            victimes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedScenarioId(scenario.id);
                      setIsModalOpen(true);
                    }}
                    className="mt-6 flex w-full items-center justify-center rounded-lg bg-yellow-600 py-3 font-medium text-white transition-colors hover:bg-yellow-700"
                  >
                    Démarrer le scénario
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !error && scenarios.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-600">
              Aucun scénario disponible pour le moment.
            </p>
          </div>
        )}

        {!loading && !error && scenarios.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={currentPage === 1}
            >
              Page précédente
            </button>
            <span className="rounded-lg bg-gray-100 px-4 py-2">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              Page suivante
            </button>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="mb-4 text-2xl font-bold text-gray-800">
              {scenarios.find((s) => s.id === selectedScenarioId)?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold text-gray-800">
                Contexte du scénario
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {
                  scenarios.find((s) => s.id === selectedScenarioId)
                    ?.description
                }
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">Mode Random</h3>
                <p className="text-sm text-gray-600">
                  Les victimes seront affichées dans un ordre aléatoire
                </p>
              </div>
              <button
                onClick={() => setIsRandomMode(!isRandomMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isRandomMode ? "bg-yellow-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isRandomMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="grid gap-4">
              <button
                onClick={() => handleScenarioStart("easy")}
                className="group w-full rounded-lg border-2 border-green-200 bg-green-50 p-4 text-left transition-colors hover:bg-green-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1 font-semibold text-green-800">
                      Mode Facile
                    </h3>
                    <p className="text-sm text-gray-600">
                      Temps illimité et affichage des explications
                    </p>
                  </div>
                </div>
              </button>

              <div className="space-y-4">
                <button
                  onClick={() => handleScenarioStart("medium")}
                  className="group w-full rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 text-left transition-colors hover:bg-yellow-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-1 font-semibold text-yellow-800">
                        Mode Intermédiaire
                      </h3>
                      <p className="text-sm text-gray-600">
                        Temps limité et affichage des explications
                      </p>
                    </div>
                  </div>
                </button>

                <div className="rounded-lg bg-yellow-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-yellow-800">
                    Temps par victime (secondes)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-yellow-200"
                    />
                    <span className="w-12 text-center font-medium text-yellow-800">
                      {selectedTime}s
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleScenarioStart("hard")}
                className="group w-full rounded-lg border-2 border-red-200 bg-red-50 p-4 text-left transition-colors hover:bg-red-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1 font-semibold text-red-800">
                      Mode Difficile
                    </h3>
                    <p className="text-sm text-gray-600">
                      10 secondes par victime et pas d&apos;explications
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Analytics />
      <SpeedInsights />
    </div>
  );
};

export default SNVCatalogue;
