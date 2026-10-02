/**
 * Contenu partagé de la landing organismes de formation.
 * Utilisé à la fois par l'UI et par les données structurées (JSON-LD FAQPage),
 * pour garantir que le balisage reflète exactement le contenu visible.
 */
export const FAQ_ITEMS = [
  {
    question: "Comment fonctionne l'émargement numérique sur RescueLearn ?",
    answer:
      "RescueLearn simplifie l'émargement. Lors d'une session de formation, chaque stagiaire peut émarger directement sur tablette, smartphone ou ordinateur en saisissant un code PIN individuel sécurisé ou en signant sur l'écran. La feuille d'émargement PDF est générée instantanément avec les signatures et horodatages.",
  },
  {
    question: "La plateforme aide-t-elle à préparer les audits Qualiopi ?",
    answer:
      "Oui, tout à fait. RescueLearn centralise de façon structurée et infalsifiable toutes les pièces administratives requises lors d'un audit de certification (indicateurs de la base stagiaire, feuilles d'émargement signées numériquement, taux d'assiduité, et résultats d'évaluations). Cela vous évite les pertes de documents et facilite grandement la preuve de conformité.",
  },
  {
    question: "Quelles formations de secourisme peut-on gérer ?",
    answer:
      "RescueLearn prend en charge les principales formations de secourisme : PSC, PSE1, PSE2, SST, ainsi que les formations de formateurs. Chaque session peut être marquée comme formation initiale ou formation continue (recyclage), et la date de validité de chaque stagiaire est calculée automatiquement.",
  },
  {
    question: "Peut-on importer une liste de stagiaires existante ?",
    answer:
      "Oui. Vous pouvez importer votre base de stagiaires depuis un fichier Excel, puis compléter chaque fiche avec les formations suivies dans d'autres organismes afin de conserver un historique complet.",
  },
  {
    question:
      "Pouvons-nous gérer plusieurs formateurs au sein de notre organisme ?",
    answer:
      "Absolument. En tant qu'administrateur de votre organisme sur RescueLearn, vous pouvez inviter vos formateurs, leur attribuer des sessions spécifiques et leur donner accès à la gestion de leurs stagiaires en toute autonomie.",
  },
  {
    question:
      "Vos documents générés (PDF) sont-ils conformes aux exigences réglementaires ?",
    answer:
      "Oui, les attestations de fin de formation et les feuilles d'émargement générées automatiquement contiennent toutes les mentions obligatoires requises par la DGSCGC et les financeurs publics : dates, heures, noms des formateurs, détails des modules de secourisme et signatures sécurisées.",
  },
];

export const FORMATIONS_FEATURES = [
  "Planification des sessions de formation (PSC, PSE1, PSE2, SST, formateurs) et des créneaux",
  "Émargement numérique sécurisé par code PIN individuel ou signature manuscrite",
  "Génération automatique des feuilles d'émargement PDF",
  "Attestations de fin de formation et fiches d'évaluation formative PSC en PDF",
  "Base stagiaires unifiée avec import Excel et historique des formations externes",
  "Suivi de la validité des diplômes et des recyclages (formation continue)",
  "Gestion multi-formateurs avec invitations et rôles",
  "Tableau de bord avec indicateurs d'activité et taux de présence",
];
