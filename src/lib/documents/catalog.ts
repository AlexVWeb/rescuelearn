import { federationLabel, type Federation } from "./federations";
import {
  availableDocuments,
  FEDERATION_SPECIFIC,
  type DocumentKey,
} from "./registry";

// Catalogue des modèles affiché dans l'onglet « Modèles documents ».
// Partagé client / serveur : aucune dépendance serveur ici.

export type TemplateId =
  | "emargement"
  | "attestation"
  | "fise-psc"
  | "fiche-formative"
  | "fise-pse1"
  | "fise-pse2"
  | "grille-pse1"
  | "grille-pse2"
  | "pv";

export type TemplateFormation = "Commun" | "PSC" | "PSE1" | "PSE2";

export type DocumentTemplate = {
  id: TemplateId;
  document: DocumentKey;
  title: string;
  description: string;
  formation: TemplateFormation;
  /** Page montrée en miniature et à l'ouverture (1 par défaut) */
  page?: number;
  /** Faux : modèle de fédération pas encore intégré pour cet organisme */
  available: boolean;
};

export type TemplateSection = {
  id: "communs" | "psc" | "pse" | "federation";
  title: string;
  templates: DocumentTemplate[];
};

const TEMPLATES: Omit<DocumentTemplate, "available">[] = [
  {
    id: "emargement",
    document: "emargement",
    title: "Feuille d'émargement",
    description: "Présences par créneau, à signer ou à archiver.",
    formation: "Commun",
  },
  {
    id: "attestation",
    document: "attestation",
    title: "Attestation de fin de formation",
    description: "Remise à chaque stagiaire à l'issue de la formation.",
    formation: "Commun",
  },
  {
    id: "fise-psc",
    document: "fise",
    title: "FISE PSC",
    description: "Fiche individuelle de suivi et d'évaluation.",
    formation: "PSC",
  },
  {
    id: "fiche-formative",
    document: "fiche-formative",
    title: "Fiche d'évaluation formative",
    description: "Mises en situation évaluées, une fiche par stagiaire.",
    formation: "PSC",
  },
  {
    id: "fise-pse1",
    document: "fise",
    title: "FISE PSE1",
    description: "Fiche individuelle de suivi et d'évaluation.",
    formation: "PSE1",
  },
  {
    id: "fise-pse2",
    document: "fise",
    title: "FISE PSE2",
    description: "Fiche individuelle de suivi et d'évaluation.",
    formation: "PSE2",
  },
  {
    id: "grille-pse1",
    document: "fise",
    title: "Grille d'évaluation PSE1",
    description: "Techniques évaluées et synthèse, page 2 de la FISE PSE1.",
    formation: "PSE1",
    page: 2,
  },
  {
    id: "grille-pse2",
    document: "fise",
    title: "Grille d'évaluation PSE2",
    description: "Techniques évaluées, page 2 de la FISE PSE2.",
    formation: "PSE2",
    page: 2,
  },
  {
    id: "pv",
    document: "pv",
    title: "PV de formation",
    description: "Procès-verbal avec l'issue de chaque stagiaire.",
    formation: "Commun",
  },
];

const isFederationSpecific = (t: { document: DocumentKey }) =>
  FEDERATION_SPECIFIC.includes(t.document);

export function documentTemplateSections(
  federation: Federation | null,
  federationName: string | null
): TemplateSection[] {
  const available = new Set(availableDocuments(federation));
  const templates = TEMPLATES.map((t) => ({
    ...t,
    available: available.has(t.document),
  }));
  const generic = templates.filter((t) => !isFederationSpecific(t));
  const label = federationLabel(federation, federationName);

  return [
    {
      id: "communs",
      title: "Documents communs",
      templates: generic.filter((t) => t.formation === "Commun"),
    },
    {
      id: "psc",
      title: "PSC",
      templates: generic.filter((t) => t.formation === "PSC"),
    },
    {
      id: "pse",
      title: "PSE",
      templates: generic.filter(
        (t) => t.formation === "PSE1" || t.formation === "PSE2"
      ),
    },
    {
      id: "federation",
      title: label ? `Modèles ${label}` : "Modèles de fédération",
      templates: templates.filter(isFederationSpecific),
    },
  ];
}
