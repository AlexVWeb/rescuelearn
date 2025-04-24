import { Metadata } from 'next';
import { Heart, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accueil | RescueLearn',
  description: 'Découvrez RescueLearn, votre plateforme complète pour apprendre, tester et améliorer vos connaissances en secourisme. Quiz interactifs, formations en ligne, et ressources pratiques.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Apprenez et maintenez vos connaissances en secourisme avec <span className="text-blue-600">RescueLearn</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Votre plateforme complète pour l&apos;apprentissage du secourisme. Quiz interactifs et scénarios SNV pour maîtriser les gestes qui sauvent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/quiz" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Commencer un quiz
              </Link>
              <Link 
                href="/snv" 
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Découvrir les scénarios SNV
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Nos fonctionnalités
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link 
              href="/quiz" 
              className="bg-white p-8 rounded-xl shadow-sm aspect-square flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-blue-50"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quiz Interactifs</h3>
              <p className="text-gray-600">
                Testez vos connaissances avec nos quiz interactifs et progressifs. Apprenez à votre rythme et suivez votre progression.
              </p>
            </Link>

            <Link 
              href="/snv" 
              className="bg-white p-8 rounded-xl shadow-sm aspect-square flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-yellow-50"
            >
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Scénarios SNV</h3>
              <p className="text-gray-600">
                Entraînez-vous à la classification des victimes dans des situations d&apos;urgence à nombreuses victimes. Développez vos réflexes et votre prise de décision.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
