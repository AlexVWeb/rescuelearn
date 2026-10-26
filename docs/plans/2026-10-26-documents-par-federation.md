# Documents par fédération — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ne proposer le PV Croix Blanche qu'aux organismes Croix Blanche, rendre l'en-tête du PV dynamique et inviter les autres fédérations à envoyer leurs modèles.

**Architecture:** Enum Prisma `Federation` + champ libre `documentHeader` sur `Organisme`. Registre pur `src/lib/documents/` (documents disponibles, lignes d'en-tête, mailto) consommé par `documents-section.tsx`. Le PV migre dans `src/lib/documents/croix-blanche/`.

**Tech Stack:** Next.js App Router, Prisma (Postgres), react-hook-form + Zod, @react-pdf/renderer, Vitest, bun.

Design : `docs/plans/2026-10-26-documents-par-federation-design.md`

---

### Task 1 : Fédérations (lib pure)

**Files:**

- Create: `src/lib/documents/federations.ts`
- Test: `src/lib/documents/federations.test.ts`

`FEDERATIONS` (valeur enum → libellé), `federationLabel(federation, federationName)`, `federationFromName(name)` (9 libellés historiques → enum, autre texte → `AUTRE`, vide → `null`).

Run: `bunx vitest run src/lib/documents/federations.test.ts` — FAIL puis PASS.

### Task 2 : Registre des documents

**Files:**

- Create: `src/lib/documents/registry.ts`
- Test: `src/lib/documents/registry.test.ts`

`availableDocuments`, `missingFederationDocuments`, `missingDocumentLabels`, `documentHeaderLines`, `buildTemplateRequestMailto`.

Run: `bunx vitest run src/lib/documents/registry.test.ts` — FAIL puis PASS.

### Task 3 : Schéma Prisma + migration

**Files:**

- Modify: `prisma/schema/training.prisma` (enum + `federation`, `documentHeader`)
- Create: `prisma/migrations/20261026120000_organisme_federation/migration.sql` (CREATE TYPE, ADD COLUMN, UPDATE de mapping depuis `federationName`, libellés connus → `federationName = NULL`)

Run: `bunx prisma db push` puis `bunx prisma generate`.

### Task 4 : Formulaire organisme

**Files:**

- Modify: `src/lib/schemas/organisme.schema.ts` (`federation`, `documentHeader` ≤ 500 car., ≤ 6 lignes)
- Modify: `src/app/actions/organisme.actions.ts` (create + update ; `federationName` gardé seulement si `AUTRE`)
- Modify: `src/components/admin/organisme-form.tsx` (defaults)
- Modify: `src/components/admin/organisme-form/sections/admin-info-section.tsx` (select enum, champ libre si `AUTRE`, Textarea en-tête)
- Modify: `src/app/admin/organismes/[id]/organisme-detail-client.tsx` (defaults)
- Modify: `src/types/organisme.ts`

### Task 5 : PV Croix Blanche dynamique

**Files:**

- Move: `src/app/admin/training/lib/pdf-pv.tsx` → `src/lib/documents/croix-blanche/pdf-pv.tsx`
- Prop `headerLines: string[]` remplace les 3 `<Text>` en dur.

### Task 6 : Section Documents + alerte

**Files:**

- Create: `src/app/admin/training/sessions/[id]/components/close/missing-templates-alert.tsx`
- Modify: `documents-section.tsx` (prop `organisme`, filtre `availableDocuments`, alerte)
- Modify: `session-workspace.tsx`, `sessions/[id]/page.tsx` (passage de `organisme`)

### Task 7 : Vérification

Run: `bunx vitest run`, `bunx tsc --noEmit`, `bun run lint`, `grep -rniE "croix blanche|rhone" src/app/admin/training/lib src/lib/documents` (aucun texte en dur hors table des libellés).
