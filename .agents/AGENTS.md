# Règles de Développement pour RescueLearn

Ce fichier définit les règles spécifiques au projet RescueLearn à destination des agents d'IA (Antigravity).

## 🛠️ Mise à jour du Journal de Modification (Changelog)

À chaque fois que vous implémentez ou modifiez une fonctionnalité majeure destinée à la production, vous devez systématiquement mettre à jour le fichier des nouveautés :

- **Fichier cible** : [src/data/changelog.ts](file:///Users/alexandrevalet/project/labs/rescuelearn/src/data/changelog.ts)
- **Conditions de mise à jour** :
  - Uniquement pour des fonctionnalités, améliorations ou corrections **finalisées** (qui seront poussées en production sur `main`). Ne pas inclure de tâches en cours ou de roadmap future.
  - **Exception importante** : Tout ce qui concerne l'administration **superAdmin** (les fonctionnalités internes réservées aux super-administrateurs de la plateforme) ne doit **pas** être inclus dans ce changelog public.
- **Règles de rédaction** :
  - Fournir un `id` unique et descriptif.
  - Rédiger un `title` et une `description` clairs et vulgarisés pour les utilisateurs finaux (pas de jargon de commit technique comme "fix: change schema validation").
  - Utiliser la date du jour au format `YYYY-MM-DD`.
  - Classer dans la bonne catégorie (`feature`, `improvement`, `bugfix`).
  - Détailler les sous-tâches ou points clés dans le tableau `details`.

## 🧼 Règles de Base de Développement Propre

- **Pas de `any`** : Typage strict obligatoire (`no-explicit-any`). Ne jamais utiliser le type `any`.
- **Interfaces & Types réutilisables** : Réutiliser en priorité les interfaces ou types existants de la codebase (`src/types/`, Prisma, etc.). Si un type spécifique est nécessaire et n'existe pas, créer un type ou une interface explicite.
- **Taille & Maintenabilité des fichiers** : Conserver des fichiers courts, modulaires et faciles à maintenir.
- **Seuil de découpage (> 400 lignes)** : Si un fichier modifié ou créé approche ou dépasse **400 lignes**, évaluer sa complexité et le refactorer/découper en sous-modules ou sous-composants indépendants de manière propre et cohérente lorsque c'est faisable.
- **Testing & Couverture** : Tester systématiquement les fonctionnalités créées ou modifiées et garantir la présence des tests unitaires/intégration requis.

## 📐 Stack Technique & Architecture

- **Stack** : Next.js 16 (App Router), React 19, TypeScript 5, TailwindCSS 4, Prisma (PostgreSQL), Supabase, Bun (runtime & package manager).
- **Structure des dossiers (`src/`)** :
  - `src/app/` : Routes App Router, Server Actions, API routes et composants de page.
  - `src/components/` : Composants UI réutilisables (shadcn/radix).
  - `src/lib/` : Services partagés, utilitaires (`logger.ts`, `prisma.ts`, `auth.ts`, `r2.ts`).
  - `src/types/` : Déclarations de types globales et réutilisables.
  - `src/data/` : Contenu statique et changelog (`changelog.ts`).
- **Base de données & ORM** : Prisma (`prisma/schema.prisma`). Toujours exécuter `bun run db:generate` après toute modification de schéma.

## 🔐 Sécurité & Logging

- **Logging Sécurisé** : Utiliser exclusivement le logger du projet (`src/lib/logger.ts`) pour tout évènement ou log d'erreur. Ne **jamais** utiliser `console.log` directement pour éviter la fuite de données sensibles (PII).
- **Validation des données** : Toujours valider les entrées utilisateur ou les payloads d'API avec Zod (`src/lib/schemas/` ou schémas locaux).

## 🚀 Pipeline de Validation "Zero Failure"

Avant de finaliser une tâche ou proposer une validation, s'assurer systématiquement du succès des commandes suivantes :

```bash
bun run type-check && bun run test && bun run validate
```

- `type-check` : Vérification du typage TypeScript sans émettre de JS (`tsc --noEmit`).
- `test` : Exécution des tests unitaires et d'intégration Vitest.
- `validate` : Validation des schémas et de la cohérence Prisma.
