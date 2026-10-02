import {
  FAQ_ITEMS,
  FORMATIONS_FEATURES,
} from "@/app/(public)/formations/content";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * llms.txt — résumé du site destiné aux LLM et moteurs de réponse IA.
 * Spécification : https://llmstxt.org
 */
const content = `# RescueLearn

> RescueLearn est une plateforme française d'apprentissage du secourisme. Elle propose des quiz interactifs, des scénarios de triage SNV (situations à nombreuses victimes), un simulateur du score de Glasgow et des cartes d'apprentissage, ainsi qu'un logiciel de gestion de formation (sessions, émargement numérique, suivi des stagiaires, attestations PDF) pour les organismes de formation en secourisme.

Les contenus pédagogiques (quiz, scénarios SNV, cartes d'apprentissage) sont inspirés uniquement des référentiels et recommandations de la DGSCGC (Direction Générale de la Sécurité Civile et de la Gestion des Crises) et sont générés par IA à partir de ces référentiels. Public visé : secouristes PSC, PSE1, PSE2, SST, sapeurs-pompiers (SUAP), formateurs et organismes de formation en France. Langue du site : français.

## Apprentissage gratuit

- [Quiz de secourisme](${SITE_URL}/quiz): quiz interactifs par thème et niveau de difficulté pour tester ses connaissances en premiers secours.
- [Scénarios SNV](${SITE_URL}/snv): entraînement au triage et à la classification des victimes en situation à nombreuses victimes.
- [Score de Glasgow](${SITE_URL}/glasgow): simulateur clinique interactif du Glasgow Coma Scale (réponses oculaire, verbale et motrice) pour le bilan neurologique.
- [Cartes d'apprentissage](${SITE_URL}/learning): fiches pédagogiques filtrables par thème et niveau.

## Organismes de formation (logiciel de gestion)

RescueLearn propose aux organismes de formation en secourisme (associations agréées, centres de formation, formateurs indépendants) un logiciel web de gestion administrative et pédagogique de leurs sessions.

- [Logiciel de gestion de formation secourisme](${SITE_URL}/formations): présentation complète de l'offre organismes.
- [Demander une démonstration](${SITE_URL}/formations#demo): démonstration gratuite et sans engagement, déploiement accompagné.

Fonctionnalités :

${FORMATIONS_FEATURES.map((feature) => `- ${feature}`).join("\n")}

Questions fréquentes :

${FAQ_ITEMS.map((item) => `- ${item.question} ${item.answer}`).join("\n")}

## Optional

- [Accueil](${SITE_URL}/): présentation générale de la plateforme.
- [Mises à jour & Roadmap](${SITE_URL}/changelog): nouveautés et fonctionnalités à venir.
- [Référentiels DGSCGC](https://mobile.interieur.gouv.fr/Le-ministere/Securite-civile/Documentation-technique/Secourisme-et-associations/Les-recommandations-et-les-referentiels): sources officielles des contenus.
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
