/**
 * Environnement Sentry, calculé au build depuis les variables système Vercel :
 * - `production` / `preview` : VERCEL_ENV
 * - environnement personnalisé Vercel (ex. `staging`) : VERCEL_TARGET_ENV
 * - hors Vercel (poste local) : `development`
 *
 * Importé en relatif par next.config.ts, qui l'injecte dans le bundle via `env`.
 */
export function resolveSentryEnvironment(
  env: Record<string, string | undefined>
): string {
  return env.VERCEL_TARGET_ENV || env.VERCEL_ENV || "development";
}
