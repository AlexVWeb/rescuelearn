import { Metadata } from 'next';
import { Heart, AlertTriangle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { LearningBar } from './learning/components/LearningBar';

export const metadata: Metadata = {
  title: 'RescueLearn - Plateforme d\'apprentissage du secourisme | Quiz et formations',
  description: 'Découvrez RescueLearn, votre plateforme complète pour apprendre, tester et améliorer vos connaissances en secourisme. Quiz interactifs, formations en ligne, scénarios SNV et ressources pratiques pour maîtriser les gestes qui sauvent.',
  keywords: 'secourisme, formation, quiz, SNV, premiers secours, PSE1, PSE2, apprentissage, formation continue, gestes qui sauvent',
  authors: [{ name: 'RescueLearn' }],
  creator: 'RescueLearn',
  publisher: 'RescueLearn',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://rescuelearn.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'RescueLearn - Plateforme d\'apprentissage du secourisme',
    description: 'Votre plateforme complète pour l\'apprentissage du secourisme. Quiz interactifs et scénarios SNV pour maîtriser les gestes qui sauvent.',
    url: 'https://rescuelearn.com',
    siteName: 'RescueLearn',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/rescuelearn_opengraph.png',
        width: 1200,
        height: 630,
        alt: 'RescueLearn - Plateforme d\'apprentissage du secourisme',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RescueLearn - Plateforme d\'apprentissage du secourisme',
    description: 'Votre plateforme complète pour l\'apprentissage du secourisme. Quiz interactifs et scénarios SNV.',
    images: ['/rescuelearn_opengraph.png'],
    creator: '@rescuelearn',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'education',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-20" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Apprenez et maintenez vos connaissances en secourisme avec <span className="text-blue-600">RescueLearn</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Votre plateforme complète pour l&apos;apprentissage du secourisme. Quiz interactifs et scénarios SNV pour maîtriser les gestes qui sauvent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/quiz"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Commencer un quiz de secourisme"
              >
                Commencer un quiz
              </Link>
              <Link
                href="/snv"
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="features-heading" className="text-3xl font-bold text-center text-gray-900 mb-12">
            Nos fonctionnalités
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <article className="bg-white p-8 rounded-xl shadow-sm aspect-square flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-blue-50">
              <Link
                href="/quiz"
                className="w-full h-full flex flex-col items-center justify-center"
                aria-label="Accéder aux quiz interactifs de secourisme"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6" aria-hidden="true">
                  <Heart className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Quiz Interactifs</h3>
                <p className="text-gray-600">
                  Testez vos connaissances avec nos quiz interactifs et progressifs. Apprenez à votre rythme et suivez votre progression.
                </p>
              </Link>
            </article>

            <article className="bg-white p-8 rounded-xl shadow-sm aspect-square flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-yellow-50">
              <Link
                href="/snv"
                className="w-full h-full flex flex-col items-center justify-center"
                aria-label="Accéder aux scénarios SNV (Sauvetage à Nombreuses Victimes)"
              >
                <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mb-6" aria-hidden="true">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Scénarios SNV</h3>
                <p className="text-gray-600">
                  Entraînez-vous à la classification des victimes dans des situations d&apos;urgence à nombreuses victimes. Développez vos réflexes et votre prise de décision.
                </p>
              </Link>
            </article>

            <article className="bg-white p-8 rounded-xl shadow-sm aspect-square flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-green-50">
              <Link
                href="/learning"
                className="w-full h-full flex flex-col items-center justify-center"
                aria-label="Accéder aux cartes d'apprentissage de secourisme"
              >
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6" aria-hidden="true">
                  <BookOpen className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Cartes d&apos;Apprentissage</h3>
                <p className="text-gray-600">
                  Découvrez nos cartes d&apos;apprentissage interactives. Mélangez-les aléatoirement ou filtrez-les par thème et niveau pour un apprentissage personnalisé.
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
