'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, BookOpen, AlertTriangle } from 'lucide-react';
import { Quiz } from './interfaces/Quiz';
import { quizData, categories, difficultyLevels } from './data/quizData';
import { EcgLine } from './components/EcgLine';
import { QuizCard } from './components/QuizCard';
import { SearchFilters } from './components/SearchFilters';

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

const filterVariants = {
  closed: { height: 0, opacity: 0 },
  open: { height: "auto", opacity: 1 }
};

// Composant principal
const QuizCatalogue = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>(quizData);
  const [activeFilter, setActiveFilter] = useState<boolean>(false);
  const [hoverCard, setHoverCard] = useState<number | null>(null);

  // Filtrer les quiz en fonction des sélections
  useEffect(() => {
    let filtered = quizData;
    
    // Filtrer par catégorie
    if (selectedCategory !== "Tous") {
      filtered = filtered.filter(quiz => quiz.category === selectedCategory);
    }
    
    // Filtrer par difficulté
    if (selectedDifficulty !== "Tous") {
      filtered = filtered.filter(quiz => quiz.difficulty === selectedDifficulty);
    }
    
    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(query) || 
        quiz.description.toLowerCase().includes(query) ||
        quiz.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    setFilteredQuizzes(filtered);
  }, [selectedCategory, selectedDifficulty, searchQuery]);

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
            Des gestes de base aux techniques avancées.
          </p>
        </div>
        
        {/* Filtres de recherche */}
        <SearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          categories={categories}
          difficultyLevels={difficultyLevels}
          filterVariants={filterVariants}
        />
        
        {/* Affichage des résultats */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-700">
            {filteredQuizzes.length} quiz {filteredQuizzes.length === 1 ? "trouvé" : "trouvés"}
          </p>
          
          <div className="flex space-x-2">
            <button className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <Activity className="h-4 w-4" />
              <span>Populaires</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
              <BookOpen className="h-4 w-4" />
              <span>Récents</span>
            </button>
          </div>
        </div>
        
        {/* Grille de quiz */}
        {filteredQuizzes.length > 0 ? (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                isHovered={hoverCard === quiz.id}
                onHover={setHoverCard}
                itemVariants={itemVariants}
              />
            ))}
          </motion.div>
        ) : (
          // Message quand aucun quiz ne correspond aux critères
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun quiz trouvé</h3>
            <p className="text-gray-600 mb-4">Essayez de modifier vos critères de recherche ou de filtrage.</p>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
              onClick={() => {
                setSelectedCategory("Tous");
                setSelectedDifficulty("Tous");
                setSearchQuery("");
              }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
      
      {/* Pied de page */}
      <div className="max-w-7xl mx-auto mt-16 text-center">
        <div className="text-sm text-gray-600 flex items-center justify-center mb-4">
          <Activity className="w-4 h-4 text-red-500 mr-2" />
          <span>Formez-vous aux gestes qui sauvent</span>
        </div>
      </div>
    </div>
  );
};

export default QuizCatalogue; 