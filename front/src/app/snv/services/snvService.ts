import { SNVScenario, SNVCollection } from '../interfaces/SNV';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const snvService = {
  async getAllScenarios(page: number = 1): Promise<SNVCollection> {
    const response = await fetch(`${API_BASE_URL}/s_n_v_scenarios?page=${page}`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des scénarios');
    }
    return response.json();
  },

  async getScenarioById(id: number): Promise<SNVScenario> {
    const response = await fetch(`${API_BASE_URL}/s_n_v_scenarios/${id}`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération du scénario');
    }
    return response.json();
  }
}; 