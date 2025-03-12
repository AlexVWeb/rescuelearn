import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;
  activeFilter: boolean;
  setActiveFilter: (active: boolean) => void;
  categories: string[];
  difficultyLevels: string[];
  filterVariants: {
    closed: { height: number; opacity: number };
    open: { height: string; opacity: number };
  };
}

export const SearchFilters = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  activeFilter,
  setActiveFilter,
  categories,
  difficultyLevels,
  filterVariants
}: SearchFiltersProps) => (
  <div className="mb-8">
    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Rechercher un quiz..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <motion.button
        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setActiveFilter(!activeFilter)}
      >
        <Filter className="h-5 w-5" />
        <span>Filtres</span>
      </motion.button>
    </div>
    
    <motion.div
      className="bg-white rounded-lg shadow-md p-4 overflow-hidden"
      initial="closed"
      animate={activeFilter ? "open" : "closed"}
      variants={filterVariants}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedCategory === "Tous" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedCategory("Tous")}
            >
              Tous
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCategory === category ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de difficulté</label>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedDifficulty === "Tous" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedDifficulty("Tous")}
            >
              Tous
            </button>
            {difficultyLevels.map(level => (
              <button
                key={level}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedDifficulty === level 
                    ? level === "Débutant" 
                      ? "bg-green-100 text-green-800" 
                      : level === "Intermédiaire" 
                        ? "bg-yellow-100 text-yellow-800" 
                        : "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => setSelectedDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  </div>
); 