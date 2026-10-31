import type { BrowserOptions, NodeOptions } from "@sentry/nextjs";
import { scrubBreadcrumb, scrubSpan } from "./scrub";

/** Même DSN côté navigateur et serveur : la route tunnel n'accepte que celui du serveur. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Doit correspondre à `applicationKey` dans next.config.ts. */
export const SENTRY_APPLICATION_KEY = "rescuelearn";

/** production | preview | <env personnalisé> | development (voir environment.ts) */
export const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development";
const environment = SENTRY_ENVIRONMENT;

/** Branche git déployée : distingue les previews entre elles. */
const branch = process.env.NEXT_PUBLIC_SENTRY_BRANCH || undefined;

/** Paramètres de query conservés : navigation uniquement, jamais de recherche libre. */
const ALLOWED_QUERY_PARAMS = ["page", "tab", "view", "type", "status", "sort"];

/**
 * Options communes navigateur / Node / edge.
 *
 * `dataCollection` (SDK v11) collecte presque tout par défaut : on coupe tout ce qui
 * peut porter une donnée personnelle (corps HTTP, cookies, variables locales,
 * paramètres SQL, prompts IA) et on garde la structure utile au diagnostic.
 */
export const sharedOptions = {
  dsn: SENTRY_DSN,
  environment,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV !== "test",
  tracesSampleRate: environment === "production" ? 0.1 : 1,
  initialScope: {
    tags: { "vercel.branch": branch ?? "local" },
  },
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: {
        allow: ["user-agent", "accept-language", "content-type", "x-vercel-id"],
      },
      response: { allow: ["content-type", "x-vercel-id", "x-vercel-cache"] },
    },
    httpBodies: [],
    urlQueryParams: { allow: ALLOWED_QUERY_PARAMS },
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    frameContextLines: 5,
  },
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSendSpan: scrubSpan,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],
} satisfies BrowserOptions & NodeOptions;
