import { Metadata } from "next";
import { FormationsLandingClient } from "./components/FormationsLandingClient";

export const metadata: Metadata = {
  title:
    "RescueLearn - Logiciel de gestion de formation secourisme | Émargement & Suivi",
  description:
    "Découvrez la solution tout-en-un pour les organismes de formation en secourisme. Gestion des sessions, émargement numérique sécurisé (code PIN/signature), suivi individuel des stagiaires et génération automatique de documents de présence (PDF).",
  keywords:
    "logiciel de formation, organisme de formation secourisme, émargement numérique, feuille d'émargement électronique, signature numérique stagiaire, gestion administrative qualiopi, suivi des formations, secourisme, premiers secours",
  authors: [{ name: "RescueLearn" }],
  creator: "RescueLearn",
  publisher: "RescueLearn",
  alternates: {
    canonical: "/formations",
  },
  openGraph: {
    title: "RescueLearn - Logiciel de gestion de formation secourisme",
    description:
      "Automatisez la gestion administrative de vos formations de secourisme : émargement numérique, suivi stagiaires, attestations PDF.",
    url: "https://rescuelearn.fr/formations",
    siteName: "RescueLearn",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/dashboard_resculearn.png",
        width: 1200,
        height: 630,
        alt: "RescueLearn - Interface de gestion de formation pour organismes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RescueLearn - Logiciel de gestion de formation secourisme",
    description:
      "Automatisez la gestion administrative de vos formations de secourisme : émargement numérique, suivi stagiaires, attestations PDF.",
    images: ["/dashboard_resculearn.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FormationsPage() {
  // Schema.org structured data for SEO rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RescueLearn",
    operatingSystem: "All",
    applicationCategory: "EducationalApplication, BusinessApplication",
    description:
      "Plateforme complète de gestion de sessions et d'émargement numérique pour les organismes de formation en secourisme.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Démonstration gratuite disponible sur demande.",
    },
    featureList: [
      "Tableau de bord intelligent avec suivi des indicateurs",
      "Émargement numérique sécurisé par code PIN ou signature manuelle",
      "Génération automatique des feuilles d'émargement conformes en PDF",
      "Suivi de la base stagiaires et archivage des résultats d'évaluations",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <FormationsLandingClient />
      </main>
    </>
  );
}
