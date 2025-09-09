import { Metadata } from 'next';
import { glasgowMetadata } from './metadata';

export const metadata: Metadata = glasgowMetadata;

/**
 * Layout pour la section Glasgow
 * 
 * Ce layout applique les métadonnées spécifiques à la section
 * d'entraînement au Score de Glasgow.
 */
export default function GlasgowLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
