import type { MetadataRoute } from "next";
import { FeatureKey, getFeaturesState } from "@/lib/features";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type SitemapRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  feature?: FeatureKey;
  images?: string[];
};

const ROUTES: SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  {
    path: "/formations",
    changeFrequency: "monthly",
    priority: 0.9,
    images: [
      "/dashboard_resculearn.png",
      "/session_organisme.png",
      "/base_stagiaire.png",
    ],
  },
  {
    path: "/quiz",
    changeFrequency: "weekly",
    priority: 0.8,
    feature: FeatureKey.QUIZ_SYSTEM,
  },
  {
    path: "/snv",
    changeFrequency: "weekly",
    priority: 0.8,
    feature: FeatureKey.SNV_SYSTEM,
  },
  {
    path: "/glasgow",
    changeFrequency: "monthly",
    priority: 0.8,
    feature: FeatureKey.GLASGOW_SYSTEM,
  },
  { path: "/learning", changeFrequency: "weekly", priority: 0.7 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let features: Partial<Record<FeatureKey, boolean>> = {};
  try {
    features = await getFeaturesState();
  } catch (error) {
    // Base indisponible (ex: build) : on expose toutes les routes publiques
    logger.error("sitemap: impossible de lire les features", error);
  }

  const lastModified = new Date();

  return ROUTES.filter(
    (route) => !route.feature || features[route.feature] !== false
  ).map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    ...(route.images && {
      images: route.images.map((image) => `${SITE_URL}${image}`),
    }),
  }));
}
