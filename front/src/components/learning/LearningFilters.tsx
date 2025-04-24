'use client';

import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningFiltersProps {
  themes: string[];
  niveaux: string[];
  selectedTheme: string | null;
  selectedNiveau: string | null;
  onThemeChange: (theme: string | null) => void;
  onNiveauChange: (niveau: string | null) => void;
  className?: string;
}

export function LearningFilters({
  themes,
  niveaux,
  selectedTheme,
  selectedNiveau,
  onThemeChange,
  onNiveauChange,
  className,
}: LearningFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Filter className="h-4 w-4" />
        <span>Filtres</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onThemeChange(null)}
          className={cn(
            'rounded-full px-3 py-1 text-sm transition-colors',
            !selectedTheme
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Tous les thèmes
        </button>
        {themes.map((theme) => (
          <button
            key={theme}
            onClick={() => onThemeChange(theme)}
            className={cn(
              'rounded-full px-3 py-1 text-sm transition-colors',
              selectedTheme === theme
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {theme}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onNiveauChange(null)}
          className={cn(
            'rounded-full px-3 py-1 text-sm transition-colors',
            !selectedNiveau
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Tous les niveaux
        </button>
        {niveaux.map((niveau) => (
          <button
            key={niveau}
            onClick={() => onNiveauChange(niveau)}
            className={cn(
              'rounded-full px-3 py-1 text-sm transition-colors',
              selectedNiveau === niveau
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {niveau}
          </button>
        ))}
      </div>
    </motion.div>
  );
} 