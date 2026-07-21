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
