#!/bin/bash
# scripts/deploy.sh

# Couleurs pour le feedback
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Démarrage du processus de déploiement complet...${NC}"

# 1. Validation du code (Pipeline Zero Failure)
echo -e "\n${BLUE}🔍 Étape 1 : Validation technique locale...${NC}"

# On exécute les vérifications dans l'ordre de sévérité
echo "  - Type checking..."
bun run type-check || { echo -e "${RED}❌ Échec du type-check.${NC}"; exit 1; }

echo "  - Validation Prisma..."
bun run validate || { echo -e "${RED}❌ Échec de la validation Prisma.${NC}"; exit 1; }

echo "  - Tests unitaires..."
bun run test || { echo -e "${RED}❌ Échec des tests.${NC}"; exit 1; }

# 2. Déploiement Vercel
echo -e "\n${BLUE}☁️ Étape 2 : Envoi vers Vercel & Migration distante...${NC}"
CURRENT_BRANCH=$(git branch --show-current)

# On vérifie si la CLI Vercel est installée
if ! command -v vercel &> /dev/null
then
    echo -e "${RED}❌ La CLI Vercel n'est pas installée. Installez-la avec 'npm install -g vercel'.${NC}"
    exit 1
fi

if [ "$CURRENT_BRANCH" == "main" ]; then
    echo -e "${GREEN}🌍 Déploiement en PRODUCTION (branche main)${NC}"
    vercel --prod
else
    echo -e "${BLUE}🧪 Déploiement en PREVIEW (branche $CURRENT_BRANCH)${NC}"
    vercel
fi

echo -e "\n${GREEN}✅ Processus terminé ! Le build et la migration s'exécutent maintenant sur Vercel.${NC}"
