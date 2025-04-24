import axios from 'axios';
import { ApiLearningCard, ApiLearningCardResponse } from '../interfaces/LearningCard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const learningCardService = {
  async getAllCards(): Promise<ApiLearningCard[]> {
    try {
      const response = await axios.get<ApiLearningCardResponse>(`${API_BASE_URL}/learning_cards`);
      
      if (!response.data || !response.data.member) {
        return [];
      }

      return response.data.member;
    } catch {
      return [];
    }
  },

  async getCardsByTheme(theme: string): Promise<ApiLearningCard[]> {
    try {
      const response = await axios.get<ApiLearningCardResponse>(
        `${API_BASE_URL}/learning_cards?theme=${encodeURIComponent(theme)}`
      );
      return response.data.member || [];
    } catch {
      return [];
    }
  },

  async getCardsByNiveau(niveau: string): Promise<ApiLearningCard[]> {
    try {
      const response = await axios.get<ApiLearningCardResponse>(
        `${API_BASE_URL}/learning_cards?niveau=${encodeURIComponent(niveau)}`
      );
      return response.data.member || [];
    } catch {
      return [];
    }
  }
}; 