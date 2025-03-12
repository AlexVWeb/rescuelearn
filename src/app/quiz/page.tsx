'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, Loader2 } from 'lucide-react';
import { Quiz, QuizCollection } from './interfaces/Quiz';
import { EcgLine } from './components/EcgLine';

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
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Charger les quiz depuis l'API
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://symfony-geoloc.ddev.site/api/quizzes?page=${currentPage}`);
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
  }, [currentPage]);

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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center transition-colors"
                    onClick={() => window.location.href = `/quiz/${quiz.id}`}
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
      </div>
    </div>
  );
};

export default QuizCatalogue; 