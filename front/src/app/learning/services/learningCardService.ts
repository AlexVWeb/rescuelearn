import axios from 'axios';
import { ApiLearningCard, ApiLearningCardResponse, ApiLearningCardFilterResponse, ApiLearningCardFilters } from '../interfaces/LearningCard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const learningCardService = {
  async getAllCards(): Promise<ApiLearningCard[]> {
    try {
      const response = await axios.get<ApiLearningCardResponse>(`${API_BASE_URL}/learning_cards_api/cards`);
      return response.data.member || [];
    } catch {
      return [];
    }
  },

  async getThemesAndNiveaux(): Promise<ApiLearningCardFilters> {
    try {
      const response = await axios.get<ApiLearningCardFilterResponse>(`${API_BASE_URL}/learning_cards_api/filter`);
      return {
        themes: response.data.themes,
        niveaux: response.data.niveaux
      };
    } catch {
      return { themes: [], niveaux: [] };  
    }
  }
}; 