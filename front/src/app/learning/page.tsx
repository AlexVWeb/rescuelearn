'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LearningCard } from '@/components/learning/LearningCard';
import { LearningFilters } from '@/components/learning/LearningFilters';
import { learningCardService } from './services/learningCardService';
import { ApiLearningCard } from './interfaces/LearningCard';
import { shuffleArray } from '@/app/quiz/utils/utils';

export default function LearningPage() {
  const [cards, setCards] = useState<ApiLearningCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiLearningCard[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const fetchedCards = await learningCardService.getAllCards();
        setCards(fetchedCards);
        setFilteredCards(shuffleArray(fetchedCards));
      } catch (error) {
        console.error('Erreur lors du chargement des cartes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

  useEffect(() => {
    let filtered = [...cards];

    if (selectedTheme) {
      filtered = filtered.filter((card) => card.theme === selectedTheme);
    }

    if (selectedNiveau) {
      filtered = filtered.filter((card) => card.niveau === selectedNiveau);
    }

    // Si aucun filtre n'est appliqué, on mélange les cartes
    if (!selectedTheme && !selectedNiveau) {
      filtered = shuffleArray(filtered);
    }

    setFilteredCards(filtered);
  }, [cards, selectedTheme, selectedNiveau]);

  const themes = Array.from(new Set(cards.map((card) => card.theme)));
  const niveaux = Array.from(new Set(cards.map((card) => card.niveau)));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="container mx-auto min-h-screen px-4 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8"
      >
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Cartes d&apos;apprentissage
        </h1>
        <p className="text-gray-600">
          Explorez nos cartes d&apos;apprentissage et améliorez vos connaissances
        </p>
      </motion.div>

      <LearningFilters
        themes={themes}
        niveaux={niveaux}
        selectedTheme={selectedTheme}
        selectedNiveau={selectedNiveau}
        onThemeChange={setSelectedTheme}
        onNiveauChange={setSelectedNiveau}
        className="mb-8"
      />

      {filteredCards.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <p className="text-gray-500">Aucune carte ne correspond à vos filtres</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <LearningCard
              key={card.id}
              theme={card.theme}
              niveau={card.niveau}
              info={card.info}
              reference={card.reference}
            />
          ))}
        </div>
      )}
    </main>
  );
} 