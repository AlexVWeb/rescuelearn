import { Metadata } from 'next';
import { Heart } from 'lucide-react';
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
              Apprenez les gestes qui sauvent avec <span className="text-blue-600">RescueLearn</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Votre plateforme complète pour l&apos;apprentissage du secourisme. Quiz interactifs, formations en ligne, et ressources pratiques pour maîtriser les gestes qui sauvent.
            </p>
            <div className="flex justify-center">
              <Link 
                href="/quiz" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Commencer un quiz
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
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quiz Interactifs</h3>
              <p className="text-gray-600">
                Testez vos connaissances avec nos quiz interactifs et progressifs. Apprenez à votre rythme et suivez votre progression.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
