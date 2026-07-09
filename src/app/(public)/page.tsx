import { Metadata } from "next";
import { HomeClient } from "./components/HomeClient";

export const metadata: Metadata = {
  title:
    "RescueLearn - Plateforme d'apprentissage du secourisme | Quiz et formations",
  description:
    "Découvrez RescueLearn, votre plateforme complète pour apprendre, tester et améliorer vos connaissances en secourisme. Quiz interactifs, formations en ligne, scénarios SNV et ressources pratiques pour maîtriser les gestes qui sauvent.",
  keywords:
    "secourisme, formation, quiz, SNV, premiers secours, PSE1, PSE2, apprentissage, formation continue, gestes qui sauvent",
  authors: [{ name: "RescueLearn" }],
  creator: "RescueLearn",
  publisher: "RescueLearn",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://rescuelearn.fr"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "RescueLearn - Plateforme d'apprentissage du secourisme",
    description:
      "Votre plateforme complète pour l'apprentissage du secourisme. Quiz interactifs et scénarios SNV pour maîtriser les gestes qui sauvent.",
    url: "https://rescuelearn.fr",
    siteName: "RescueLearn",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/rescuelearn_opengraph.png",
        width: 1200,
        height: 630,
        alt: "RescueLearn - Plateforme d'apprentissage du secourisme",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RescueLearn - Plateforme d'apprentissage du secourisme",
    description:
      "Votre plateforme complète pour l'apprentissage du secourisme. Quiz interactifs et scénarios SNV.",
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

export default function Home() {
  return <HomeClient />;
}
