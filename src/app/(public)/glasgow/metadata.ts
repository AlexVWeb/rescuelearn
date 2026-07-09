import type { Metadata } from "next";

export const glasgowMetadata: Metadata = {
  title:
    "Score de Glasgow : Simulateur & Entraînement interactif | RescueLearn",
  description:
    "Maîtrisez le Score de Glasgow (GCS) avec notre simulateur clinique interactif. Idéal pour les secouristes (PSE1, PSE2, SUAP, SST), pompiers et professionnels de l'urgence en France.",
  keywords: [
    "score de glasgow",
    "glasgow coma scale",
    "gcs secourisme",
    "évaluation conscience",
    "bilan neurologique",
    "secourisme france",
    "dgscgc secourisme",
    "pse1 glasgow",
    "pse2 glasgow",
    "suap",
    "urgence médicale",
    "réponse oculaire",
    "réponse verbale",
    "réponse motrice",
    "bilan jaune secourisme",
    "entraînement secourisme",
  ],
  authors: [{ name: "RescueLearn Team" }],
  creator: "RescueLearn",
  publisher: "RescueLearn",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://rescuelearn.fr"),
  alternates: {
    canonical: "/glasgow",
  },
  openGraph: {
    title:
      "Score de Glasgow : Simulateur & Entraînement interactif | RescueLearn",
    description:
      "Simulateur clinique interactif du Score de Glasgow. Apprenez à évaluer l'état de conscience d'une victime selon les référentiels de secourisme français (DGSCGC).",
    url: "https://rescuelearn.fr/glasgow",
    siteName: "RescueLearn",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/rescuelearn_opengraph.png",
        width: 1200,
        height: 630,
        alt: "Simulateur et Entraînement Score de Glasgow - RescueLearn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Score de Glasgow : Simulateur & Entraînement interactif | RescueLearn",
    description:
      "Maîtrisez l'évaluation neurologique avec notre simulateur interactif du Score de Glasgow conforme DGSCGC.",
    images: ["/rescuelearn_opengraph.png"],
    creator: "@rescuelearn",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "education",
};
