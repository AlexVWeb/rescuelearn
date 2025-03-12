import { Quiz } from '../interfaces/Quiz';

export const quizData: Quiz[] = [
  {
    id: 1,
    title: "Gestes Qui Sauvent - Niveau 1",
    category: "Initiation",
    description: "Apprenez les gestes de base pour réagir face à une situation d'urgence.",
    duration: 15,
    questions: 10,
    difficulty: "Débutant",
    rating: 4.7,
    reviews: 128,
    imageUrl: "/api/placeholder/400/250",
    tags: ["GQS", "Grand public"],
    popular: true,
    new: false,
    completion: 0
  },
  {
    id: 2,
    title: "Position Latérale de Sécurité",
    category: "Techniques",
    description: "Maîtrisez la PLS pour sécuriser une victime inconsciente qui respire.",
    duration: 10,
    questions: 8,
    difficulty: "Débutant",
    rating: 4.5,
    reviews: 92,
    imageUrl: "/api/placeholder/400/250",
    tags: ["PLS", "Inconscience"],
    popular: false,
    new: false,
    completion: 0
  },
  // ... existing quiz data ...
];

export const categories = [...new Set(quizData.map(quiz => quiz.category))];
export const difficultyLevels = ["Débutant", "Intermédiaire", "Avancé"]; 