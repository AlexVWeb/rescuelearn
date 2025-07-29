'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { SNVScenario, SNVCollection } from './interfaces/SNV';
import { EcgLine } from '../quiz/components/EcgLine';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { snvService } from './services/snvService';
import { Analytics } from "@vercel/analytics/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

const SNVCatalogue = () => {
  const [mounted, setMounted] = useState(false);
  const [scenarios, setScenarios] = useState<SNVScenario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
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
        const data: SNVCollection = await snvService.getAllScenarios(currentPage);
        setScenarios(data.member);
        setTotalPages(Math.ceil(data.totalItems / 10));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, [currentPage, mounted]);

  const handleScenarioStart = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (selectedScenarioId) {
      const time = difficulty === 'hard' ? 10 : selectedTime;
      router.push(`/snv/${selectedScenarioId}?difficulty=${difficulty}&random=${isRandomMode}&time=${time}`);
      setIsModalOpen(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 relative">
      <EcgLine />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 relative z-10">
          <div className="inline-flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-7 h-7 text-yellow-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Scénarios SNV</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Entraînez-vous à la classification des victimes dans des situations d&apos;urgence à nombreuses victimes.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="text-center">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {scenarios.map((scenario) => (
              <motion.div
                key={scenario.title}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col min-h-[320px] border border-gray-100"
                variants={itemVariants}
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex-grow">
                    <div className="bg-yellow-50 -mx-6 -mt-6 p-6 border-b border-yellow-100 mb-6">
                      <h3 className="font-bold text-gray-800 text-xl leading-tight min-h-[56px] flex items-center">{scenario.title}</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Niveau</p>
                          <p className="text-sm text-gray-600">{scenario.level}</p>
                        </div>
                      </div>

                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Nombre de victimes</p>
                          <p className="text-sm text-gray-600">
                            {scenario.victimesCount || (scenario.victimes?.length || 0)} victimes
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
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg flex items-center justify-center transition-colors mt-6 font-medium"
                  >
                    Démarrer le scénario
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !error && scenarios.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucun scénario disponible pour le moment.</p>
          </div>
        )}

        {!loading && !error && scenarios.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg disabled:opacity-50"
              disabled={currentPage === 1}
            >
              Page précédente
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-lg">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              Page suivante
            </button>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 mb-4">
              {scenarios.find(s => s.id === selectedScenarioId)?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Contexte du scénario</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {scenarios.find(s => s.id === selectedScenarioId)?.description}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">Mode Random</h3>
                <p className="text-sm text-gray-600">Les victimes seront affichées dans un ordre aléatoire</p>
              </div>
              <button
                onClick={() => setIsRandomMode(!isRandomMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRandomMode ? 'bg-yellow-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRandomMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="grid gap-4">
              <button
                onClick={() => handleScenarioStart('easy')}
                className="w-full p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-800 mb-1">Mode Facile</h3>
                    <p className="text-sm text-gray-600">Temps illimité et affichage des explications</p>
                  </div>
                </div>
              </button>

              <div className="space-y-4">
                <button
                  onClick={() => handleScenarioStart('medium')}
                  className="w-full p-4 bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-200 rounded-lg text-left transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-800 mb-1">Mode Intermédiaire</h3>
                      <p className="text-sm text-gray-600">Temps limité et affichage des explications</p>
                    </div>
                  </div>
                </button>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-yellow-800 mb-2">
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
                      className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-yellow-800 font-medium w-12 text-center">
                      {selectedTime}s
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleScenarioStart('hard')}
                className="w-full p-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-lg text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-800 mb-1">Mode Difficile</h3>
                    <p className="text-sm text-gray-600">10 secondes par victime et pas d&apos;explications</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Analytics />
    </div>
  );
};

export default SNVCatalogue; 