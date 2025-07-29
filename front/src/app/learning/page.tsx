'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LearningCard } from './components/LearningCard';
import { LearningFilters } from './components/LearningFilters';
import { learningCardService } from './services/learningCardService';
import { ApiLearningCard, ApiLearningCardFilters } from './interfaces/LearningCard';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

type SortOption = 'random' | 'alphabetical';

export default function LearningPage() {
  const [allCards, setAllCards] = useState<ApiLearningCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiLearningCard[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [sortOption, setSortOption] = useState<SortOption>('random');
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ApiLearningCardFilters>({ themes: [], niveaux: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cards, fetchedFilters] = await Promise.all([
          learningCardService.getAllCards(),
          learningCardService.getThemesAndNiveaux()
        ]);
        setAllCards(cards);
        setFilteredCards(cards);
        setFilters(fetchedFilters);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...allCards];

    if (selectedTheme) {
      filtered = filtered.filter((card) => card.theme === selectedTheme);
    }

    if (selectedNiveau) {
      filtered = filtered.filter((card) => card.niveau === selectedNiveau);
    }

    // Appliquer le tri
    if (sortOption === 'alphabetical') {
      filtered.sort((a, b) => a.theme.localeCompare(b.theme));
    } else {
      // Mélanger aléatoirement
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }

    setFilteredCards(filtered);
    setCurrentPage(1); // Réinitialiser la pagination lors du changement de filtre ou de tri
  }, [allCards, selectedTheme, selectedNiveau, sortOption]);

  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);
  const paginatedCards = filteredCards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
    setCurrentPage(1);
  };

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

      <div className="mb-8">
        <LearningFilters
          themes={filters.themes.map(t => t.theme)}
          niveaux={filters.niveaux.map(n => n.niveau)}
          selectedTheme={selectedTheme}
          selectedNiveau={selectedNiveau}
          onThemeChange={setSelectedTheme}
          onNiveauChange={setSelectedNiveau}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          sortOption={sortOption}
          onSortChange={handleSortChange}
        />
      </div>

      {paginatedCards.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <p className="text-gray-500">Aucune carte ne correspond à vos filtres</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedCards.map((card) => (
              <LearningCard
                key={card.id}
                theme={card.theme}
                niveau={card.niveau}
                info={card.info}
                reference={card.reference}
                pdfUrl={`${process.env.NEXT_PUBLIC_BACK_URL}${card.pdfUrl}`}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-md px-4 py-2 ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Affichage de {paginatedCards.length} éléments sur {filteredCards.length}
              </p>
            </div>
          )}
        </>
      )}
      <Analytics />
      <SpeedInsights />
    </main>
  );
} 