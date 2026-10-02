import { Metadata } from "next";
import { FormationsLandingClient } from "./components/FormationsLandingClient";
import { FAQ_ITEMS, FORMATIONS_FEATURES } from "./content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = "Logiciel de gestion de formation secourisme";
const DESCRIPTION =
  "Logiciel pour organismes de formation secourisme (PSC, PSE1, PSE2, SST) : sessions, émargement numérique, suivi stagiaires et attestations PDF.";
const OG_IMAGE = {
  url: "/dashboard_resculearn.png",
  width: 3024,
  height: 1654,
  alt: "Tableau de bord RescueLearn pour la gestion des formations de secourisme",
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "logiciel gestion formation secourisme",
    "logiciel organisme de formation",
    "organisme de formation secourisme",
    "émargement numérique",
    "feuille d'émargement électronique",
    "signature numérique stagiaire",
    "gestion des stagiaires",
    "suivi recyclage secourisme",
    "formation continue PSE",
    "attestation de formation PSC",
    "Qualiopi",
    "PSC",
    "PSE1",
    "PSE2",
    "SST",
  ],
  alternates: {
    canonical: "/formations",
  },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description:
      "Automatisez la gestion administrative de vos formations de secourisme : émargement numérique, suivi stagiaires, recyclages et attestations PDF.",
    url: "/formations",
    siteName: SITE_NAME,
    locale: "fr_FR",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ${SITE_NAME}`,
    description:
      "Automatisez la gestion administrative de vos formations de secourisme : émargement numérique, suivi stagiaires, recyclages et attestations PDF.",
    images: [OG_IMAGE.url],
  },
};

export default function FormationsPage() {
  // Schema.org structured data for SEO rich results
  const pageUrl = `${SITE_URL}/formations`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${pageUrl}#software`,
        name: `${SITE_NAME} - Gestion de formation secourisme`,
        url: pageUrl,
        image: `${SITE_URL}${OG_IMAGE.url}`,
        operatingSystem: "Web",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Logiciel de gestion de formation",
        inLanguage: "fr-FR",
        description: DESCRIPTION,
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Organismes de formation en secourisme",
        },
        featureList: FORMATIONS_FEATURES,
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Organismes de formation",
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FormationsLandingClient />
    </>
  );
}
