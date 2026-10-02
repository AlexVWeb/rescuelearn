import { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Scénarios SNV",
  description:
    "Entraînez-vous à la classification des victimes dans des situations d'urgence à nombreuses victimes. Choisissez votre niveau de difficulté et améliorez vos compétences.",
  keywords:
    "scénarios SNV, situations nombreuses victimes, triage médical, formation secourisme, gestion crise",
  alternates: {
    canonical: "/snv",
  },
  openGraph: {
    title: "Scénarios SNV | RescueLearn",
    description:
      "Entraînez-vous à la classification des victimes dans des situations d'urgence à nombreuses victimes.",
    type: "website",
    url: "/snv",
    siteName: "RescueLearn",
    locale: "fr_FR",
    images: [DEFAULT_OG_IMAGE],
  },
};
