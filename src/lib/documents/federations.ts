// Fédérations de rattachement des organismes.
// Partagé client / serveur : valeurs identiques à l'enum Prisma `Federation`.

export const FEDERATIONS = {
  CROIX_ROUGE: "Croix-Rouge française",
  FNPC: "Fédération Nationale de Protection Civile (FNPC)",
  CROIX_BLANCHE: "Fédération des Secouristes Français Croix Blanche",
  ORDRE_DE_MALTE: "Ordre de Malte France",
  FFSS: "Fédération Française de Sauvetage et de Secourisme (FFSS)",
  FNSPF: "Fédération Nationale des Sapeurs-Pompiers de France (FNSPF)",
  ANPS: "Association Nationale des Premiers Secours (ANPS)",
  UNASS:
    "Union Nationale des Associations de Secouristes et Sauveteurs (UNASS)",
  SNSM: "Société Nationale de Sauvetage en Mer (SNSM)",
  AUTRE: "Autre fédération",
} as const;

export type Federation = keyof typeof FEDERATIONS;

export const FEDERATION_VALUES = Object.keys(FEDERATIONS) as [
  Federation,
  ...Federation[],
];

const normalize = (value: string) => value.trim().toLocaleLowerCase("fr");

/** Ancien libellé libre (`federationName`) → valeur d'enum. */
export function federationFromName(
  name: string | null | undefined
): Federation | null {
  if (!name?.trim()) return null;
  const match = FEDERATION_VALUES.find(
    (value) =>
      value !== "AUTRE" && normalize(FEDERATIONS[value]) === normalize(name)
  );
  return match ?? "AUTRE";
}

/** Libellé affiché : nom libre pour AUTRE, sinon libellé officiel. */
export function federationLabel(
  federation: Federation | null,
  federationName: string | null
): string | null {
  if (!federation) return null;
  if (federation === "AUTRE")
    return federationName?.trim() || FEDERATIONS.AUTRE;
  return FEDERATIONS[federation];
}
