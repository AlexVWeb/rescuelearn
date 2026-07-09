import { SNVScenario, SNVCollection } from "../interfaces/SNV";
import {
  getPublicScenariosAction,
  getPublicScenarioByIdAction,
} from "@/app/actions/snv-actions";

export const snvService = {
  async getAllScenarios(page: number = 1): Promise<SNVCollection> {
    try {
      const res = await getPublicScenariosAction(page, 10);
      if (res.success && res.data && res.meta) {
        return {
          "@context": "/api/contexts/SNVScenario",
          "@id": `/api/s_n_v_scenarios?page=${page}`,
          "@type": "hydra:Collection",
          totalItems: res.meta.total,
          member: res.data.map((s) => ({
            "@context": "/api/contexts/SNVScenario",
            "@id": `/api/s_n_v_scenarios/${s.id}`,
            "@type": "SNVScenario",
            id: s.id,
            title: s.title,
            level: s.level,
            description: s.description,
            victimesCount: s.victimes.length,
            victimes: s.victimes.map((v) => ({
              "@context": "/api/contexts/SNVVictim",
              "@id": `/api/s_n_v_victims/${v.id}`,
              "@type": "SNVVictim",
              id: v.id,
              description: v.description,
              correctAnswer: v.correctAnswer,
              explanation: v.explanation,
              scenario: `/api/s_n_v_scenarios/${s.id}`,
            })),
          })),
          view: {
            "@id": `/api/s_n_v_scenarios?page=${page}`,
            "@type": "hydra:PartialCollectionView",
          },
        };
      }
      throw new Error("Erreur de récupération des scénarios.");
    } catch {
      throw new Error("Erreur lors de la récupération des scénarios");
    }
  },

  async getScenarioById(id: number): Promise<SNVScenario> {
    try {
      const res = await getPublicScenarioByIdAction(id);
      if (res.success && res.data) {
        const s = res.data;
        return {
          "@context": "/api/contexts/SNVScenario",
          "@id": `/api/s_n_v_scenarios/${s.id}`,
          "@type": "SNVScenario",
          id: s.id,
          title: s.title,
          level: s.level,
          description: s.description,
          victimesCount: s.victimes.length,
          victimes: s.victimes.map((v) => ({
            "@context": "/api/contexts/SNVVictim",
            "@id": `/api/s_n_v_victims/${v.id}`,
            "@type": "SNVVictim",
            id: v.id,
            description: v.description,
            correctAnswer: v.correctAnswer,
            explanation: v.explanation,
            scenario: `/api/s_n_v_scenarios/${s.id}`,
          })),
        };
      }
      throw new Error("Scénario introuvable.");
    } catch {
      throw new Error("Erreur lors de la récupération du scénario");
    }
  },
};
