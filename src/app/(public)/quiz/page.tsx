"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Activity, Loader2, List, Users } from "lucide-react";
import { Quiz, QuizCollection } from "./interfaces/Quiz";
import { EcgLine } from "./components/EcgLine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

import {
  joinQuizSessionAction,
  createQuizSessionAction,
  checkServerSaturationAction,
} from "@/app/actions/quiz-session-actions";

// Variants pour les animations Framer Motion
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

// Composant principal
const QuizCatalogue = () => {
  const [mounted, setMounted] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [totalPages, setTotalPages] = useState<number>(1);

  // State pour le multijoueur
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [multiplayerLoading, setMultiplayerLoading] = useState(false);
  const [isServerSaturated, setIsServerSaturated] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const checkSaturation = async () => {
      const res = await checkServerSaturationAction();
      if (res.success && res.isSaturated) {
        setIsServerSaturated(true);
      }
    };
    checkSaturation();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/quizzes?page=${currentPage}`);
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des quiz");
        }
        const data: QuizCollection = await response.json();
        setQuizzes(data.member);
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

    fetchQuizzes();
  }, [currentPage, mounted]);

  const handleQuizStart = (difficulty: "easy" | "medium" | "hard") => {
    if (selectedQuizId) {
      router.push(
        `/quiz/${selectedQuizId}?difficulty=${difficulty}&random=${isRandomMode}`
      );
      setIsModalOpen(false);
    }
  };

  const handleCreateMultiplayerSession = async () => {
    if (!selectedQuizId) return;
    setMultiplayerLoading(true);
    try {
      const res = await createQuizSessionAction(selectedQuizId);
      if (res.success && res.sessionId && res.code) {
        // Rediriger vers la page de session en tant qu'hôte
        router.push(`/quiz/session/${res.code}?hostToken=${res.sessionId}`);
        setIsModalOpen(false);
      } else {
        alert(res.error || "Impossible de créer la session multijoueurs");
      }
    } catch (err) {
      alert("Une erreur inattendue est survenue");
    } finally {
      setMultiplayerLoading(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !joinNickname) {
      setJoinError("Veuillez remplir tous les champs");
      return;
    }
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await joinQuizSessionAction(joinCode, joinNickname);
      if (res.success && res.participantId && res.sessionId) {
        // Enregistrer l'identité du participant en local (sessionStorage)
        sessionStorage.setItem(
          `quiz_participant_${res.sessionId}`,
          res.participantId
        );
        sessionStorage.setItem(
          `quiz_nickname_${res.sessionId}`,
          res.nickname || joinNickname
        );
        router.push(`/quiz/session/${joinCode.toUpperCase()}`);
      } else {
        setJoinError(res.error || "Impossible de rejoindre cette session");
      }
    } catch (err) {
      setJoinError("Une erreur inattendue est survenue");
    } finally {
      setJoinLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Animation ECG en haut */}
      <EcgLine />

      {/* En-tête */}
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10 mb-12 text-center">
          <div className="mb-4 inline-flex items-center space-x-2">
            <Heart className="h-7 w-7 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-800 md:text-4xl">
              Catalogue de Quiz de Secourisme
            </h1>
          </div>
          <p className="mx-auto max-w-3xl text-lg text-gray-600">
            Testez et améliorez vos connaissances en secourisme avec nos quiz
            interactifs.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-5 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition-colors hover:bg-purple-100"
            >
              <Users className="h-4 w-4" />
              {showJoinForm
                ? "Masquer la connexion multijoueurs"
                : "Rejoindre une session multijoueurs 🎮"}
            </button>
          </div>
        </div>

        {/* Rejoindre une session multijoueurs */}
        <AnimatePresence>
          {showJoinForm && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 mx-auto mb-10 max-w-xl overflow-hidden rounded-2xl border border-purple-100 bg-white p-6 shadow-md"
            >
              <h2 className="mb-4 text-center text-lg font-bold text-gray-800">
                Rejoindre une session multijoueurs
              </h2>
              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="join-code"
                      className="mb-1 block text-xs font-semibold text-gray-600 uppercase"
                    >
                      Code du salon
                    </label>
                    <input
                      id="join-code"
                      type="text"
                      placeholder="Ex: A5B2"
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      maxLength={4}
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-bold tracking-wider text-gray-800 uppercase focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="join-nickname"
                      className="mb-1 block text-xs font-semibold text-gray-600 uppercase"
                    >
                      Votre Pseudo
                    </label>
                    <input
                      id="join-nickname"
                      type="text"
                      placeholder="Ex: Secouriste44"
                      value={joinNickname}
                      onChange={(e) => setJoinNickname(e.target.value)}
                      maxLength={20}
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
                {joinError && (
                  <p
                    className="text-center text-sm font-medium text-red-600"
                    role="alert"
                  >
                    {joinError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:bg-purple-400"
                >
                  {joinLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                  Rejoindre la partie 🎮
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* État de chargement */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <p className="text-center">{error}</p>
          </div>
        )}

        {/* Liste des quiz */}
        {!loading && !error && (
          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg"
                variants={itemVariants}
              >
                <div className="flex h-full flex-col p-6">
                  <div className="flex-grow">
                    <div className="-mx-6 -mt-6 mb-6 border-b border-blue-100 bg-blue-50 p-6">
                      <h3 className="flex min-h-[56px] items-center text-xl leading-tight font-bold text-gray-800">
                        {quiz.title}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center rounded-lg bg-gray-50 p-3">
                        <Activity className="mr-3 h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Temps par question
                          </p>
                          <p className="text-sm text-gray-600">
                            {quiz.timePerQuestion} secondes
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center rounded-lg bg-gray-50 p-3">
                        <Heart className="mr-3 h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Score minimum requis
                          </p>
                          <p className="text-sm text-gray-600">
                            {quiz.passingScore}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center rounded-lg bg-gray-50 p-3">
                        <List className="mr-3 h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Nombre de questions
                          </p>
                          <p className="text-sm text-gray-600">
                            {quiz.questionCount} questions
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedQuizId(quiz.id);
                      setIsModalOpen(true);
                    }}
                    className="mt-6 flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Commencer le quiz
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Message si aucun quiz */}
        {!loading && !error && quizzes.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-600">
              Aucun quiz disponible pour le moment.
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && quizzes.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={currentPage === 1}
            >
              Page précédente
            </button>
            <span className="rounded-lg bg-gray-100 px-4 py-2">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              Page suivante
            </button>
          </div>
        )}
      </div>

      {/* Modal de sélection de difficulté */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-xl bg-white p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="mb-4 text-2xl font-bold text-gray-800">
              Choisissez votre niveau
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <h3 className="font-semibold text-gray-800">Mode Random</h3>
                <p className="text-sm text-gray-600">
                  Les questions seront affichées dans un ordre aléatoire
                </p>
              </div>
              <button
                onClick={() => setIsRandomMode(!isRandomMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isRandomMode ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isRandomMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <button
              onClick={() => handleQuizStart("easy")}
              className="w-full rounded-lg border-2 border-green-200 bg-green-50 p-4 text-left transition-colors hover:bg-green-100"
            >
              <h3 className="mb-1 font-semibold text-green-800">Mode Facile</h3>
              <p className="text-sm text-gray-600">
                Affichage des mauvaises réponses et sans chronomètre
              </p>
            </button>

            <button
              onClick={() => handleQuizStart("medium")}
              className="w-full rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
            >
              <h3 className="mb-1 font-semibold text-blue-800">
                Mode Intermédiaire
              </h3>
              <p className="text-sm text-gray-600">
                Avec chronomètre et affichage des mauvaises réponses
              </p>
            </button>

            <button
              onClick={() => handleQuizStart("hard")}
              className="w-full rounded-lg border-2 border-red-200 bg-red-50 p-4 text-left transition-colors hover:bg-red-100"
            >
              <h3 className="mb-1 font-semibold text-red-800">
                Mode Difficile
              </h3>
              <p className="text-sm text-gray-600">
                Avec chronomètre, sans affichage des mauvaises réponses ni de la
                progression
              </p>
            </button>

            <div className="my-2 border-t border-gray-100" />

            {isServerSaturated ? (
              <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 text-center">
                <h3 className="text-yellow-850 mb-1 flex items-center justify-center gap-2 font-semibold text-yellow-800">
                  Session multijoueurs temporairement indisponible ⏳
                </h3>
                <p className="text-sm text-gray-600">
                  Les serveurs de jeu sont actuellement très demandés. Veuillez
                  réessayer plus tard ou lancer une partie solo !
                </p>
              </div>
            ) : (
              <button
                onClick={handleCreateMultiplayerSession}
                disabled={multiplayerLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-purple-200 bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100 disabled:opacity-50"
              >
                <div className="flex-grow">
                  <h3 className="mb-1 flex items-center gap-2 font-semibold text-purple-800">
                    {multiplayerLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Lancer en Multijoueurs 🚀
                  </h3>
                  <p className="text-sm text-gray-600">
                    Créez une session de jeu partagée pour jouer avec d'autres
                    en temps réel.
                  </p>
                </div>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizCatalogue;
