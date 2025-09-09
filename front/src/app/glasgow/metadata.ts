import type { Metadata } from 'next';

export const glasgowMetadata: Metadata = {
    title: 'Entraînement Score de Glasgow | RescueLearn',
    description: 'Entraînez-vous au Score de Glasgow avec notre tableau interactif. Apprenez et mémorisez les scores oculaires, verbaux et moteurs pour évaluer l\'état de conscience des victimes.',
    keywords: [
        'score de glasgow',
        'glasgow coma scale',
        'évaluation conscience',
        'secourisme',
        'urgence médicale',
        'bilan neurologique',
        'réponse oculaire',
        'réponse verbale',
        'réponse motrice',
        'entraînement secourisme',
        'formation secourisme'
    ],
    authors: [{ name: 'RescueLearn Team' }],
    creator: 'RescueLearn',
    publisher: 'RescueLearn',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL('https://rescuelearn.fr'),
    alternates: {
        canonical: '/glasgow',
    },
    openGraph: {
        title: 'Entraînement Score de Glasgow | RescueLearn',
        description: 'Entraînez-vous au Score de Glasgow avec notre tableau interactif. Apprenez et mémorisez les scores pour évaluer l\'état de conscience des victimes.',
        url: 'https://rescuelearn.fr/glasgow',
        siteName: 'RescueLearn',
        locale: 'fr_FR',
        type: 'website',
        images: [
            {
                url: '/rescuelearn_opengraph.png',
                width: 1200,
                height: 630,
                alt: 'Entraînement Score de Glasgow - RescueLearn',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Entraînement Score de Glasgow | RescueLearn',
        description: 'Entraînez-vous au Score de Glasgow avec notre tableau interactif.',
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
