import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiz de Secourisme | RescueLearn',
  description: 'Testez et améliorez vos connaissances en secourisme avec nos quiz interactifs. Choisissez votre niveau de difficulté et entraînez-vous à votre rythme.',
  keywords: 'quiz secourisme, formation premiers secours, test secourisme, quiz interactif, formation médicale',
  openGraph: {
    title: 'Quiz de Secourisme | RescueLearn',
    description: 'Testez et améliorez vos connaissances en secourisme avec nos quiz interactifs.',
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/quiz`,
  },
}; 