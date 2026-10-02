/**
 * URL canonique du site public, utilisée pour le SEO
 * (metadataBase, sitemap, robots, llms.txt).
 */
export const SITE_URL = "https://rescuelearn.fr";

export const SITE_NAME = "RescueLearn";

/** Image de partage par défaut (servie depuis src/app/opengraph-image.png). */
export const DEFAULT_OG_IMAGE = "/opengraph-image.png";

/**
 * Seul le déploiement de production doit être indexé.
 * Les previews Vercel et le local sont exclus des moteurs de recherche.
 */
export const IS_INDEXABLE = process.env.VERCEL_ENV === "production";
