import { Metadata } from "next";
import { HomeClient } from "./components/HomeClient";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute:
      "RescueLearn - Plateforme d'apprentissage du secourisme | Quiz et formations",
  },
  description:
    "Apprenez le secourisme avec des quiz, scénarios SNV et cartes interactives. Organismes de formation : gérez sessions, émargement et stagiaires en ligne.",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "RescueLearn - Plateforme d'apprentissage du secourisme",
    description:
      "Votre plateforme complète pour l'apprentissage du secourisme. Quiz interactifs et scénarios SNV pour maîtriser les gestes qui sauvent.",
    url: "/",
    siteName: "RescueLearn",
    locale: "fr_FR",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "RescueLearn - Plateforme d'apprentissage du secourisme",
    description:
      "Votre plateforme complète pour l'apprentissage du secourisme. Quiz interactifs et scénarios SNV.",
    creator: "@rescuelearn",
    images: [DEFAULT_OG_IMAGE],
  },
  category: "education",
};

export default function Home() {
  // Schema.org structured data for SEO rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "fr-FR",
        description:
          "Plateforme d'apprentissage du secourisme (quiz, scénarios SNV, score de Glasgow, cartes d'apprentissage) et logiciel de gestion de formation pour les organismes.",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
