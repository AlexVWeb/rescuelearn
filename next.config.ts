import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { resolveSentryEnvironment } from "./src/lib/sentry/environment";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Figés au build et identiques navigateur / serveur / edge
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: resolveSentryEnvironment(process.env),
    NEXT_PUBLIC_SENTRY_BRANCH: process.env.VERCEL_GIT_COMMIT_REF ?? "",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Évite de transmettre les URL R2 signées en Referer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Espace stagiaire : données personnelles, jamais en cache ni indexées
        source: "/espace/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Token d'organisation (sntrys_…) : il embarque l'URL de la région EU.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  // Doit correspondre à SENTRY_APPLICATION_KEY (src/lib/sentry/options.ts)
  applicationKey: "rescuelearn",
  // Source maps envoyées à Sentry puis supprimées du build : jamais servies publiquement
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Route fixe (et non `true`) pour pouvoir l'exclure du middleware
  tunnelRoute: "/sentry-tunnel",
  // Noms de composants dans les breadcrumbs de clic (aucune donnée saisie)
  reactComponentAnnotation: { enabled: true },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
});
