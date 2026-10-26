import { federationLabel, type Federation } from "./federations";

// Documents de session disponibles selon la fédération de l'organisme.
// Partagé client / serveur : aucune dépendance serveur ici.

export type DocumentKey =
  "pv" | "emargement" | "fise" | "fiche-formative" | "attestation";

const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  pv: "PV de formation",
  emargement: "Feuille d'émargement",
  fise: "FISE",
  "fiche-formative": "Fiche d'évaluation formative",
  attestation: "Attestation de fin de formation",
};

/** Documents génériques, valables quelle que soit la fédération. */
const COMMON_DOCUMENTS: DocumentKey[] = [
  "emargement",
  "fise",
  "fiche-formative",
  "attestation",
];

/** Modèles propres à une fédération, fournis par celle-ci. */
const FEDERATION_DOCUMENTS: Partial<Record<Federation, DocumentKey[]>> = {
  CROIX_BLANCHE: ["pv"],
};

/** Documents qu'une fédération fournit en propre (union de toutes). */
export const FEDERATION_SPECIFIC: DocumentKey[] = [
  ...new Set(Object.values(FEDERATION_DOCUMENTS).flat()),
];

/** Champs de l'organisme utiles à la génération des documents. */
export type DocumentOrganisme = {
  name: string;
  city: string | null;
  federation: Federation | null;
  federationName: string | null;
  documentHeader: string | null;
};

export const TEMPLATE_REQUEST_EMAIL = "contact@rescuelearn.fr";
export const TEMPLATE_DELIVERY_DAYS = 5;

export function availableDocuments(
  federation: Federation | null
): DocumentKey[] {
  const own = federation ? (FEDERATION_DOCUMENTS[federation] ?? []) : [];
  return [...own, ...COMMON_DOCUMENTS];
}

export function missingFederationDocuments(
  federation: Federation | null
): boolean {
  return !federation || !FEDERATION_DOCUMENTS[federation]?.length;
}

/** Libellés des documents de fédération que l'organisme n'a pas encore. */
export function missingDocumentLabels(federation: Federation | null): string[] {
  const own = new Set(availableDocuments(federation));
  return FEDERATION_SPECIFIC.filter((key) => !own.has(key)).map(
    (key) => DOCUMENT_LABELS[key]
  );
}

/**
 * Lignes d'en-tête des documents : saisie libre de l'organisme,
 * à défaut son nom puis sa ville.
 */
export function documentHeaderLines(
  organisme: Pick<DocumentOrganisme, "name" | "city" | "documentHeader">
): string[] {
  const lines = (organisme.documentHeader ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0) return lines;
  return [organisme.name, organisme.city?.trim()].filter(
    (line): line is string => !!line
  );
}

/** Lien mailto pré-rempli pour transmettre ses modèles à l'équipe. */
export function buildTemplateRequestMailto(
  organisme: Omit<DocumentOrganisme, "documentHeader">
): string {
  const federation =
    federationLabel(organisme.federation, organisme.federationName) ??
    "Fédération non renseignée";
  const subject = `Modèles de documents – ${federation} – ${organisme.name}`;
  const body = [
    "Bonjour,",
    "",
    "Voici nos modèles de documents pour permettre leur génération dans RescueLearn.",
    "",
    `Organisme : ${organisme.name}`,
    `Fédération : ${federation}`,
    `Ville : ${organisme.city?.trim() || "—"}`,
    "",
    "Documents attendus :",
    ...missingDocumentLabels(organisme.federation).map((label) => `- ${label}`),
    "",
    "Joignez vos modèles (PDF, DOCX) à ce mail.",
  ].join("\n");
  return `mailto:${TEMPLATE_REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
