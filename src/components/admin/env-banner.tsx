const ENV_LABELS: Record<string, string> = {
  production: "PRODUCTION",
  preview: "PREVIEW",
  development: "DÉVELOPPEMENT",
};

function getAppEnv(): string {
  return process.env.VERCEL_ENV ?? "local";
}

/** Bandeau d'environnement, affiché uniquement aux super admins. */
export function EnvBanner() {
  const env = getAppEnv();
  const isProd = env === "production";
  const label = ENV_LABELS[env] ?? env.toUpperCase();

  return (
    <div
      role="status"
      className={`sticky top-0 z-20 px-4 py-1 text-center text-xs font-semibold tracking-wide ${
        isProd ? "bg-red-600 text-white" : "bg-slate-800 text-white"
      }`}
    >
      Environnement : {label}
      {isProd && " — les modifications impactent les vrais utilisateurs"}
    </div>
  );
}
