# Espace stagiaire par lien email — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Donner à chaque stagiaire un lien personnel (email) vers un espace sans compte : émargement avec PIN salle, supports de formation, attestations publiées.

**Architecture:** Token aléatoire par `Inscription` (SHA-256 en base), échangé contre un cookie JWT `rl_trainee` (jose, HS256, `path=/espace`) qui embarque une empreinte du hash pour une révocation immédiate. Le portail `/espace` est un ensemble de Server Components gardés par `requireTrainee()` ; toutes les actions relisent l'identité depuis le cookie.

**Tech Stack:** Next.js 16 App Router, Prisma 7, jose, R2 (`src/lib/r2.ts`), vitest, shadcn/ui.

**Design :** `docs/plans/2026-10-23-espace-stagiaire-design.md`

**Conventions :**

- Bun uniquement (`bun run test`, `bunx vitest run <fichier>`).
- **Pas de commit** : l'utilisateur gère git. Chaque tâche se termine par la vérification.
- Migrations : SQL écrit à la main dans `prisma/migrations/<timestamp>_<nom>/migration.sql` (le script `db:migrate` est interactif). Toute nouvelle table : `ENABLE ROW LEVEL SECURITY`.
- Inscription n'a pas d'`organismeId` : vérifier `inscription.trainingSession.organismeId === user.organismeId` (cf. `actions/inscriptions.ts`).
- Couleurs : tokens uniquement (`text-muted-foreground`, `bg-success`…), jamais `text-green-*`.

---

## Lot 1 — Fondations : schéma, lien, cookie

### Task 1.1 : schéma et migration

**Files:**

- Modify: `prisma/schema/training.prisma` (Inscription, Emargement, TrainingSession, + SessionDocument)
- Create: `prisma/migrations/20261023150000_trainee_portal/migration.sql`

Champs (cf. design §1) : `Inscription.accessTokenHash @unique`, `accessSentAt`, `accessLastUsedAt`, `pinFailedCount @default(0)`, `pinLockedUntil` ; `Emargement.signedVia` ; `TrainingSession.attestationsPublishedAt` ; modèle `SessionDocument`.

**Vérif :** `bunx prisma validate` puis `bunx prisma generate` → OK. Appliquer en local : `bun run db:push` (ou `bunx prisma migrate deploy`).

### Task 1.2 : primitives du lien (`src/lib/trainee-access.ts`)

Fonctions pures, sans I/O :

- `generateAccessToken(): { token, hash }` — 32 octets `randomBytes`, base64url ; hash SHA-256 hex.
- `hashAccessToken(token)`, `accessFingerprint(hash)` (16 premiers caractères).
- `buildAccessUrl(baseUrl, token)` → `${baseUrl}/espace/acces#t=${token}`.
- `checkInscriptionAccess(inscription, fingerprint)` → `null | "revoked" | "anonymized"` ; empreinte comparée en temps constant. Pas d'expiration (décision du 2026-10-23).

**Test :** `src/lib/trainee-access.test.ts` — token base64url de 43 caractères et unique ; hash déterministe ; URL avec fragment ; refus révoqué / empreinte différente / anonymisé ; accès valide ; aucun refus 10 ans après la session.

### Task 1.3 : cookie et garde (`src/lib/trainee-session.ts`)

- `signTraineeToken({ inscriptionId, fp })` / `verifyTraineeToken(jwt)` (jose HS256, clé = SHA-256 de `rl_trainee:` + `BETTER_AUTH_SECRET`, expiration 30 j, `null` si invalide).
- `setTraineeCookie`, `clearTraineeCookie` (`httpOnly`, `secure` en prod, `sameSite: "lax"`, `path: "/espace"`).
- `getTraineeAccess()` : cookie → JWT → inscription (+ trainee, trainingSession, organisme) → `checkInscriptionAccess` ; `null` sinon.
- `requireTrainee()` : `getTraineeAccess()` ou `redirect("/espace/lien-invalide")`.

**Test :** `src/lib/trainee-session.test.ts` — aller-retour sign/verify ; JWT altéré → `null` ; JWT signé avec une autre clé → `null`.

### Task 1.4 : échange du token (`src/app/espace/actions.ts`)

- `redeemAccessToken(token)` → `{ ok: true } | { ok: false, reason }`. Rate-limit des échecs par IP (`espace:token:<ip>`, 20 / 15 min). Met à jour `accessLastUsedAt`, pose le cookie.
- `signOutTrainee()` → efface le cookie, redirige vers `/espace/lien-invalide?raison=deconnecte`.

**Test :** `src/__tests__/espace-access.actions.test.ts` — token inconnu (échec compté) ; révoqué/anonymisé ; lien d'une session ancienne accepté ; succès (cookie posé, `accessLastUsedAt` mis à jour) ; rate-limit atteint → pas de requête.

### Task 1.5 : génération et révocation côté organisme (`src/app/admin/training/actions/access.ts`)

- `generateAccessLink(inscriptionId)` → `{ url }`. `requireOrganisme()` + contrôle d'organisme ; refuse un stagiaire anonymisé ; régénère toujours (l'ancien lien meurt).
- `revokeAccessLink(inscriptionId)` → `accessTokenHash = null`.
- Export dans `actions/index.ts`.

**Test :** même fichier de test — non authentifié, autre organisme, anonymisé ; succès : seul le hash est stocké, l'URL contient `#t=` et le hash du token de l'URL correspond.

### Task 1.6 : pages minimales et en-têtes

- `src/app/espace/layout.tsx` : `robots: noindex`, fond `bg-muted/20`, `<main>`.
- `src/app/espace/acces/page.tsx` + `access-redeemer.tsx` (client) : lit `#t=`, l'efface de l'URL (`history.replaceState`), appelle `redeemAccessToken`, redirige. Statut annoncé (`role="status"`), garde contre le double appel de StrictMode.
- `src/app/espace/lien-invalide/page.tsx` : messages selon `raison` (`revoque`, `trop-de-tentatives`, `deconnecte`, défaut).
- `src/app/espace/page.tsx` : `requireTrainee()`, liste des sessions du stagiaire (base du lot 2), bouton « Se déconnecter ».
- `next.config.ts` : pour `/espace/:path*` → `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.

### Task 1.7 : RGPD

- `src/lib/retention-service.ts` (`anonymizeInactiveTrainees`) : `inscriptions: { updateMany: { where: {}, data: { accessTokenHash: null } } }` dans le même `update`.
- Test : `src/lib/retention-service.test.ts` vérifie la révocation.

**Vérif du lot :** `bun run type-check && bun run lint && bun run test`. Manuel : générer un lien via `generateAccessLink`, l'ouvrir, vérifier que le fragment disparaît, que `/espace` liste la session, puis révoquer → `/espace` redirige vers `lien-invalide`.

---

## Lot 2 — Portail `/espace`

### Task 2.1 : fenêtre horaire des créneaux

- Create: `src/lib/slot-window.ts` — `getSlotWindow(slot)` → `{ opensAt, closesAt }` en Europe/Paris (`dayjs` + `utc` + `timezone`), ouverture 15 min avant `startTime` ; `getSlotState(slot, emargement, now)` → `"upcoming" | "open" | "signed" | "missed" | "absent"`.
- Test : `src/lib/slot-window.test.ts` — avant/pendant/après ; nuit du 25/10/2026 (passage à l'heure d'hiver) ; créneau signé ; absent.

### Task 2.2 : émargement depuis le portail

- Create: `src/lib/emargement-sign.ts` — `markEmargementSigned(emargement, signedVia)` partagé avec `validatePresencePublic` (qui passe `signedVia: "pin"`).
- Modify: `src/app/espace/actions.ts` — `signEmargementFromPortal(slotId, pin)` (design §4 : `requireTrainee`, fenêtre, PIN en temps constant, verrou `pinFailedCount`/`pinLockedUntil` 5 → 10 min, idempotent).
- Test : `src/__tests__/espace-emargement.actions.test.ts` — bon PIN ; mauvais PIN incrémente ; verrou au 5e ; hors fenêtre ; créneau d'une autre inscription ; idempotence ; `signedVia = "portail"`.

### Task 2.3 : pages

- `src/app/espace/page.tsx` : une seule session → `redirect` vers son détail.
- `src/app/espace/sessions/[inscriptionId]/page.tsx` + `loading.tsx` : en-tête organisme, carte « À faire maintenant », planning, documents, attestation (design §2). `inscriptionId` doit appartenir au stagiaire du cookie, sinon `notFound()`.
- Composants dans `src/app/espace/sessions/[inscriptionId]/components/` : `sign-slot-card.tsx` (client, `useActionState`, `aria-live`, focus), `slot-list.tsx`, `slot-refresh.tsx` (client, `router.refresh()` à l'ouverture), `documents-list.tsx`, `attestation-card.tsx`.
- Variantes `cva` du `Badge` si nécessaire (`src/components/ui/badge.tsx`).

**Vérif :** checks + rendu à 375 / 768 / 1280 px, clair/sombre, navigation clavier, VoiceOver sur la carte d'émargement.

---

## Lot 3 — Côté formateur

### Task 3.1 : envoi des accès

- Modify: `src/lib/email.ts` — `EmailService.sendTraineeAccess({ to, organisme, session, url })` (SMTP organisme, repli plateforme).
- Modify: `src/app/admin/training/actions/access.ts` — `sendAccessLinks(sessionId, { scope: "pending" | "all" })` → `{ sent, missingEmail, failed }`, concurrence 5, met `accessSentAt`.
- Test : envoi aux seuls non-envoyés ; stagiaires sans email comptés ; échec SMTP comptabilisé sans bloquer les autres.

### Task 3.2 : UI Préparer › Stagiaires

- Modify: `src/app/admin/training/sessions/[id]/components/inscriptions-tab.tsx` — colonne « Accès portail », bouton « Envoyer les accès », menu ligne (Envoyer/Renvoyer, Copier le lien, QR code, Révoquer). Libellé de régénération explicite.

### Task 3.3 : section Supports

- Modify: `src/app/admin/training/lib/session-progress.ts` — `prepare.sections.supports`.
- Create: `src/app/admin/training/actions/documents.ts` — `createDocumentUpload` (URL PUT présignée, 25 Mo, types autorisés), `confirmDocumentUpload` (magic bytes), `updateDocument`, `deleteDocument` (supprime l'objet R2).
- Create: `src/app/admin/training/sessions/[id]/components/supports-tab.tsx`.
- Modify: `src/app/espace/actions.ts` — `getDocumentDownloadUrl(documentId)` (URL présignée 5 min, `visibleFrom` respecté).
- Suppression de session : supprimer les objets R2 des documents.

### Task 3.4 : traçabilité

- Modify: `actions/emargement.ts` (`updateEmargementStatus`, `bulkUpdateEmargementStatus` → `signedVia: "formateur"`) et l'onglet émargement (infobulle).

---

## Lot 4 — Attestations

### Task 4.1 : publication

- Modify: `src/app/admin/training/actions/inscriptions.ts` — `publishAttestations(sessionId, { notify })`, `unpublishAttestations(sessionId)`.
- Modify: `src/app/admin/training/sessions/[id]/components/close/documents-section.tsx` — carte de publication + `AlertDialog`.

### Task 4.2 : téléchargement depuis le portail

- Create: `src/app/espace/sessions/[inscriptionId]/attestation/route.ts` — GET, `requireTrainee`, publié + validé, PDF généré avec les générateurs existants (`lib/pdf-attestation-*`), `Content-Disposition: attachment`.
- Résultat négatif : message neutre, pas de PDF.
- Test : non publié ; publié sans résultat ; résultat négatif ; autre inscription → 404.
