# Évaluations à chaud et à froid — Design

Date : 2026-10-23
Statut : validé

## Objectif

Recueillir, depuis l'espace stagiaire, deux évaluations par session (indicateurs
Qualiopi 11 et 30-32) :

- **à chaud** : satisfaction, qualité pédagogique, atteinte des objectifs, NPS,
  suggestions ;
- **à froid** : mise en pratique, utilité, rappel des gestes, NPS, commentaire.

## Décisions

| Sujet            | Décision                                                               | Raison                                                                   |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Questionnaires   | Fixes, en code (`src/lib/evaluation/questionnaires.ts`), versionnés    | Pas d'éditeur nécessaire ; la version est stockée avec chaque réponse    |
| Fin de session   | Fin du dernier `Slot` (date + `endTime`, Europe/Paris)                 | `endDate` n'a pas d'heure ; même calcul que l'émargement                 |
| Fenêtres         | Chaud J+0 → J+30, froid J+90 → J+120, calculées à la volée             | Aucun job d'ouverture                                                    |
| Éligibilité      | ≥ 1 émargement `validé`, session non annulée, stagiaire non anonymisé  | Seuls les présents évaluent                                              |
| Accès            | Cookie de l'espace (`requireTrainee`), jamais d'identifiant client     | Modèle existant : token dans le fragment, cookie JWT httpOnly            |
| Modification     | Brouillon et réponse soumise modifiables jusqu'à la fermeture          | Puis lecture seule                                                       |
| Rappels          | Cron quotidien, J+0/J+7/J+23 (chaud), J+90/J+97/J+113 (froid)          | Envoyés seulement si non soumise ; un seul envoi par palier              |
| Lien des rappels | Nouveau lien à chaque envoi, enregistré seulement après l'envoi réussi | Token jamais stocké en clair ; un échec SMTP laisse l'ancien lien valide |
| Désinscription   | `Inscription.evaluationRemindersOptOut`, bouton dans l'espace          | Le stagiaire coupe les rappels, pas l'accès à l'évaluation               |
| Agrégats admin   | Détail affiché à partir de 5 réponses soumises, sinon taux de réponse  | Pas de réidentification sur petits effectifs                             |
| Écarté           | Éditeur de templates, PDF récapitulatif, exports, feature flag         | YAGNI                                                                    |

## 1. Modèle de données

```prisma
model EvaluationResponse {
  id            String      @id @default(cuid())
  inscriptionId String
  type          String      // "chaud" | "froid"
  version       String      // "chaud-v1"
  answers       Json
  status        String      @default("brouillon") // "brouillon" | "soumise"
  submittedAt   DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  inscription   Inscription @relation(onDelete: Cascade)

  @@unique([inscriptionId, type])
}

model EvaluationReminder {
  id            String      @id @default(cuid())
  inscriptionId String
  kind          String      // "chaud-j0" | "chaud-j7" | … : un envoi par palier
  sentAt        DateTime    @default(now())

  @@unique([inscriptionId, kind])
}
```

Les réponses suivent l'inscription (cascade) : la rétention RGPD existante
s'applique. Aucune IP ni user-agent stocké : rien ne les justifie ici.

## 2. Bibliothèque `src/lib/evaluation/`

- `questionnaires.ts` : sections et questions par type (`rating_1_4`, `nps`,
  `yes_no`, `single_choice`, `free_text` ≤ 2000).
- `window.ts` : fin de session, fenêtres, état (`upcoming`/`open`/`closed`),
  palier de rappel dû.
- `schemas.ts` : schéma Zod construit depuis le questionnaire (`.strict()`,
  enums, longueurs, balises HTML retirées). Brouillon : tout optionnel ;
  soumission : obligatoires exigés, consentement coché.
- `eligibility.ts` : règle pure (émargement validé, session, anonymisation).
- `aggregates.ts` : moyennes, distribution, NPS, taux de réponse, seuil 5.

## 3. Espace stagiaire

- Carte « Évaluations » sur la page de session : une ligne par évaluation
  ouverte ou soumise, badge texte + icône, bouton.
- `/espace/sessions/[inscriptionId]/evaluations/[type]` : une étape par
  section (`fieldset`/`legend`, radios natifs), progression `role="progressbar"`,
  récapitulatif, consentement. Brouillon par Server Action à chaque étape.
  Sans JS, toutes les sections s'affichent dans un seul formulaire.
- `/espace/sessions/[inscriptionId]/evaluations/[type]/merci`.
- Actions `saveEvaluationDraft` / `submitEvaluation` : `requireTrainee`,
  éligibilité + fenêtre revérifiées, Zod serveur, rate limit par inscription.
  Log : identifiant d'inscription haché, type ; jamais les réponses.

## 4. Admin

Section « Évaluations » dans la phase Clôturer : par type, fenêtre, taux de
réponse, puis (N ≥ 5) moyenne et distribution par question, NPS, commentaires.

## 5. Rappels

`/api/cron/evaluation-reminders` (quotidien, `CRON_SECRET`) : sessions dont la
fin date de 0 à 120 jours, inscriptions éligibles sans réponse soumise et sans
opt-out. Palier dû = le plus récent atteint dans la fenêtre ; on l'envoie s'il
n'existe aucun envoi de ce palier ou d'un palier postérieur (pas de rattrapage
en rafale). La ligne `EvaluationReminder` est créée avant l'envoi : un cron
relancé ne double pas l'email. Le nouveau lien ne remplace l'ancien
qu'une fois l'email accepté par le SMTP, et seulement si le lien est toujours
actif (révocation du formateur pendant l'envoi respectée).
