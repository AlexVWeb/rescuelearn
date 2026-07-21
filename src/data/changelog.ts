export interface ChangelogItem {
  id: string;
  title: string;
  description: string;
  date?: string; // Optionnel si planifié/en cours
  status: "completed" | "in-progress" | "planned";
  category: "feature" | "improvement" | "bugfix";
  details?: string[];
}

export const changelogData: ChangelogItem[] = [
  {
    id: "formations-externes-logo",
    title: "Gestion des Formations Externes & Refonte Visuelle",
    description:
      "Possibilité de modifier les formations externes, validation automatique et harmonisation graphique.",
    date: "2026-07-21",
    status: "completed",
    category: "feature",
    details: [
      "Ajout de la modification et de la mise à jour des formations externes existantes.",
      "Validation automatique de la présence stagiaire dès validation de l'émargement.",
      "Harmonisation visuelle des espaces administration et formation avec le nouveau logo de la plateforme.",
      "Nettoyage et amélioration des formulaires de session.",
    ],
  },
  {
    id: "space-organismes-emargement",
    title: "Émargement Numérique & Feuilles de Présence",
    description:
      "Déploiement initial du module d'émargement en ligne avec validation sécurisée.",
    date: "2026-07-07",
    status: "completed",
    category: "feature",
    details: [
      "Génération automatique de codes PIN uniques à 6 chiffres par créneau (slot) de formation.",
      "Validation de la présence stagiaire via QR Code et signature sur mobile.",
      "Décryptage automatique à la volée côté base de données pour la conformité de l'émargement.",
      "Exportation au format PDF des feuilles d'émargement, attestations de fin de formation et fiches d'évaluation (FISE).",
    ],
  },
  {
    id: "progression-pse1-pse2",
    title: "Arbre de Progression PSE1 & PSE2",
    description:
      "Découpage du système d'apprentissage et de progression pour s'adapter aux deux niveaux clés du secourisme en équipe.",
    date: "2026-07-12",
    status: "completed",
    category: "feature",
    details: [
      "Séparation complète de l'arbre de progression en deux filières distinctes : PSE1 et PSE2.",
      "Génération de parcours de progression personnalisés via un créateur de nœuds d'apprentissage intelligent.",
    ],
  },
  {
    id: "quiz-multijoueur-ia",
    title: "Quiz Multijoueur & Génération IA",
    description:
      "Une toute nouvelle façon de se tester à plusieurs ou de réviser ses connaissances au quotidien.",
    date: "2026-07-10",
    status: "completed",
    category: "feature",
    details: [
      "Lobby de quiz multijoueur en temps réel avec synchronisation des participants et classement interactif.",
      "Génération automatique de quiz personnalisés par IA (Gemini API) en téléversant de simples référentiels PDF.",
      "Quiz Quotidien de révision avec calendrier de complétion et statistiques de réussite sur le tableau de bord.",
      "Paramétrage des niveaux de difficulté et distribution aléatoire (non biaisée) des questions.",
    ],
  },
  {
    id: "snv-gemini",
    title: "Scénarios de Secourisme Virtuel (SNV)",
    description:
      "Simulation interactive de cas cliniques pour s'entraîner à la prise de décision face à une victime.",
    date: "2026-07-05",
    status: "completed",
    category: "feature",
    details: [
      "Génération intelligente de cas cliniques (victimes, antécédents, bilans) via l'IA Gemini en se basant sur les recommandations officielles.",
      "Interface d'entraînement guidée pour dérouler les bilans secouristes étape par étape.",
    ],
  },
  {
    id: "glasgow-simulator",
    title: "Simulateur du Score de Glasgow",
    description:
      "Outil d'apprentissage interactif pour évaluer l'état de conscience d'une victime.",
    date: "2026-07-02",
    status: "completed",
    category: "feature",
    details: [
      "Calculateur dynamique interactif du score (Y-V-M) avec validation instantanée.",
      "Tableaux mnémotechniques et grilles de référence intégrés pour la traumatologie.",
    ],
  },
  {
    id: "security-anonymization",
    title: "Sécurité, Multi-tenant & RGPD",
    description:
      "Renforcement global de la sécurité du stockage des données et de l'isolation des organismes.",
    date: "2026-06-28",
    status: "completed",
    category: "improvement",
    details: [
      "Chiffrement de bout en bout (AES-256-GCM) des informations sensibles (signatures, émargements) directement dans la base de données.",
      "Système d'archivage légal et purge automatisée (anonymisation) des données stagiaires après la période de conservation réglementaire.",
      "Système d'invitations sécurisées par email pour les membres d'un organisme avec validation de rôle (RBAC).",
    ],
  },
  {
    id: "siret-integration",
    title: "Recherche SIRET Automatique & Qualiopi",
    description: "Simplification de l'inscription des organismes de formation.",
    date: "2026-06-15",
    status: "completed",
    category: "improvement",
    details: [
      "Remplissage automatique des formulaires grâce à l'API SIRET (Raison sociale, adresse, etc.).",
      "Ajout des champs administratifs requis pour le suivi qualité Qualiopi.",
      "Support du téléversement sécurisé de logos pour la personnalisation des documents générés.",
    ],
  },
];
