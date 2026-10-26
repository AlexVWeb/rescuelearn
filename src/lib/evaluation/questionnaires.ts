// Questionnaires des évaluations à chaud et à froid. Ils sont définis en code
// et versionnés : toute modification d'une question publiée passe par une
// nouvelle version, la version d'origine reste attachée aux réponses.

export const EVALUATION_TYPES = ["chaud", "froid"] as const;
export type EvaluationType = (typeof EVALUATION_TYPES)[number];

export function isEvaluationType(value: string): value is EvaluationType {
  return (EVALUATION_TYPES as readonly string[]).includes(value);
}

export const FREE_TEXT_MAX_LENGTH = 2000;

// Échelle forcée à 4 niveaux, sans position neutre
export const RATING_SCALES = {
  satisfaction: [
    "Pas du tout satisfait",
    "Peu satisfait",
    "Satisfait",
    "Très satisfait",
  ],
  agreement: [
    "Pas du tout d'accord",
    "Plutôt pas d'accord",
    "Plutôt d'accord",
    "Tout à fait d'accord",
  ],
} as const;

export type RatingScale = keyof typeof RATING_SCALES;

export interface ChoiceOption {
  value: string;
  label: string;
}

interface BaseQuestion {
  id: string;
  label: string;
  required: boolean;
  hint?: string;
}

export type Question =
  | (BaseQuestion & { kind: "rating_1_4"; scale: RatingScale })
  | (BaseQuestion & { kind: "nps" })
  | (BaseQuestion & { kind: "yes_no" })
  | (BaseQuestion & { kind: "single_choice"; options: ChoiceOption[] })
  | (BaseQuestion & { kind: "multi_choice"; options: ChoiceOption[] })
  | (BaseQuestion & { kind: "free_text" });

export type QuestionKind = Question["kind"];

export interface QuestionnaireSection {
  id: string;
  title: string;
  questions: Question[];
}

export interface Questionnaire {
  type: EvaluationType;
  version: string;
  title: string;
  intro: string;
  estimatedMinutes: number;
  sections: QuestionnaireSection[];
}

const NPS_LABEL =
  "Recommanderiez-vous cette formation à un proche ou un collègue ?";
const NPS_HINT = "0 : pas du tout probable, 10 : très probable";

const HOT_V1: Questionnaire = {
  type: "chaud",
  version: "chaud-v1",
  title: "Évaluation de fin de formation",
  intro:
    "Votre avis nous aide à améliorer nos formations. Les réponses sont analysées de façon globale par votre organisme de formation.",
  estimatedMinutes: 3,
  sections: [
    {
      id: "satisfaction",
      title: "Votre satisfaction",
      questions: [
        {
          id: "satisfaction_globale",
          kind: "rating_1_4",
          scale: "satisfaction",
          label: "Dans l'ensemble, êtes-vous satisfait de la formation ?",
          required: true,
        },
        {
          id: "organisation",
          kind: "rating_1_4",
          scale: "satisfaction",
          label: "Organisation : accueil, horaires, salle et matériel",
          required: true,
        },
        {
          id: "rythme",
          kind: "single_choice",
          label: "Le rythme de la formation était…",
          required: true,
          options: [
            { value: "trop_lent", label: "Trop lent" },
            { value: "adapte", label: "Adapté" },
            { value: "trop_rapide", label: "Trop rapide" },
          ],
        },
      ],
    },
    {
      id: "pedagogie",
      title: "Qualité pédagogique",
      questions: [
        {
          id: "explications",
          kind: "rating_1_4",
          scale: "satisfaction",
          label: "Clarté des explications du formateur",
          required: true,
        },
        {
          id: "mises_en_situation",
          kind: "rating_1_4",
          scale: "agreement",
          label:
            "Les mises en situation m'ont permis de m'entraîner suffisamment",
          required: true,
        },
        {
          id: "supports",
          kind: "rating_1_4",
          scale: "satisfaction",
          label: "Qualité des supports remis",
          required: false,
        },
      ],
    },
    {
      id: "objectifs",
      title: "Objectifs de la formation",
      questions: [
        {
          id: "objectifs_atteints",
          kind: "rating_1_4",
          scale: "agreement",
          label: "Les objectifs annoncés ont été atteints",
          required: true,
        },
        {
          id: "capacite_intervenir",
          kind: "rating_1_4",
          scale: "agreement",
          label:
            "Je me sens capable d'intervenir face à une situation d'urgence",
          required: true,
        },
        {
          id: "attentes",
          kind: "yes_no",
          label: "La formation a-t-elle répondu à vos attentes ?",
          required: true,
        },
      ],
    },
    {
      id: "recommandation",
      title: "Recommandation et suggestions",
      questions: [
        {
          id: "nps",
          kind: "nps",
          label: NPS_LABEL,
          hint: NPS_HINT,
          required: true,
        },
        {
          id: "points_forts",
          kind: "free_text",
          label: "Ce que vous avez le plus apprécié",
          required: false,
        },
        {
          id: "suggestions",
          kind: "free_text",
          label: "Vos suggestions d'amélioration",
          required: false,
        },
      ],
    },
  ],
};

const COLD_V1: Questionnaire = {
  type: "froid",
  version: "froid-v1",
  title: "Évaluation 3 mois après la formation",
  intro:
    "Quelques mois après votre formation, nous aimerions savoir ce que vous en avez retenu et utilisé. Les réponses sont analysées de façon globale par votre organisme de formation.",
  estimatedMinutes: 2,
  sections: [
    {
      id: "pratique",
      title: "Mise en pratique",
      questions: [
        {
          id: "situation_reelle",
          kind: "yes_no",
          label:
            "Depuis la formation, avez-vous utilisé vos acquis lors d'une situation réelle ?",
          required: true,
        },
        {
          id: "gestes_utilises",
          kind: "multi_choice",
          label: "Si oui, quels gestes avez-vous mis en œuvre ?",
          hint: "Plusieurs réponses possibles",
          required: false,
          options: [
            { value: "proteger", label: "Protéger" },
            { value: "alerter", label: "Alerter les secours" },
            { value: "hemorragie", label: "Arrêter une hémorragie" },
            { value: "pls", label: "Position latérale de sécurité" },
            { value: "rcp", label: "Massage cardiaque, défibrillateur" },
            { value: "autre", label: "Autre" },
          ],
        },
        {
          id: "application",
          kind: "rating_1_4",
          scale: "agreement",
          label: "J'ai su appliquer ce que j'ai appris",
          hint: "Uniquement si vous avez été confronté à une situation réelle",
          required: false,
        },
      ],
    },
    {
      id: "acquis",
      title: "Utilité et acquis",
      questions: [
        {
          id: "utilite",
          kind: "rating_1_4",
          scale: "agreement",
          label:
            "La formation m'est utile au quotidien, personnel ou professionnel",
          required: true,
        },
        {
          id: "souvenir_gestes",
          kind: "rating_1_4",
          scale: "agreement",
          label: "Je me souviens des gestes appris",
          required: true,
        },
        {
          id: "souhait_recyclage",
          kind: "yes_no",
          label:
            "Souhaiteriez-vous suivre un recyclage ou une formation complémentaire ?",
          required: true,
        },
      ],
    },
    {
      id: "recommandation",
      title: "Recommandation",
      questions: [
        {
          id: "nps",
          kind: "nps",
          label: NPS_LABEL,
          hint: NPS_HINT,
          required: true,
        },
        {
          id: "commentaire",
          kind: "free_text",
          label: "Un commentaire sur l'utilité de la formation ?",
          required: false,
        },
      ],
    },
  ],
};

const QUESTIONNAIRES: Record<string, Questionnaire> = {
  [HOT_V1.version]: HOT_V1,
  [COLD_V1.version]: COLD_V1,
};

const CURRENT_VERSION: Record<EvaluationType, string> = {
  chaud: HOT_V1.version,
  froid: COLD_V1.version,
};

export function getCurrentQuestionnaire(type: EvaluationType): Questionnaire {
  return QUESTIONNAIRES[CURRENT_VERSION[type]];
}

/** Questionnaire d'une réponse existante : sa version, même si une plus récente existe. */
export function getQuestionnaire(version: string): Questionnaire | null {
  return QUESTIONNAIRES[version] ?? null;
}

export function allQuestions(questionnaire: Questionnaire): Question[] {
  return questionnaire.sections.flatMap((section) => section.questions);
}

export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  chaud: "Évaluation à chaud",
  froid: "Évaluation à froid",
};
