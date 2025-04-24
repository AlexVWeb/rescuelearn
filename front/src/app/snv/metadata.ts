import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scénarios SNV | RescueLearn',
  description: 'Entraînez-vous à la classification des victimes dans des situations d\'urgence à nombreuses victimes. Choisissez votre niveau de difficulté et améliorez vos compétences.',
  keywords: 'scénarios SNV, situations nombreuses victimes, triage médical, formation secourisme, gestion crise',
  openGraph: {
    title: 'Scénarios SNV | RescueLearn',
    description: 'Entraînez-vous à la classification des victimes dans des situations d\'urgence à nombreuses victimes.',
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/snv`,
  },
}; 