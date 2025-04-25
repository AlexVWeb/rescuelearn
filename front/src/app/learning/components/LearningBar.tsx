'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ApiLearningCard } from '@/app/learning/interfaces/LearningCard';
import { learningCardService } from '@/app/learning/services/learningCardService';

export function LearningBar() {
  const [cards, setCards] = useState<ApiLearningCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedCards = await learningCardService.getAllCards();
        
        if (Array.isArray(fetchedCards)) {
          setCards(fetchedCards);
        } else {
          setError('Format de données invalide');
        }
      } catch {
        setError('Impossible de charger les cartes d&apos;apprentissage');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

  useEffect(() => {
    if (Array.isArray(cards) && cards.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
      }, 10000);

      return () => clearInterval(timer);
    }
  }, [cards]);

  const handleReferenceClick = (e: React.MouseEvent, reference: string) => {
    e.stopPropagation();
    const pageMatch = reference.match(/Page (\d+)/);
    const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : 1;
    window.open(`/referenciels/PSE1_PSE2.pdf#page=${pageNumber}`, '_blank');
  };

  if (!isVisible || isLoading || error || !Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  const currentCard = cards[currentIndex];

  if (!currentCard) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentCard.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{currentCard.theme}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {currentCard.niveau}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{currentCard.info}</p>
                <p 
                  className="mt-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800"
                  onClick={(e) => handleReferenceClick(e, currentCard.reference)}
                >
                  {currentCard.reference}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Carte précédente"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % cards.length)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Carte suivante"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 