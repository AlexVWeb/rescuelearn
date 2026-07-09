import {
  ApiLearningCard,
  ApiLearningCardFilters,
} from "../interfaces/LearningCard";
import {
  getPublicLearningCardsAction,
  getPublicLearningCardsFiltersAction,
} from "@/app/actions/learning-card-actions";

export const learningCardService = {
  async getAllCards(): Promise<ApiLearningCard[]> {
    try {
      const res = await getPublicLearningCardsAction();
      if (res.success && res.data) {
        return res.data.map((card) => ({
          ...card,
          id: card.id.toString(),
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async getThemesAndNiveaux(): Promise<ApiLearningCardFilters> {
    try {
      const res = await getPublicLearningCardsFiltersAction();
      if (res.success && res.data) {
        return res.data;
      }
      return { themes: [], niveaux: [] };
    } catch {
      return { themes: [], niveaux: [] };
    }
  },
};
