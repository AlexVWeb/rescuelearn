export interface ApiLearningCard {
  id: string;
  theme: string;
  niveau: string;
  info: string;
  reference: string;
  pdfUrl?: string;
}

export interface ApiLearningCardResponse {
  '@context': string;
  '@id': string;
  '@type': string;
  totalItems: number;
  member: ApiLearningCard[];
} 

export interface Theme {
  theme: string;
}

export interface Niveau {
  niveau: string;
}

export interface ApiLearningCardFilterResponse {
  themes: Theme[];
  niveaux: Niveau[];
}

export interface ApiLearningCardFilters {
  themes: Theme[];
  niveaux: Niveau[];
}