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
- **Quiz multijoueur en temps réel** : Salle d'attente, choix de la difficulté, partie synchronisée (Supabase Realtime) et correction révélée avec le lien vers le référentiel.
- **Renvoi au référentiel** : Chaque réponse et chaque carte ouvre le PDF officiel à la bonne page.
- **Pages publiques** : Présentation de l'offre aux organismes de formation avec demande de démo (`/formations`) et journal des nouveautés (`/changelog`).

### 🎮 Espace Joueur

- **Compte joueur** : Inscription avec vérification de l'email, onboarding, profil, changement d'email confirmé et connexion par passkey.
- **Tableau de bord** : Statistiques et widgets personnels ; l'administrateur peut masquer certains modules.
- **Questions par abonnement** : Le joueur s'abonne pour recevoir des questions selon la fréquence choisie (quotidienne, hebdomadaire ou mensuelle), envoyées par email par une tâche planifiée.
- **Parcours de progression** : Niveaux jusqu'au PSE1 / PSE2, tentatives corrigées côté serveur, montée de niveau et exercices vidéo YouTube avec suivi du visionnage.

### 🎒 Espace Stagiaire

- **Accès par lien personnel** : Chaque stagiaire reçoit par email un lien unique, sans mot de passe ni création de compte (seule l'empreinte SHA-256 du jeton est stockée).
- **Émargement autonome** : Signature de présence depuis l'espace, sur le créneau ouvert, avec traçabilité de l'origine (portail, code PIN ou formateur).
- **Supports de formation** : Consultation des documents partagés par l'organisme, avec une visibilité programmable à la minute.
- **Attestation signée** : Téléchargement de l'attestation de fin de formation signée par le formateur, dès sa publication.

### 🤖 IA & Gestion des Contenus

- **Analyse des référentiels** : Lecture des sommaires des PDF officiels, découpage en thèmes et page de couverture des thèmes par les contenus existants.
- **Génération par IA (Gemini)** : Quiz, scénarios SNV, cartes d'apprentissage et parcours de progression générés à partir des thèmes ou des PDF de référence.
- **Administration des contenus** : CRUD des quiz, questions, scénarios SNV et cartes ; édition, archivage et suppression en masse ; nettoyage des fichiers R2 à la suppression d'un référentiel.

### 🏢 Espace Administration & Organismes

- **Multi-Organismes** : Gestion isolée de plusieurs organismes de formation avec leurs propres informations, logos, et configurations de rétention de données.
- **Fiche organisme** : Informations légales, administratives et Qualiopi, pré-remplissage à partir du numéro SIRET.
- **Membres & Rôles** : Invitation des membres par email, rôles (admin organisme, formateur…) et contrôle d'accès sur chaque action.
- **Stagiaires** : Import CSV / Excel, champs sensibles chiffrés en base (AES-256-GCM), formations externes et suivi de la formation continue (FC).
- **Tableau de bord de formation** : Statistiques, graphiques et checklist de démarrage pour l'organisme.
- **Sessions de Formation** : Déroulement guidé en 3 phases (Préparer, Animer, Clôturer), gestion des créneaux, de plusieurs formateurs et d'un responsable pédagogique par session, répartition des stagiaires en groupes.
- **Émargement Électronique** : Validation de présence par le stagiaire (espace stagiaire, ou QR code et code PIN à 6 chiffres par créneau vérifié côté serveur) ou par le formateur, suivi en temps réel (Supabase Realtime Authorization), export PDF de la feuille d'émargement. Les sessions terminées ou annulées ne sont plus modifiables.
- **Documents PDF** : PV de formation, feuille d'émargement, FISE PSE1 / PSE2, fiches d'évaluation formative PSC et attestations, générés avec `@react-pdf/renderer`.
- **Signature des attestations** : Le formateur affecté à la session trace sa signature au moment de publier. Chaque attestation « acquis » est rendue une seule fois, stockée chiffrée sur R2 avec son empreinte SHA-256, et verrouille résultats, inscrits et formateurs jusqu'à sa dépublication (signature électronique simple au sens eIDAS).
- **Historique & Rétention** : Gestion automatique du cycle de vie des données stagiaires (anonymisation après inactivité, puis purge avec suppression des fichiers sensibles et des attestations signées sur R2).
- **Utilisateurs** : Gestion des comptes avec filtres, tri et pagination.
- **Activation des modules** : Chaque module public (quiz, SNV, cartes…) peut être désactivé depuis le panneau de réglages.
- **Bypass de maintenance** : Mode maintenance global avec backdoor via token d'accès secret.

---

## 🛠️ Technologies & Stack

### Frontend & Backend

- **Framework** : [Next.js 16.3](https://nextjs.org/) (App Router, Server Actions, React Compiler)
- **Bibliothèque** : [React 19.3](https://react.dev/)
- **Runtime & Package Manager** : [Bun](https://bun.sh/)
- **Styling** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Composants UI** : Radix UI & [shadcn/ui](https://ui.shadcn.com/)
- **Animations** : Framer Motion
- **Visualisation** : Recharts (pour les tableaux de bord et statistiques)
- **PDF** : `@react-pdf/renderer` (génération), `pdf-lib` (fusion), `signature_pad` (tracé de signature)
- **Dates** : dayjs (fuseau Europe/Paris pour les créneaux)
- **Import / QR code** : `xlsx` (import CSV / Excel des stagiaires), `qrcode.react` (émargement)
- **Mesure** : Vercel Analytics & Speed Insights

### IA & Temps réel

- **IA générative** : Google Gemini (`@google/genai`) pour l'analyse des référentiels et la génération de contenus
- **Temps réel** : Supabase Realtime (quiz multijoueur, émargement en direct)

### Base de données & Stockage

- **Base de données** : PostgreSQL
- **ORM** : [Prisma 7.10](https://www.prisma.io/) (avec support du découpage des schémas via `prismaSchemaFolder`)
- **Stockage de fichiers** : Cloudflare R2 / AWS S3 (avec chiffrement/déchiffrement à la volée via une clé d'encodage symétrique pour les documents sensibles)

### Sécurité & Authentification

- **Authentification** : [Better-Auth 1.7.7](https://www.better-auth.com/) (gestion des rôles, invitations d'organisation, passkeys, sessions sécurisées)
- **Espace stagiaire** : Accès par jeton personnel, stocké uniquement sous forme d'empreinte, avec verrouillage anti-devinette du code PIN.
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

| Variable                                                     | Description                                                                                              |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                               | URL de connexion à la base de données PostgreSQL                                                         |
| `DIRECT_URL`                                                 | URL directe (sans pooler) utilisée pour les migrations                                                   |
| `NEXT_PUBLIC_APP_URL`                                        | URL racine de l'application, utilisée aussi comme `baseURL` de Better Auth (ex: `http://localhost:3000`) |
| `BETTER_AUTH_SECRET`                                         | Clé secrète de sécurité pour Better Auth                                                                 |
| `MAINTENANCE_MODE`                                           | Active le mode maintenance globale (`true`/`false`)                                                      |
| `MAINTENANCE_BYPASS_TOKEN`                                   | Token secret pour contourner la maintenance (backdoor cookie)                                            |
| `R2_ENDPOINT`                                                | Endpoint de Cloudflare R2 ou AWS S3                                                                      |
| `R2_ACCESS_KEY_ID`                                           | Identifiant d'accès au bucket R2                                                                         |
| `R2_SECRET_ACCESS_KEY`                                       | Clé secrète d'accès au bucket R2                                                                         |
| `R2_BUCKET_NAME`                                             | Nom du bucket de stockage                                                                                |
| `R2_PUBLIC_URL`                                              | URL publique du bucket (fichiers non chiffrés : logos, PDF des référentiels)                             |
| `ENCRYPTION_KEY`                                             | Clé symétrique utilisée pour chiffrer les fichiers sensibles sur R2                                      |
| `APP_MODE`                                                   | Préfixe des clés R2 (`dev` / `prod`)                                                                     |
| `CRON_SECRET`                                                | Secret attendu par les routes `/api/cron/*`                                                              |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projet Supabase pour le temps réel                                                                       |
| `SUPABASE_JWT_SECRET`                                        | Signature des jetons Realtime de l'émargement (`/api/realtime/token`)                                    |
| `GEMINI_API_KEY`                                             | Clé de l'API Google Gemini (génération de contenus)                                                      |
| `GEMINI_MODEL`                                               | Modèle Gemini utilisé (défaut : `gemini-2.5-pro`)                                                        |
| `SMTP_*`                                                     | Configuration SMTP par défaut (liens d'accès stagiaires, etc.)                                           |

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
bun run type-check && bun run validate && bun run test && bun run build && bun x lint-staged
```

Cette suite est exécutée automatiquement par le hook Husky `pre-commit`.

- `type-check` : Vérification stricte des types TypeScript (`tsc --noEmit`).
- `validate` : Validation des fichiers de schémas Prisma.
- `test` : Passage des 980+ tests unitaires et d'intégration via Vitest.
- `build` : Build de production Next.js.
- `lint-staged` : Analyse Oxlint & formatage Prettier sur les fichiers modifiés.

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
│   │   ├── espace/          # Espace stagiaire (accès par lien, émargement, supports, attestation)
│   │   ├── api/             # API REST, Better-Auth, crons, téléchargements admin (documents, attestations signées)
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
│   │   ├── trainee-access.ts    # Jetons d'accès à l'espace stagiaire
│   │   ├── attestation-signature.ts # Signature active et verrou des attestations
│   │   └── prisma.ts        # Client Prisma étendu
│   ├── services/            # Services business (ex: SiretService)
│   └── types/               # Typages globaux du projet
├── .oxlintrc.json           # Configuration de linting Oxlint
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

### Tâches planifiées (Vercel Cron, `vercel.json`)

| Route                        | Fréquence               | Rôle                                               |
| :--------------------------- | :---------------------- | :------------------------------------------------- |
| `/api/cron/keep-alive`       | Tous les jours, 5 h UTC | Maintient la base de données active                |
| `/api/cron/cleanup-sessions` | Toutes les heures       | Nettoie les sessions de quiz abandonnées           |
| `/api/cron/daily-quiz`       | Tous les jours, 7 h UTC | Envoie par email les questions aux joueurs abonnés |

Les routes de cron exigent le `CRON_SECRET`.
