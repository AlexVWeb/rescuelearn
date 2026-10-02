import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE_URL } from "@/lib/site";

const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/player",
  "/validation",
  "/invitation/",
  "/quiz/session/",
  "/login",
  "/reset-password",
  "/verify-email",
  "/maintenance",
  "/section-disabled",
];

export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
