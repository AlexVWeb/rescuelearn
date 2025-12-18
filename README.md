# RescueLearn

**RescueLearn** est une plateforme complète d'apprentissage du secourisme conçue pour aider les apprenants à maîtriser les gestes qui sauvent. La plateforme propose des quiz interactifs, des scénarios de Sauvetage à Nombreuses Victimes (SNV), des cartes d'apprentissage, et un outil d'entraînement au Score de Glasgow.

L'ensemble des contenus (quiz, scénarios SNV et cartes d'apprentissage) sont inspirés uniquement des référentiels de recommandations de la DGSCGC (Direction Générale de la Sécurité Civile et de la Gestion des Crises) et sont générés par des IA en analysant les référentiels officiels.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure du projet](#-structure-du-projet)
- [API](#-api)
- [Développement](#-développement)
- [Tests](#-tests)
- [Contribution](#-contribution)
- [Licence](#-licence)

## ✨ Fonctionnalités

### Quiz interactifs
- Création et gestion de quiz personnalisés
- Questions à choix multiples avec explications
- Mode aléatoire pour varier les questions
- Timer par question configurable
- Score de passage personnalisable
- Catégorisation et niveaux de difficulté

### Scénarios SNV (Sauvetage à Nombreuses Victimes)
- Scénarios de simulation de situations d'urgence
- Gestion de multiples victimes par scénario
- Niveaux de difficulté (Débutant, Intermédiaire, Avancé)
- Description détaillée des situations

### Cartes d'apprentissage
- Cartes thématiques pour l'apprentissage
- Filtrage par thème, niveau et référentiel
- Informations structurées et référencées

### Score de Glasgow
- Outil d'entraînement interactif
- Table de référence complète
- Mnémoniques pour faciliter la mémorisation

### Administration
- Interface d'administration complète (EasyAdmin)
- Gestion des utilisateurs, quiz, questions, scénarios
- Import de données (quiz, cartes d'apprentissage, scénarios SNV)
- Gestion des référentiels PDF

## 🏗️ Architecture

Le projet est structuré en deux parties principales :

### Back-end (API REST)
- **Framework** : Symfony 7.2
- **API** : API Platform 4.1
- **Base de données** : MariaDB 10.11
- **ORM** : Doctrine 3.3
- **Environnement de développement** : DDEV

### Front-end (Application web)
- **Framework** : Next.js 16.1.0 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS 4
- **Composants UI** : Radix UI
- **Animations** : Framer Motion

## 🛠️ Technologies

### Back-end
- PHP 8.3+
- Symfony 7.2
- API Platform 4.1
- Doctrine ORM 3.3
- EasyAdmin Bundle 4.24
- Vich Uploader Bundle (gestion des fichiers)
- Nelmio CORS Bundle

### Front-end
- Next.js 16.1.0
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- Axios 1.13.2
- Radix UI
- Framer Motion 12.23.26
- Lucide React (icônes)

## 📦 Prérequis

- **DDEV** : Pour le développement du back-end
  - Installation : [Documentation DDEV](https://ddev.readthedocs.io/en/stable/)
- **Node.js** : Version 22+ recommandée
- **Composer** : Pour la gestion des dépendances PHP
- **Git** : Pour le contrôle de version

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-depot>
cd rescuelearn
```

### 2. Configuration du back-end

```bash
cd back

# Démarrer l'environnement DDEV
ddev start

# Installer les dépendances PHP
ddev exec composer install

# Créer la base de données (si nécessaire)
ddev exec bin/console doctrine:database:create

# Appliquer les migrations
ddev exec bin/console doctrine:migrations:migrate

# Créer un utilisateur administrateur
ddev exec bin/console app:create-admin admin@example.com password123
```

### 3. Configuration du front-end

```bash
cd front

# Installer les dépendances
npm install
# ou
bun install
```

### 4. Variables d'environnement

#### Back-end
Les variables d'environnement sont gérées par DDEV. La configuration se trouve dans `back/.ddev/config.yaml`.

Pour les variables personnalisées, créer un fichier `.env.local` dans le dossier `back/` :

```env
# Exemple de variables d'environnement
DATABASE_URL="mysql://db:db@db:3306/db"
```

#### Front-end
Créer un fichier `.env.local` dans le dossier `front/` :

```env
NEXT_PUBLIC_API_URL=http://rescuelearn-back.ddev.site/api
```

## ⚙️ Configuration

### DDEV (Back-end)

Le projet utilise DDEV pour l'environnement de développement. La configuration se trouve dans `back/.ddev/config.yaml`.

**URLs par défaut** :
- Front-end : `http://rescuelearn-back.ddev.site`
- API : `http://rescuelearn-back.ddev.site/api`
- Admin : `http://rescuelearn-back.ddev.site/admin`
- Base de données : `localhost:3306` (ou via `ddev mysql`)

### Base de données

La base de données est automatiquement configurée par DDEV. Les migrations sont gérées via Doctrine Migrations.

## 💻 Utilisation

### Démarrer le back-end

```bash
cd back
ddev start
```

L'API sera accessible à l'adresse : `http://rescuelearn-back.ddev.site/api`

### Démarrer le front-end

```bash
cd front
npm run dev
# ou
bun dev
```

L'application sera accessible à l'adresse : `http://localhost:3000`

### Accéder à l'administration

1. Démarrer DDEV : `ddev start`
2. Accéder à : `http://rescuelearn-back.ddev.site/admin`
3. Se connecter avec les identifiants créés via la commande `app:create-admin`

## 📁 Structure du projet

```
rescuelearn/
├── back/                    # Back-end Symfony
│   ├── config/             # Configuration Symfony
│   ├── migrations/         # Migrations Doctrine
│   ├── public/             # Point d'entrée web
│   ├── src/
│   │   ├── ApiResource/   # Ressources API Platform
│   │   ├── Command/        # Commandes console
│   │   ├── Controller/     # Contrôleurs
│   │   │   ├── Admin/      # Contrôleurs EasyAdmin
│   │   │   └── Api/        # Contrôleurs API
│   │   ├── Entity/         # Entités Doctrine
│   │   ├── Filter/         # Filtres API Platform
│   │   ├── Form/           # Formulaires Symfony
│   │   └── Repository/     # Repositories Doctrine
│   ├── templates/          # Templates Twig
│   └── tests/              # Tests PHPUnit
│
├── front/                   # Front-end Next.js
│   ├── public/             # Fichiers statiques
│   └── src/
│       ├── app/            # Pages et routes Next.js
│       │   ├── quiz/       # Pages quiz
│       │   ├── snv/        # Pages scénarios SNV
│       │   ├── glasgow/    # Pages Score de Glasgow
│       │   └── learning/   # Pages cartes d'apprentissage
│       ├── components/     # Composants React réutilisables
│       └── lib/            # Utilitaires et services
│
└── README.md               # Ce fichier
```

## 🔌 API

L'API REST est documentée automatiquement via API Platform et accessible à :

- **Documentation Swagger** : `http://rescuelearn-back.ddev.site/api/docs`
- **Documentation Hydra** : `http://rescuelearn-back.ddev.site/api`

### Ressources API principales

- `/api/quizzes` - Gestion des quiz
- `/api/questions` - Gestion des questions
- `/api/learning_cards` - Cartes d'apprentissage
- `/api/snv_scenarios` - Scénarios SNV
- `/api/users` - Gestion des utilisateurs

### Exemple d'utilisation

```bash
# Récupérer tous les quiz
curl http://rescuelearn-back.ddev.site/api/quizzes

# Récupérer un quiz spécifique
curl http://rescuelearn-back.ddev.site/api/quizzes/1
```

## 🛠️ Développement

### Commandes DDEV utiles

```bash
# Démarrer l'environnement
ddev start

# Arrêter l'environnement
ddev stop

# Redémarrer l'environnement
ddev restart

# Exécuter une commande Symfony
ddev exec bin/console [commande]

# Accéder à la base de données
ddev mysql

# Accéder au shell du conteneur
ddev ssh

# Vider le cache Symfony
ddev exec bin/console cache:clear
```

### Commandes Symfony utiles

```bash
# Créer une migration
ddev exec bin/console make:migration

# Appliquer les migrations
ddev exec bin/console doctrine:migrations:migrate

# Créer une entité
ddev exec bin/console make:entity

# Créer un contrôleur
ddev exec bin/console make:controller

# Créer une ressource API Platform
ddev exec bin/console make:api-platform:resource
```

### Commandes Next.js

```bash
# Développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm start

# Linter
npm run lint
```

## 🧪 Tests

### Tests back-end (PHPUnit)

```bash
cd back
ddev exec bin/phpunit
```

### Tests front-end

Les tests front-end peuvent être ajoutés avec Jest et React Testing Library.

## 📝 Entités principales

### Quiz
- Titre, temps par question, score de passage
- Mode aléatoire
- Relations avec questions, catégories et niveaux

### Question
- Texte, réponse correcte, explication
- Options de réponse multiples
- Relation avec un quiz

### LearningCard
- Thème, niveau, informations
- Référence et référentiel associé

### SNVScenario
- Titre, niveau, description
- Liste de victimes associées

### User
- Email, mot de passe hashé
- Rôles (ROLE_USER, ROLE_ADMIN)

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Ajout d'une fonctionnalité'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de codage

- **PHP** : PSR-1, PSR-2, PSR-12
- **TypeScript** : Configuration ESLint du projet
- **Commits** : Messages en français

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔗 Ressources

- [Documentation Symfony](https://symfony.com/doc/current/index.html)
- [Documentation API Platform](https://api-platform.com/docs/)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation DDEV](https://ddev.readthedocs.io/)
- [Référentiels DGSCGC](https://mobile.interieur.gouv.fr/Le-ministere/Securite-civile/Documentation-technique/Secourisme-et-associations/Les-recommandations-et-les-referentiels)

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur le dépôt.

---

**RescueLearn** - Votre plateforme complète pour l'apprentissage du secourisme 🚑

