'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Quiz, QuizCollection } from './interfaces/Quiz';
import { EcgLine } from './components/EcgLine';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useRouter } from 'next/navigation';

// Variants pour les animations Framer Motion
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

// Composant principal
const QuizCatalogue = () => {
  const [mounted, setMounted] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/quizzes?page=${currentPage}`);
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des quiz');
        }
        const data: QuizCollection = await response.json();
        setQuizzes(data.member);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [currentPage, mounted]);

  const handleQuizStart = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (selectedQuizId) {
      router.push(`/quiz/${selectedQuizId}?difficulty=${difficulty}`);
      setIsModalOpen(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Animation ECG en haut */}
      <EcgLine />
      
      {/* En-tête */}
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 relative z-10">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Heart className="w-7 h-7 text-red-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Catalogue de Quiz de Secourisme</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Testez et améliorez vos connaissances en secourisme avec nos quiz interactifs.
          </p>
        </div>
        
        {/* État de chargement */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="text-center">{error}</p>
          </div>
        )}

        {/* Liste des quiz */}
        {!loading && !error && (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                variants={itemVariants}
              >
                <div className="p-6">
                  <h3 className="font-bold text-gray-800 text-lg mb-4">{quiz.title}</h3>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 mr-1" />
                      <span>{quiz.timePerQuestion}s par question</span>
                    </div>
                    <div className="flex items-center">
                      <span>Score minimum : {quiz.passingScore}%</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedQuizId(quiz.id);
                      setIsModalOpen(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center transition-colors"
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
          <div className="text-center py-12">
            <p className="text-gray-600">Aucun quiz disponible pour le moment.</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && quizzes.length > 0 && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              disabled={currentPage === 1}
            >
              Page précédente
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-lg">
              Page {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Page suivante
            </button>
          </div>
        )}
      </div>

      {/* Modal de sélection de difficulté */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white rounded-xl shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 mb-4">Choisissez votre niveau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <button
              onClick={() => handleQuizStart('easy')}
              className="w-full p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold text-green-800 mb-1">Mode Facile</h3>
              <p className="text-sm text-gray-600">Affichage des mauvaises réponses et sans chronomètre</p>
            </button>

            <button
              onClick={() => handleQuizStart('medium')}
              className="w-full p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold text-blue-800 mb-1">Mode Intermédiaire</h3>
              <p className="text-sm text-gray-600">Avec chronomètre et affichage des mauvaises réponses</p>
            </button>

            <button
              onClick={() => handleQuizStart('hard')}
              className="w-full p-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold text-red-800 mb-1">Mode Difficile</h3>
              <p className="text-sm text-gray-600">Avec chronomètre, sans affichage des mauvaises réponses ni de la progression</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizCatalogue; 