# Documents générés par fédération — design

Date : 2026-10-26

## Problème

Les documents de session (PV, FISE, attestations…) sont générés de la même façon pour tous les organismes. Le PV contient en dur « COMITE DEPARTEMENTAL RHONE LYON METROPOLE / DES SECOURISTES FRANCAIS CROIX BLANCHE / Association de LYON » (`src/app/admin/training/lib/pdf-pv.tsx`). Un organisme FFSS ou Croix-Rouge obtiendrait donc un PV Croix Blanche, et un autre comité Croix Blanche obtiendrait l'en-tête de Lyon.

Le type d'organisme n'est pas exploitable : `Organisme.federationName` est un texte libre.

## Décisions

- Seul le **PV de formation** est un modèle propre à la Croix Blanche. Émargement, FISE (PSC/PSE), fiche d'évaluation formative PSC et attestation de fin de formation sont **communs**.
- Fédération sans modèles : on affiche les documents communs uniquement, avec une alerte invitant à envoyer ses modèles (délai annoncé : 5 jours ouvrés maximum).
- Envoi des modèles : lien `mailto:` pré-rempli (pas de stockage, pas de suivi).
- En-tête des documents : champ libre par organisme, aucun texte de fédération ou de comité en dur.

## Modèle de données

`prisma/schema/training.prisma` :

```prisma
enum Federation {
  CROIX_BLANCHE
  CROIX_ROUGE
  FNPC
  ORDRE_DE_MALTE
  FFSS
  FNSPF
  ANPS
  UNASS
  SNSM
  AUTRE
}

model Organisme {
  // ...
  federation     Federation?
  federationName String?  // libellé libre, utilisé quand federation = AUTRE
  documentHeader String?  // en-tête des documents, une ligne par ligne affichée
}
```

Migration de données : les 9 libellés de `PREDEFINED_FEDERATIONS` → valeur d'enum correspondante ; tout autre texte non vide → `AUTRE` ; vide → `null`. La correspondance vit dans une fonction pure `federationFromName()` (réutilisée par le seed et testée).

Formulaire organisme (`src/components/admin/organisme-form/sections/admin-info-section.tsx`) :

- le select écrit `federation` ; le champ libre `federationName` n'apparaît que pour `AUTRE` ;
- nouveau `Textarea` « En-tête des documents » (`documentHeader`), avec aide : « Une ligne par ligne d'en-tête. Ex. : Comité départemental Rhône Lyon Métropole / Fédération des Secouristes Français Croix Blanche / Association de Lyon ».
- schéma Zod (`src/lib/schemas/organisme.schema.ts`) et actions (`src/app/actions/organisme.actions.ts`) mis à jour ; longueur bornée (ex. 500 caractères, 6 lignes max).

## Registre des documents

`src/lib/documents/registry.ts` (partagé client/serveur, sans dépendance serveur) :

```ts
export type DocumentKey =
  "pv" | "emargement" | "fise" | "fiche-formative" | "attestation";

const COMMON: DocumentKey[] = [
  "emargement",
  "fise",
  "fiche-formative",
  "attestation",
];

const FEDERATION_DOCUMENTS: Partial<Record<Federation, DocumentKey[]>> = {
  CROIX_BLANCHE: ["pv"],
};

export function availableDocuments(
  federation: Federation | null
): DocumentKey[];
export function missingFederationDocuments(
  federation: Federation | null
): boolean;
export function documentHeaderLines(organisme: {
  name: string;
  city: string | null;
  documentHeader: string | null;
}): string[];
```

- `documentHeaderLines` : lignes non vides de `documentHeader` ; à défaut `[name]` puis `city` si renseignée.
- Pas de matrice par type de formation : la règle « fiche formative = PSC uniquement » reste dans `documents-section.tsx`.
- `pdf-pv.tsx` est déplacé dans `src/lib/documents/croix-blanche/pdf-pv.tsx` et reçoit `headerLines: string[]`. Les autres générateurs restent dans `src/app/admin/training/lib/`.
- La FISE PSC contenait aussi « COMITE : RHONE LYON METROPOLE / ASSOCIATION : LYON » en dur : elle reçoit les mêmes `headerLines` (optionnel, rien affiché si vide).
- Pas de garde serveur : le PV est rendu côté client à partir de données déjà accessibles.

## Interface

`src/app/admin/training/sessions/[id]/components/close/documents-section.tsx` :

- nouvelle prop `organisme: { name, city, federation, federationName, documentHeader }`, chargée par `sessions/[id]/page.tsx` ;
- `sessionDocuments` filtré par `availableDocuments(federation)`.

`<MissingTemplatesAlert>` au-dessus de la carte « Documents de la session » quand `missingFederationDocuments(federation)` :

> **Modèles {fédération} non disponibles**
> Certains documents propres à votre fédération (PV de formation…) ne sont pas encore générés par RescueLearn. Envoyez-nous vos modèles : ils seront intégrés sous **5 jours ouvrés maximum**.
> [Envoyer mes modèles]

- Bouton → `buildTemplateRequestMailto(organisme)` (fonction pure) : `mailto:contact@rescuelearn.fr`, objet `Modèles de documents – {fédération} – {organisme.name}`, corps avec organisme, fédération, ville, documents attendus, rappel « Joignez vos modèles (PDF, DOCX) à ce mail ».
- `federation = null` : texte « Renseignez votre fédération dans les paramètres de l'organisme » + lien `/admin/training/organisme`, en plus du bouton mail.
- Alerte affichée uniquement dans l'onglet Documents de la session.

## Tests (Vitest)

- `registry.test.ts` : Croix Blanche → PV + communs ; FFSS / `AUTRE` / `null` → communs seuls ; `missingFederationDocuments` ; `documentHeaderLines` (champ rempli, lignes vides ignorées, repli `name` + `city`, `city` absente).
- `federationFromName()` : 9 libellés connus, texte inconnu → `AUTRE`, vide → `null`.
- `buildTemplateRequestMailto` : encodage objet/corps (accents, `&`, retours ligne).
- PV : en-tête rendu depuis `headerLines` ; plus aucune chaîne « CROIX BLANCHE » / « RHONE » en dur dans `src/`.

## Hors périmètre

Suivi des demandes de modèles en base, dépôt de fichiers dans l'app, modèles par type de formation, en-tête dynamique sur les autres documents (possible plus tard via `documentHeaderLines`).
