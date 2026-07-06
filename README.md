# RescueLearn 🚑

**RescueLearn** est une plateforme complète de formation et d'apprentissage du secourisme moderne. Conçue pour aider les apprenants à maîtriser les gestes d'urgence, elle permet également aux organismes de formation de gérer leurs sessions, formateurs, stagiaires, attestations et émargements de manière sécurisée et dématérialisée.

L'ensemble des contenus pédagogiques (quiz, scénarios SNV et cartes d'apprentissage) sont inspirés des référentiels officiels de recommandations de la **DGSCGC** (Direction Générale de la Sécurité Civile et de la Gestion des Crises).

---

## 📋 Table des matières

- [✨ Fonctionnalités](#-fonctionnalités)
- [🛠️ Technologies & Stack](#-technologies--stack)
- [📦 Prérequis](#-prérequis)
- [🚀 Installation & Démarrage](#-installation--démarrage)
- [⚙️ Configuration (.env)](#%EF%B8%8F-configuration-env)
- [🗄️ Gestion de la Base de Données](#%EF%B8%8F-gestion-de-la-base-de-données)
- [🧪 Tests & Validation](#-tests--validation)
- [🏗️ Architecture du Projet](#%EF%B8%8F-architecture-du-projet)
- [☁️ Déploiement](#%EF%B8%8F-déploiement)

---

## ✨ Fonctionnalités

### 🧑‍🎓 Espace Apprenants (Public)

- **Quiz interactifs** : Entraînement avec des QCM basés sur les référentiels officiels, avec explications détaillées, chronométrage configurable et score de passage.
- **Scénarios SNV (Sauvetage à Nombreuses Victimes)** : Simulations immersives de situations d'urgence complexes nécessitant le triage et la prise en charge de multiples victimes.
- **Cartes d'apprentissage** : Fiches de révision synthétiques par thème, niveau et référentiel.
- **Score de Glasgow** : Outil d'entraînement interactif avec mnémoniques et tables de référence pour l'évaluation neurologique.

### 🏢 Espace Administration & Organismes

- **Multi-Organismes** : Gestion isolée de plusieurs organismes de formation avec leurs propres informations, logos, et configurations de rétention de données.
- **Sessions de Formation** : Planification de sessions avec gestion des créneaux (slots), formateurs attitrés, et stagiaires inscrits.
- **Émargement Électronique** : Système de signature/validation de présence par code OTP à double facteur (email).
- **Attestations & Certificats** : Validation et génération de documents au format PDF.
- **Historique & Rétention** : Gestion automatique du cycle de vie des données stagiaires (anonymisation après inactivité et suppression sécurisée des fichiers sensibles).
- **Bypass de maintenance** : Mode maintenance global avec backdoor via token d'accès secret.

---

## 🛠️ Technologies & Stack

### Frontend & Backend

- **Framework** : [Next.js 16.1.5](https://nextjs.org/) (App Router, Server Actions)
- **Bibliothèque** : [React 19.2.3](https://react.dev/)
- **Runtime & Package Manager** : [Bun](https://bun.sh/)
- **Styling** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Composants UI** : Radix UI & [shadcn/ui](https://ui.shadcn.com/)
- **Animations** : Framer Motion
- **Visualisation** : Recharts (pour les tableaux de bord et statistiques)

### Base de données & Stockage

- **Base de données** : PostgreSQL
- **ORM** : [Prisma 7.8.0](https://www.prisma.io/) (avec support du découpage des schémas via `prismaSchemaFolder`)
- **Stockage de fichiers** : Cloudflare R2 / AWS S3 (avec chiffrement/déchiffrement à la volée via une clé d'encodage symétrique pour les documents sensibles)

### Sécurité & Authentification

- **Authentification** : [Better-Auth 1.4.7](https://www.better-auth.com/) (gestion des rôles, invitations d'organisation, sessions sécurisées)
- **Logs** : Système de logging centralisé et sanitise (`src/lib/logger.ts`) empêchant la fuite de données personnelles (PII).
- **Validation** : Zod pour la validation robuste des données d'entrée.

---

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Bun** (version recommandée: 1.1+)
- **PostgreSQL** (base de données locale ou distante)
- **Cloudflare R2** ou compatible AWS S3 pour le stockage des fichiers.

---

## 🚀 Installation & Démarrage

### 1. Cloner le projet

```bash
git clone <url-du-depot>
cd rescuelearn
```

### 2. Installer les dépendances

```bash
bun install
```

### 3. Configurer l'environnement

Copiez le fichier d'exemple et remplissez les valeurs appropriées :

```bash
cp .env.example .env.local
```

_(Voir la section [Configuration](#%EF%B8%8F-configuration-env) pour plus de détails sur les variables)._

### 4. Initialiser la base de données

Générez le client Prisma, appliquez les migrations et insérez les données initiales (seeds) :

```bash
# Générer le client Prisma
bun run db:generate

# Lancer la base de données (si locale) et exécuter les migrations
bun run db:push # ou bun run db:migrate pour créer une migration nommée

# Insérer les données de démo (quiz, cartes, etc.)
bun run db:seed
```

### 5. Lancer le serveur de développement

```bash
bun run dev
```

L'application est maintenant accessible sur [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Configuration (.env)

Le projet utilise les variables d'environnement suivantes dans `.env.local` :

| Variable                   | Description                                                         |
| :------------------------- | :------------------------------------------------------------------ |
| `DATABASE_URL`             | URL de connexion à la base de données PostgreSQL                    |
| `NEXT_PUBLIC_APP_URL`      | URL racine du frontend (ex: `http://localhost:3000`)                |
| `BETTER_AUTH_URL`          | URL racine de l'API Better Auth                                     |
| `BETTER_AUTH_SECRET`       | Clé secrète de sécurité pour Better Auth                            |
| `MAINTENANCE_MODE`         | Active le mode maintenance globale (`true`/`false`)                 |
| `MAINTENANCE_BYPASS_TOKEN` | Token secret pour contourner la maintenance (backdoor cookie)       |
| `R2_ENDPOINT`              | Endpoint de Cloudflare R2 ou AWS S3                                 |
| `R2_ACCESS_KEY_ID`         | Identifiant d'accès au bucket R2                                    |
| `R2_SECRET_ACCESS_KEY`     | Clé secrète d'accès au bucket R2                                    |
| `R2_BUCKET_NAME`           | Nom du bucket de stockage                                           |
| `ENCRYPTION_KEY`           | Clé symétrique utilisée pour chiffrer les fichiers sensibles sur R2 |
| `SMTP_HOST` / `SMTP_PORT`  | Configuration SMTP pour l'envoi d'emails (OTP émargement, etc.)     |

---

## 🗄️ Gestion de la Base de Données

Le projet s'appuie sur le découpage des schémas de Prisma (`prisma/schema/*.prisma`). Les commandes de gestion de la base de données sont disponibles via des scripts Bun :

- `bun run db:generate` : Regénère les types Prisma Client à partir de l'ensemble des schémas.
- `bun run db:migrate` : Crée et applique une nouvelle migration de base de données en demandant un nom.
- `bun run db:push` : Synchronise directement le schéma local avec la base de données sans passer par des migrations (idéal en développement rapide).
- `bun run db:seed` : Exécute le script de peuplement initial (`prisma/seed.ts`).
- `bun run db:studio` : Ouvre l'interface visuelle Prisma Studio sur [http://localhost:5555](http://localhost:5555).
- `bun run validate` : Valide la syntaxe et les relations des schémas Prisma.

---

## 🧪 Tests & Validation

La qualité du code de RescueLearn est garantie par une série de vérifications locales automatisées et de tests unitaires/intégration.

### Exécuter les tests (Vitest)

```bash
# Lancer les tests en mode exécution unique
bun run test

# Lancer le rapport de couverture de code (Coverage)
bun run test:coverage

# Lancer les tests en mode interactif (watch)
bun run test:watch
```

### Pipeline de Validation Locale (Zero Failure)

Avant chaque commit ou déploiement, vous devez vous assurer que le code passe la suite de commandes de validation suivante :

```bash
bun run type-check && bun run validate && bun run test && bun x lint-staged
```

- `type-check` : Vérification stricte des types TypeScript (`tsc --noEmit`).
- `validate` : Validation des fichiers de schémas Prisma.
- `test` : Passage des 260+ tests unitaires et d'intégration via Vitest.
- `lint-staged` : Analyse syntaxique et de style ESLint & Prettier sur les fichiers modifiés.

---

## 🏗️ Architecture du Projet

```
rescuelearn/
├── prisma/
│   ├── schema/              # Schémas Prisma découpés (preview feature)
│   │   ├── auth.prisma      # Authentification et Organisations
│   │   ├── config.prisma    # Configuration client & database
│   │   ├── learning.prisma  # Cartes d'apprentissage et Référentiels
│   │   ├── quiz.prisma      # Quiz, Questions, Catégories
│   │   ├── snv.prisma       # Scénarios et victimes SNV
│   │   └── training.prisma  # Formations, émargements, stagiaires, signatures
│   └── seed.ts              # Script de peuplement
├── scripts/                 # Scripts utilitaires et de migration
├── src/
│   ├── __tests__/           # Tests globaux (ex: middleware, logo action)
│   ├── app/                 # Next.js App Router
│   │   ├── (public)/        # Vues publiques (quiz, snv, glasgow, learning)
│   │   ├── actions/         # Server Actions globaux (organisation, switch, logo)
│   │   ├── admin/           # Dashboard et gestion des organismes (training, etc.)
│   │   ├── api/             # API REST et endpoints Better-Auth
│   │   └── validation/      # Schémas de validation
│   ├── components/          # Composants UI (Radix, shadcn/ui)
│   ├── hooks/               # Custom hooks React
│   ├── lib/                 # Services et bibliothèques partagées
│   │   ├── auth.ts          # Configuration de Better Auth (back)
│   │   ├── auth-client.ts   # Configuration du client Better Auth (front)
│   │   ├── logger.ts        # Logger sécurisé (sanitise les logs)
│   │   ├── r2.ts            # Client R2 / S3 de stockage
│   │   ├── encryption.ts    # Utilitaires de chiffrement des fichiers
│   │   ├── retention-service.ts # Service d'anonymisation des données
│   │   └── prisma.ts        # Client Prisma étendu
│   ├── services/            # Services business (ex: SiretService)
│   └── types/               # Typages globaux du projet
├── eslint.config.mjs        # Configuration de linting ESLint
├── prettierrc.json          # Configuration de formatage Prettier
├── package.json             # Dépendances et scripts de build
└── vitest.config.ts         # Configuration des tests
```

---

## ☁️ Déploiement

Le projet intègre un script automatisé pour le déploiement sur Vercel. Il valide d'abord la conformité technique locale avant de pousser en production.

```bash
bun run deploy
```

Ce script effectue les actions suivantes :

1. Exécute la validation locale complète (Zero Failure pipeline).
2. Vérifie la branche courante.
3. Déploie en **Production** si la branche courante est `main` (`vercel --prod`).
4. Déploie en **Preview** sinon (`vercel`).
5. Sur Vercel, la commande `vercel-build` est appelée, générant le client Prisma et exécutant les migrations distantes (`bun run db:generate && bunx prisma migrate deploy && next build`).
