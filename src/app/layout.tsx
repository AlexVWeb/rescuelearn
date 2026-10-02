import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { IS_INDEXABLE, SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "RescueLearn - Plateforme d'Apprentissage du Secourisme",
    template: "%s | RescueLearn",
  },
  description:
    "RescueLearn : quiz, scénarios SNV et cartes pour apprendre le secourisme, et logiciel de gestion de formation pour les organismes (émargement, suivi stagiaires).",
  keywords: [
    "secourisme",
    "formation secourisme",
    "premiers secours",
    "apprentissage secourisme",
    "quiz secourisme",
    "formation en ligne",
    "sauvetage",
    "urgence",
    "santé",
    "sécurité",
    "gestes qui sauvent",
    "PSC",
    "PSE1",
    "PSE2",
    "logiciel gestion formation secourisme",
    "émargement numérique",
  ],
  authors: [{ name: "RescueLearn Team" }],
  creator: "RescueLearn",
  publisher: "RescueLearn",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "RescueLearn - Plateforme d'Apprentissage du Secourisme",
    description:
      "Apprenez, testez et améliorez vos connaissances en secourisme avec RescueLearn.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RescueLearn - Plateforme d'Apprentissage du Secourisme",
    description:
      "Apprenez, testez et améliorez vos connaissances en secourisme avec RescueLearn.",
    creator: "@rescuelearn",
  },
  robots: {
    index: IS_INDEXABLE,
    follow: IS_INDEXABLE,
    googleBot: {
      index: IS_INDEXABLE,
      follow: IS_INDEXABLE,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
