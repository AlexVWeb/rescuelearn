import { Metadata } from "next";
import { GlasgowTableTraining } from "./components/GlasgowTableTraining";
import { glasgowMetadata } from "./metadata";

export const metadata: Metadata = glasgowMetadata;

/**
 * Page d'entraînement au Score de Glasgow
 *
 * Cette page permet aux utilisateurs de s'entraîner à mémoriser
 * et utiliser le Score de Glasgow pour évaluer l'état de conscience
 * des victimes en situation d'urgence.
 */
export default function GlasgowPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section
        className="bg-white py-12"
        aria-labelledby="glasgow-hero-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1
              id="glasgow-hero-heading"
              className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl"
            >
              Entraînement au{" "}
              <span className="text-blue-600">Score de Glasgow</span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
              Maîtrisez l&apos;évaluation de l&apos;état de conscience des
              victimes avec notre tableau d&apos;entraînement interactif.
              Apprenez les réponses oculaires, verbales et motrices pour établir
              un bilan neurologique précis.
            </p>
            <div className="mx-auto max-w-4xl rounded-lg bg-blue-50 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-blue-800">
                Qu&apos;est-ce que le Score de Glasgow ?
              </h2>
              <div className="space-y-3 text-left text-gray-700">
                <p>
                  Le Score de Glasgow (Glasgow Coma Scale) est un outil
                  d&apos;évaluation de l&apos;état de conscience développé en
                  1974. Il permet d&apos;évaluer rapidement et objectivement
                  l&apos;état neurologique d&apos;une victime en situation
                  d&apos;urgence.
                </p>
                <p>
                  <strong>
                    Score total = Y (Oculaire) + V (Verbale) + M (Motrice)
                  </strong>
                </p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>
                    <strong>Score ≤ 8 :</strong> Victime inconsciente → BILAN
                    JAUNE
                  </li>
                  <li>
                    <strong>Score 9-12 :</strong> Altération de la conscience
                  </li>
                  <li>
                    <strong>Score 13-15 :</strong> Conscience normale
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Training Section */}
      <section className="py-12" aria-labelledby="training-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="training-heading"
            className="mb-8 text-center text-3xl font-bold text-gray-900"
          >
            Tableau d&apos;Entraînement Interactif
          </h2>
          <GlasgowTableTraining />
        </div>
      </section>

      {/* Information Section */}
      <section className="bg-white py-12" aria-labelledby="info-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="info-heading"
            className="mb-8 text-center text-3xl font-bold text-gray-900"
          >
            Comment utiliser le Score de Glasgow ?
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-blue-800">
                <span className="text-2xl">👁️</span>
                Réponse Oculaire (Y)
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>4 points :</strong> Ouverture spontanée des yeux
                </li>
                <li>
                  <strong>3 points :</strong> Ouverture à l&apos;appel verbal
                </li>
                <li>
                  <strong>2 points :</strong> Ouverture à la douleur
                </li>
                <li>
                  <strong>1 point :</strong> Aucune ouverture
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-green-50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-green-800">
                <span className="text-2xl">💬</span>
                Réponse Verbale (V)
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>5 points :</strong> Conversation normale
                </li>
                <li>
                  <strong>4 points :</strong> Conversation confuse
                </li>
                <li>
                  <strong>3 points :</strong> Mots inappropriés
                </li>
                <li>
                  <strong>2 points :</strong> Sons incompréhensibles
                </li>
                <li>
                  <strong>1 point :</strong> Aucune réponse
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-red-50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-red-800">
                <span className="text-2xl">✋</span>
                Réponse Motrice (M)
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>6 points :</strong> Obéit aux ordres
                </li>
                <li>
                  <strong>5 points :</strong> Localise la douleur
                </li>
                <li>
                  <strong>4 points :</strong> Flexion simple
                </li>
                <li>
                  <strong>3 points :</strong> Flexion stéréotypée
                </li>
                <li>
                  <strong>2 points :</strong> Extension
                </li>
                <li>
                  <strong>1 point :</strong> Aucune réponse
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-12" aria-labelledby="tips-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="tips-heading"
            className="mb-8 text-center text-3xl font-bold text-gray-900"
          >
            Conseils d&apos;utilisation
          </h2>
          <div className="mx-auto max-w-4xl rounded-lg bg-yellow-50 p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-semibold text-yellow-800">
                  ✅ Bonnes pratiques
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • Évaluez toujours dans l&apos;ordre : Oculaire → Verbale →
                    Motrice
                  </li>
                  <li>• Testez la douleur sur les ongles ou le sternum</li>
                  <li>• Notez le score total et chaque composant</li>
                  <li>• Réévaluez régulièrement l&apos;évolution</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold text-yellow-800">
                  ⚠️ Points d&apos;attention
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Ne pas forcer l&apos;ouverture des paupières</li>
                  <li>
                    • Tenir compte des facteurs confondants (alcool,
                    médicaments)
                  </li>
                  <li>• Le score peut fluctuer rapidement</li>
                  <li>• Toujours associer à un examen clinique complet</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
