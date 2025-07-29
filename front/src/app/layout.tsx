import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "RescueLearn - Plateforme d&apos;Apprentissage du Secourisme",
    template: "%s | RescueLearn"
  },
  description: "RescueLearn est votre plateforme complète pour apprendre, tester et améliorer vos connaissances en secourisme. Quiz interactifs, formations en ligne, et ressources pratiques pour maîtriser les gestes qui sauvent.",
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
    "PSC1",
    "PSE1",
    "PSE2"
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
    description: "Apprenez, testez et améliorez vos connaissances en secourisme avec RescueLearn.",
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
    description: "Apprenez, testez et améliorez vos connaissances en secourisme avec RescueLearn.",
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
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center cursor-pointer text-blue-600 hover:text-blue-700 transition-colors">
                  <span className="text-2xl font-bold">RescueLearn</span>
                </Link>
              </div>

              {/* Menu desktop */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">Accueil</Link>
                <Link href="/quiz" className="text-gray-700 hover:text-blue-600 transition-colors">Quiz</Link>
                <Link href="/snv" className="text-gray-700 hover:text-blue-600 transition-colors">SNV</Link>
                <Link href="/learning" className="text-gray-700 hover:text-blue-600 transition-colors">Cartes d&apos;apprentissage</Link>
              </div>

              {/* Menu mobile */}
              <div className="flex items-center md:hidden">
                <MobileMenu />
              </div>
            </div>
          </nav>
        </header>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <footer className="bg-white border-t">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">RescueLearn</h3>
                <p className="mt-4 text-sm text-gray-500">
                  Votre plateforme complète pour l&apos;apprentissage du secourisme.
                </p>
                <p className="mt-4 text-sm text-gray-500">
                  {"L'ensemble des quiz, scénarios SNV et cartes d'apprentissage sont inspirés uniquement des référentiels de recommandations de la DGSCGC et sont générés par des IA en analysant les référentiels."}
                </p>
                <p className="mt-4 text-sm text-gray-500">
                  <Link href="https://mobile.interieur.gouv.fr/Le-ministere/Securite-civile/Documentation-technique/Secourisme-et-associations/Les-recommandations-et-les-referentiels" className="text-blue-600 hover:text-blue-700" target="_blank">Voir les référentiels</Link>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Navigation</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link href="/quiz" className="text-sm text-gray-500 hover:text-blue-600">Quiz</Link></li>
                  <li><Link href="/snv" className="text-sm text-gray-500 hover:text-blue-600">Scénarios SNV</Link></li>
                  <li><Link href="/learning" className="text-sm text-gray-500 hover:text-blue-600">Cartes d&apos;apprentissage</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 border-t pt-8">
              <p className="text-sm text-gray-500 text-center">
                © {new Date().getFullYear()} RescueLearn. Tous droits réservés. <Link href="https://www.linkedin.com/in/alexandre-valet/" className="text-blue-600 hover:text-blue-700">Alexandre Valet</Link>
              </p>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
