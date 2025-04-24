import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cartes d\'Apprentissage | RescueLearn',
  description: 'Explorez nos cartes d\'apprentissage interactives pour améliorer vos connaissances en secourisme. Filtrez par thème et niveau pour un apprentissage personnalisé.',
  keywords: 'cartes apprentissage, formation secourisme, fiches pédagogiques, apprentissage interactif, formation médicale',
  openGraph: {
    title: 'Cartes d\'Apprentissage | RescueLearn',
    description: 'Explorez nos cartes d\'apprentissage interactives pour améliorer vos connaissances en secourisme.',
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/learning`,
  },
}; 