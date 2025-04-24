export interface ApiLearningCard {
  id: string;
  theme: string;
  niveau: string;
  info: string;
  reference: string;
}

export interface ApiLearningCardResponse {
  '@context': string;
  '@id': string;
  '@type': string;
  totalItems: number;
  member: ApiLearningCard[];
} 