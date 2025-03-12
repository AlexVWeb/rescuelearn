export interface Quiz {
  "@id": string;
  "@type": string;
  id: number;
  title: string;
  timePerQuestion: number;
  passingScore: number;
}

export interface QuizCollection {
  "@context": string;
  "@id": string;
  "@type": string;
  totalItems: number;
  member: Quiz[];
} 