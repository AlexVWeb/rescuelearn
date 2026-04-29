import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "RescueLearn - Plateforme d&apos;Apprentissage du Secourisme",
    template: "%s | RescueLearn",
  },
  description:
    "RescueLearn est votre plateforme complète pour apprendre, tester et améliorer vos connaissances en secourisme. Quiz interactifs, formations en ligne, et ressources pratiques pour maîtriser les gestes qui sauvent.",
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
    url: "https://rescuelearn.fr",
    siteName: "RescueLearn",
    title: "RescueLearn - Plateforme d&apos;Apprentissage du Secourisme",
    description:
      "Apprenez, testez et améliorez vos connaissances en secourisme avec RescueLearn.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "RescueLearn - Plateforme d&apos;Apprentissage du Secourisme",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RescueLearn - Plateforme d&apos;Apprentissage du Secourisme",
    description:
      "Apprenez, testez et améliorez vos connaissances en secourisme avec RescueLearn.",
    images: ["/twitter-image.jpg"],
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
  verification: {
    google: "votre-code-google",
    yandex: "votre-code-yandex",
    yahoo: "votre-code-yahoo",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
