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
    id: "attestation-signature-formateur",
    title: "Signature des Attestations par le Formateur",
    description:
      "Le formateur de la session signe électroniquement les attestations de fin de formation au moment de les publier dans l'espace stagiaire.",
    date: "2026-10-23",
    status: "completed",
    category: "feature",
    details: [
      "Tracé de la signature au doigt, au stylet ou à la souris, réservé aux formateurs affectés à la session.",
      "Attestation figée à la signature : le stagiaire télécharge exactement le document signé, avec date, heure et référence.",
      "Empreinte numérique conservée pour chaque attestation, preuve de son intégrité.",
      "Résultats, inscrits et formateurs verrouillés tant que les attestations signées restent publiées.",
    ],
  },
  {
    id: "espace-stagiaire-documents",
    title: "Portail Stagiaire & Partage Sécurisé de Documents",
    description:
      "Déploiement d'un espace dédié aux apprenants avec accès sans mot de passe, consultation de supports et téléchargement des attestations.",
    date: "2026-10-23",
    status: "completed",
    category: "feature",
    details: [
      "Accès simplifié et sécurisé via un lien personnel unique sans création de mot de passe.",
      "Partage des supports de formation et documents pédagogiques avec visibilité programmable à la minute.",
      "Téléchargement direct des attestations de fin de formation dès leur publication par l'organisme.",
      "Émargement électronique autonome avec saisie sécurisée du code PIN et traçabilité de signature.",
    ],
  },
  {
    id: "attestation-dates-horaires-fix",
    title: "Correction des Dates et Horaires sur les Attestations",
    description:
      "Affichage précis des plages de dates multi-jours et fiabilisation des plages horaires sur les attestations de fin de formation.",
    date: "2026-10-23",
    status: "completed",
    category: "bugfix",
    details: [
      "Prise en compte des sessions multi-jours avec affichage de la plage complète ('du ... au ...').",
      "Calcul fiabilisé des créneaux horaires entre l'heure de début la plus matinale et l'heure de fin la plus tardive.",
      "Cohérence totale entre les dates, la plage horaire quotidienne et la durée totale en heures de la formation.",
    ],
  },
  {
    id: "session-phases-groupes-formateurs",
    title: "Organisation des Sessions en 3 Phases & Multi-Formateurs",
    description:
      "Restructuration de l'espace session en 3 étapes guidées (Préparer, Animer, Clôturer) avec gestion des équipes pédagogiques et groupes d'ateliers.",
    date: "2026-10-22",
    status: "completed",
    category: "feature",
    details: [
      "Déroulement clair et guidé de la session à travers 3 phases : Préparer, Animer et Clôturer.",
      "Co-animation et équipe pédagogique : assignation de plusieurs formateurs et d'un responsable pédagogique par session.",
      "Répartition des stagiaires en sous-groupes de travail avec affectation d'un formateur référent.",
      "Intégration des grilles d'évaluation officielles complètes pour le PSE1 et le PSE2 (FISE).",
    ],
  },
  {
    id: "quiz-referentiel-justifications",
    title: "Liaison aux Référentiels Officiels & Corrections Détaillées",
    description:
      "Accès direct au texte officiel justifiant chaque réponse de quiz et carte de révision.",
    date: "2026-10-13",
    status: "completed",
    category: "improvement",
    details: [
      "Ouverture automatique à la page exacte du référentiel officiel correspondant (PDF) depuis les questions et flashcards.",
      "Affichage immédiat des corrections et explications à l'issue de chaque question en partie multijoueur.",
      "Outils d'édition groupée des cartes d'apprentissage pour les formateurs.",
    ],
  },
  {
    id: "exercices-video-progression",
    title: "Exercices Vidéo & Parcours de Progression Dynamique",
    description:
      "Enrichissement des parcours d'apprentissage avec des modules vidéo interactifs et validation des paliers.",
    date: "2026-10-11",
    status: "completed",
    category: "feature",
    details: [
      "Intégration d'exercices vidéo pédagogiques avec suivi du visionnage et validation des acquis.",
      "Validation sécurisée des tentatives côté serveur pour l'ascension des niveaux de compétences.",
      "Paramétrage des modules visibles sur le tableau de bord apprenant.",
    ],
  },
  {
    id: "passkey-auth-profil",
    title: "Connexion par Passkey (Biométrie) & Sécurité du Profil",
    description:
      "Connexion moderne et rapide sans mot de passe via empreinte digitale ou reconnaissance faciale.",
    date: "2026-10-06",
    status: "completed",
    category: "feature",
    details: [
      "Support des clés d'accès Passkey (Touch ID, Face ID, Windows Hello) pour une authentification instantanée.",
      "Changement sécurisé d'adresse email avec lien de confirmation préalable.",
      "Gestion et mise à jour autonomes du mot de passe et des données de profil utilisateur.",
    ],
  },
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
      "Verrouillage strict des sessions clôturées (créneaux, inscriptions, émargements et résultats), tout en préservant l'édition des données personnelles des stagiaires.",
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
