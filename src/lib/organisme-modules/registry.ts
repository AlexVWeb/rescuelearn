// Modules activables par organisme. Ajouter un module = ajouter une entrée ici
// (aucune migration : l'absence de ligne en base vaut `defaults`).
export const ORGANISME_MODULES = {
  evaluation: {
    label: "Évaluations à chaud et à froid",
    description:
      "Questionnaires de satisfaction envoyés aux stagiaires après la session.",
    disabledHint:
      "Désactivé : les réponses existantes sont conservées, les envois sont suspendus.",
    defaults: { available: true, enabled: false },
  },
} as const;

export type OrganismeModuleKey = keyof typeof ORGANISME_MODULES;

export const ORGANISME_MODULE_KEYS = Object.keys(
  ORGANISME_MODULES
) as OrganismeModuleKey[];

export function isOrganismeModuleKey(
  value: string
): value is OrganismeModuleKey {
  return value in ORGANISME_MODULES;
}
