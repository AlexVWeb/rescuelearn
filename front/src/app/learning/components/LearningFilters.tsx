'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LearningFiltersProps {
  themes: string[];
  niveaux: string[];
  selectedTheme: string | null;
  selectedNiveau: string | null;
  onThemeChange: (theme: string | null) => void;
  onNiveauChange: (niveau: string | null) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  sortOption: 'random' | 'alphabetical';
  onSortChange: (value: 'random' | 'alphabetical') => void;
}

const ITEMS_PER_PAGE_OPTIONS = [9, 18, 27, 36];

export function LearningFilters({
  themes,
  niveaux,
  selectedTheme,
  selectedNiveau,
  onThemeChange,
  onNiveauChange,
  itemsPerPage,
  onItemsPerPageChange,
  sortOption,
  onSortChange,
}: LearningFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const activeFilters = [
    ...(selectedTheme ? [`Thème: ${selectedTheme}`] : []),
    ...(selectedNiveau ? [`Niveau: ${selectedNiveau}`] : []),
    ...(sortOption === 'alphabetical' ? ['Tri: Alphabétique'] : []),
    `Éléments: ${itemsPerPage}`,
  ];

  const hasActiveFilters = selectedTheme !== null || selectedNiveau !== null || sortOption === 'alphabetical';

  const handleResetFilters = () => {
    onThemeChange(null);
    onNiveauChange(null);
    onSortChange('random');
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <span className="text-sm font-medium">
                {isFiltersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}
              </span>
              <motion.svg
                animate={{ rotate: isFiltersOpen ? 180 : 0 }}
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </motion.svg>
            </button>

            {hasActiveFilters && (
              <motion.button
                onClick={handleResetFilters}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                title="Réinitialiser les filtres"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="text-sm font-medium">Réinitialiser</span>
              </motion.button>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                >
                  {filter}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Trier par :</label>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => onSortChange('random')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors',
                  sortOption === 'random'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                )}
                title="Mode aléatoire"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Aléatoire</span>
              </motion.button>
              <motion.button
                onClick={() => onSortChange('alphabetical')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors',
                  sortOption === 'alphabetical'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                )}
                title="Ordre alphabétique"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
                <span>Alphabétique</span>
              </motion.button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Éléments par page :</label>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-600 transition-colors hover:border-gray-400"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 overflow-hidden"
          >
            <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-900">Thèmes</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onThemeChange(null)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm transition-colors',
                      selectedTheme === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Tous
                  </button>
                  {themes.map((theme) => (
                    <motion.button
                      key={theme}
                      onClick={() => onThemeChange(theme)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm transition-colors',
                        selectedTheme === theme
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {theme}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-900">Niveaux</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onNiveauChange(null)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm transition-colors',
                      selectedNiveau === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Tous
                  </button>
                  {niveaux.map((niveau) => (
                    <motion.button
                      key={niveau}
                      onClick={() => onNiveauChange(niveau)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm transition-colors',
                        selectedNiveau === niveau
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {niveau}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 