import { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cartes d'Apprentissage",
  description:
    "Explorez nos cartes d'apprentissage interactives pour améliorer vos connaissances en secourisme. Filtrez par thème et niveau pour un apprentissage personnalisé.",
  keywords:
    "cartes apprentissage, formation secourisme, fiches pédagogiques, apprentissage interactif, formation médicale",
  alternates: {
    canonical: "/learning",
  },
  openGraph: {
    title: "Cartes d'Apprentissage | RescueLearn",
    description:
      "Explorez nos cartes d'apprentissage interactives pour améliorer vos connaissances en secourisme.",
    type: "website",
    url: "/learning",
    siteName: "RescueLearn",
    locale: "fr_FR",
    images: [DEFAULT_OG_IMAGE],
  },
};
