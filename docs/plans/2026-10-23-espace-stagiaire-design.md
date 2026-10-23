# Espace stagiaire par lien email — Design

Date : 2026-10-23
Statut : validé (lot 0 implémenté)

## Objectif

Comme Digiforma : l'organisme envoie à chaque stagiaire d'une session un lien
personnel par email. Le lien ouvre un espace sans compte ni mot de passe, qui
donne accès :

- à l'émargement des créneaux (en salle, avec le PIN du formateur) ;
- aux supports de formation déposés par le formateur ;
- aux attestations, une fois publiées par le formateur.

## Décisions

| Sujet              | Décision                                                                          | Raison                                                         |
| ------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Identité           | `Trainee` + token par `Inscription`, pas de `User`                                | Zéro friction, pas de compte créé pour chaque stagiaire (RGPD) |
| Preuve de présence | Lien + PIN affiché en salle + fenêtre horaire du créneau                          | Le lien identifie, le PIN prouve la présence (Qualiopi)        |
| Contenus V1        | Fichiers déposés par le formateur (R2)                                            | Besoin exprimé ; R2 déjà en place (`src/lib/r2.ts`)            |
| Attestations       | Publication explicite en phase « Clôturer »                                       | Le formateur garde la main sur le moment                       |
| Résultat négatif   | Message neutre : « Votre organisme vous contactera concernant votre attestation » | Pas de résultat brut affiché                                   |
| Flux `/validation` | Conservé en secours (stagiaires sans email)                                       | Durci au lot 0                                                 |

## 1. Modèle de données

```prisma
model Inscription {
  // …existant
  accessTokenHash   String?   @unique  // SHA-256 du token, jamais le clair
  accessSentAt      DateTime?
  accessLastUsedAt  DateTime?
  pinFailedCount    Int       @default(0)
  pinLockedUntil    DateTime?
}

model Emargement {
  // …existant
  signedVia String?  // "portail" | "pin" | "formateur"
}

model TrainingSession {
  // …existant
  attestationsPublishedAt DateTime?
  documents               SessionDocument[]
}

model SessionDocument {
  id                String          @id @default(cuid())
  trainingSessionId String
  title             String
  fileKey           String          // clé R2 privée
  mimeType          String
  size              Int
  visibleFrom       DateTime?       // null = visible immédiatement
  createdAt         DateTime        @default(now())
  trainingSession   TrainingSession @relation(fields: [trainingSessionId], references: [id], onDelete: Cascade)

  @@index([trainingSessionId])
}
```

## 2. Portail stagiaire `/espace` (mobile d'abord)

### Routes

| Route                              | Type                             | Rôle                                                               |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `/espace/acces#t=…`                | page client + Route Handler POST | Lit le token dans le fragment, le POST, reçoit le cookie, redirige |
| `/espace`                          | Server Component                 | Sessions du stagiaire ; une seule → redirection                    |
| `/espace/sessions/[inscriptionId]` | Server Component                 | Page de session                                                    |
| `/espace/lien-invalide`            | statique                         | Lien révoqué ou inconnu, renvoi vers l'organisme                   |

Token dans le **fragment** : jamais envoyé au serveur, donc absent des logs,
des `Referer` et des proxys. Token **réutilisable** : les scanners de messagerie
(Outlook Safe Links) ouvrent les liens avant l'humain.

Layout propre (hors `(public)`) : logo et nom de l'organisme, « avec
RescueLearn » en discret, « Se déconnecter », `noindex`.

### Page de session : une colonne, ordonnée par le temps

```
┌─────────────────────────────────┐
│ [logo] Secours Formation 31     │
├─────────────────────────────────┤
│ PSE1 · Formation initiale   h1  │
│ 12–16 nov. · Toulouse, salle B  │
│ ┌ À faire maintenant ─────────┐ │
│ │ Émarger · Matinée 9h–12h30  │ │
│ │ Code affiché en salle       │ │
│ │ [ _ _ _ _ _ _ ]             │ │
│ │ [ Je confirme ma présence ] │ │
│ └─────────────────────────────┘ │
│ Planning et émargement      h2  │
│  ✓ Mar. 12 · Matin  signé 9h04  │
│  ● Mer. 13 · Matin  en cours    │
│  ○ Mer. 13 · A-midi ouvre 13h45 │
│ Documents                   h2  │
│ Attestation                 h2  │
└─────────────────────────────────┘
```

`md` et plus : 2 colonnes (action + planning | documents + attestation), `max-w-4xl`.

### États

- Créneau : à venir (désactivé, « ouvre à 13h45 »), ouvert (PIN), signé (✓ + heure),
  non émargé passé (neutre, pas de rouge), absent marqué par le formateur.
- Émargement : pending via `useActionState`, erreur inline (`aria-describedby`),
  succès en `aria-live="polite"` puis focus sur la ligne signée, action idempotente.
- Ouverture d'un créneau : `router.refresh()` à l'heure d'ouverture, pas de polling.
- Documents : bloc masqué si vide ; téléchargement par URL présignée 5 min.
- Attestation : texte d'attente → bouton « Télécharger mon attestation (PDF) ».
- Chargement : `loading.tsx` + `Skeleton` aux dimensions réelles (CLS nul).

A11y : `header`/`main`, h1 → h2, cibles ≥ 44px, PIN `inputMode="numeric"`
`autoComplete="one-time-code"`, uniquement des tokens de couleur.

## 3. Côté formateur

Une seule section ajoutée dans `src/app/admin/training/lib/session-progress.ts` :
`prepare.sections.supports = "Supports"`.

- **Préparer › Stagiaires** : colonne « Accès portail » (Non envoyé / Envoyé /
  Ouvert / Pas d'email, variantes `cva` du `Badge`). Bouton « Envoyer les accès »
  (non reçus | tous). Menu ligne : Envoyer/Renvoyer, Copier le lien, QR code,
  Révoquer. Copier et renvoyer **régénèrent** le token (l'ancien meurt, libellé
  explicite). Envoi via le SMTP de l'organisme, repli plateforme, concurrence 5,
  toast récapitulatif.
- **Préparer › Supports** : dépôt direct vers R2 par URL présignée PUT (limite
  4,5 Mo des Server Actions), 25 Mo max, PDF/JPG/PNG/PPTX/DOCX, type vérifié
  par magic bytes après upload. Titre éditable, « Visible à partir du ».
- **Animer › Émargement** : `signedVia` affiché en infobulle.
- **Clôturer › Documents** : « Publier dans l'espace stagiaire » / « Dépublier »,
  `AlertDialog` si résultats manquants, option « Prévenir par email ». Droits
  identiques à `updateAttestationResults`.

## 4. Sécurité, RGPD, tests

### Lien et cookie

- Token : 32 octets `randomBytes`, base64url ; SHA-256 en base.
- Cookie `rl_trainee` : JWT HS256 (`jose`), `sub` = inscriptionId, `fp` = 16
  premiers caractères du hash ; `httpOnly`, `Secure`, `SameSite=Lax`,
  `path=/espace`, 30 j. Le `fp` est recomparé à chaque requête : révocation immédiate.
- `requireTrainee()` (`src/lib/trainee-session.ts`) appelé par chaque page et
  action de `/espace`. Aucun identifiant accepté depuis le client.
- Pas d'expiration : le stagiaire accède à ses supports et à son attestation à tout moment. Le lien cesse de fonctionner à la révocation ou régénération par le formateur, à la suppression de l'inscription ou de la session (cascade), ou à l'anonymisation RGPD. Le cookie dure 30 j ; au-delà, le stagiaire rouvre simplement le lien du mail.
- En-têtes `/espace` : `Cache-Control: no-store`, `Referrer-Policy: no-referrer`,
  `X-Robots-Tag: noindex`.

### Émargement portail : `signEmargementFromPortal(slotId, pin)`

1. `requireTrainee()`, émargement `{ inscriptionId: cookie.sub, slotId }`.
2. Fenêtre : début − 15 min → fin, en Europe/Paris (attention au changement d'heure).
3. PIN comparé en temps constant.
4. Verrou par inscription : 5 échecs → 10 min (`pinFailedCount`, `pinLockedUntil`).
5. Idempotent ; `signedVia = "portail"`.

### RGPD

- Anonymisation (`src/lib/retention-service.ts`) : `accessTokenHash = null` ;
  `requireTrainee()` refuse `isAnonymized`.
- Suppression d'un `SessionDocument` ou d'une session : suppression explicite
  des objets R2 (la cascade Prisma ne les supprime pas).
- Mail sans donnée sensible. Mention d'information en pied de portail.

### Tests

`trainee-token`, `trainee-session` (cookie, `fp` périmé, anonymisé, pas d'expiration),
`slot-window` (avant/pendant/après, passage à l'heure d'hiver),
`signEmargementFromPortal` (PIN, verrou, fenêtre, autre inscription, idempotence,
`signedVia`), visibilité documents/attestations.

## Lots

| Lot | Contenu                                                         | Statut  |
| --- | --------------------------------------------------------------- | ------- |
| 0   | Durcissement `/validation`                                      | ✅ fait |
| 1   | Schéma, token, cookie, `requireTrainee`, route d'accès          | ✅ fait |
| 2   | Portail `/espace` (session, émargement, documents, attestation) | ✅ fait |
| 3   | Côté formateur : envoi des accès, section Supports, `signedVia` | ✅ fait |
| 4   | Publication des attestations + PDF à la demande                 | ✅ fait |

### Lot 0 : détail (implémenté)

Failles corrigées dans `src/app/admin/training/actions/public.ts` :

1. `validatePresencePublic(emargementId)` validait n'importe quel émargement sans
   vérification. Désormais : `{ pin, emargementId, lastNamePrefix, dateOfBirth? }`,
   l'émargement doit correspondre au PIN et au préfixe ; date de naissance exigée
   si le préfixe est ambigu ; idempotent ; ne renvoie plus l'enregistrement.
2. `getTraineesByPinAndName` renvoyait les dates de naissance au navigateur
   (contrôle côté client). Désormais : `{ requiresDob, trainees }`, aucun nom si
   ambigu ; nouvelle action `getTraineesByPinNameAndDob` qui compare côté serveur.
3. `getTraineesByPin` (non utilisée, listait tous les stagiaires d'un PIN) supprimée.
4. Rate-limit (`src/lib/rate-limit.ts`, table `RateLimit` existante, échecs
   seulement) : 30 PIN faux / 15 min / IP ; 5 dates fausses / 15 min par PIN+préfixe.
5. PIN de sessions terminées ou annulées refusé ; PIN mal formé rejeté sans requête.

Limite connue : un stagiaire sans date de naissance qui partage un préfixe ne
peut pas émarger via `/validation` (comportement inchangé) → émargement par le
formateur.
