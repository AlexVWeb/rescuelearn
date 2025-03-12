export interface Quiz {
  id: number;
  title: string;
  category: string;
  description: string;
  duration: number;
  questions: number;
  difficulty: string;
  rating: number;
  reviews: number;
  imageUrl: string;
  tags: string[];
  popular: boolean;
  new: boolean;
  completion: number;
} 