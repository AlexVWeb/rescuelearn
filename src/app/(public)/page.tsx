import { Metadata } from "next";
import { Heart, AlertTriangle, BookOpen, Brain } from "lucide-react";
import Link from "next/link";
import { LearningBar } from "./learning/components/LearningBar";

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
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-20" aria-labelledby="hero-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1
              id="hero-heading"
              className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl"
            >
              Apprenez et maintenez vos connaissances en secourisme avec{" "}
              <span className="text-blue-600">RescueLearn</span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
              Votre plateforme complète pour l&apos;apprentissage du secourisme.
              Quiz interactifs et scénarios SNV pour maîtriser les gestes qui
              sauvent.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/quiz"
                className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                aria-label="Commencer un quiz de secourisme"
              >
                Commencer un quiz
              </Link>
              <Link
                href="/glasgow"
                className="rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-700"
                aria-label="S'entraîner au Score de Glasgow"
              >
                Entraînement Glasgow
              </Link>
              <Link
                href="/snv"
                className="rounded-lg bg-yellow-500 px-6 py-3 text-white transition-colors hover:bg-yellow-600"
                aria-label="Découvrir les scénarios SNV (Sauvetage à Nombreuses Victimes)"
              >
                Découvrir les scénarios SNV
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="features-heading"
            className="mb-12 text-center text-3xl font-bold text-gray-900"
          >
            Nos fonctionnalités
          </h2>
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <article className="flex aspect-square flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm transition-all duration-300 hover:scale-105 hover:bg-blue-50 hover:shadow-lg">
              <Link
                href="/quiz"
                className="flex h-full w-full flex-col items-center justify-center"
                aria-label="Accéder aux quiz interactifs de secourisme"
              >
                <div
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100"
                  aria-hidden="true"
                >
                  <Heart className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Quiz Interactifs
                </h3>
                <p className="text-gray-600">
                  Testez vos connaissances avec nos quiz interactifs et
                  progressifs. Apprenez à votre rythme et suivez votre
                  progression.
                </p>
              </Link>
            </article>

            <article className="flex aspect-square flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm transition-all duration-300 hover:scale-105 hover:bg-yellow-50 hover:shadow-lg">
              <Link
                href="/snv"
                className="flex h-full w-full flex-col items-center justify-center"
                aria-label="Accéder aux scénarios SNV (Sauvetage à Nombreuses Victimes)"
              >
                <div
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-yellow-100"
                  aria-hidden="true"
                >
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Scénarios SNV
                </h3>
                <p className="text-gray-600">
                  Entraînez-vous à la classification des victimes dans des
                  situations d&apos;urgence à nombreuses victimes. Développez
                  vos réflexes et votre prise de décision.
                </p>
              </Link>
            </article>

            <article className="flex aspect-square flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm transition-all duration-300 hover:scale-105 hover:bg-purple-50 hover:shadow-lg">
              <Link
                href="/glasgow"
                className="flex h-full w-full flex-col items-center justify-center"
                aria-label="S'entraîner au Score de Glasgow"
              >
                <div
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-purple-100"
                  aria-hidden="true"
                >
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Score de Glasgow
                </h3>
                <p className="text-gray-600">
                  Entraînez-vous à l&apos;évaluation de l&apos;état de
                  conscience avec notre tableau interactif. Maîtrisez les
                  réponses oculaires, verbales et motrices.
                </p>
              </Link>
            </article>

            <article className="flex aspect-square flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm transition-all duration-300 hover:scale-105 hover:bg-green-50 hover:shadow-lg">
              <Link
                href="/learning"
                className="flex h-full w-full flex-col items-center justify-center"
                aria-label="Accéder aux cartes d'apprentissage de secourisme"
              >
                <div
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-green-100"
                  aria-hidden="true"
                >
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-gray-900">
                  Cartes d&apos;Apprentissage
                </h3>
                <p className="text-gray-600">
                  Découvrez nos cartes d&apos;apprentissage interactives.
                  Mélangez-les aléatoirement ou filtrez-les par thème et niveau
                  pour un apprentissage personnalisé.
                </p>
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* Learning Bar */}
      <LearningBar />
    </main>
  );
}
