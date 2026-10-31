import * as Sentry from "@sentry/nextjs";

const SENSITIVE_KEYS = [
  "email",
  "password",
  "token",
  "secret",
  "key",
  "firstName",
  "lastName",
  "birthPlace",
  "phone",
  "address",
  "siret",
  "iban",
  "cvv",
  "authorization",
  "cookie",
  "to",
  "subject",
  "text",
  "html",
  "body",
  "payload",
];

/**
 * Recursively masks sensitive fields in an object or array.
 */
function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
          sanitized[key] = "[MASKED]";
        } else {
          sanitized[key] = sanitize(obj[key]);
        }
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Formats error objects for safe logging.
 */
function formatError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      // Une stack trace ne contient pas de donnée personnelle : utile en prod.
      stack: error.stack,
      ...(error as unknown as Record<string, unknown>),
    };
  }
  return error;
}

/**
 * Envoie l'erreur à Sentry. Les données passent par `sanitize` ici, puis par
 * `scrubEvent` (beforeSend) avant de quitter l'application.
 */
function reportError(message: unknown, error?: unknown) {
  if (message instanceof Error) {
    Sentry.captureException(message);
    return;
  }
  const context = typeof message === "string" ? message : undefined;
  if (error instanceof Error) {
    Sentry.captureException(error, { extra: { context } });
    return;
  }
  Sentry.captureMessage(context ?? "logger.error", {
    level: "error",
    extra: {
      details: sanitize(error ?? (context ? undefined : message)),
    },
  });
}

function addBreadcrumb(
  level: "info" | "warning",
  message: unknown,
  data?: unknown
) {
  Sentry.addBreadcrumb({
    category: "logger",
    level,
    message: typeof message === "string" ? message : undefined,
    data: data
      ? { details: sanitize(data) }
      : typeof message === "string"
        ? undefined
        : { details: sanitize(message) },
  });
}

/**
 * Centralized logger that prevents sensitive data leakage (CWE-532).
 * `error` remonte dans Sentry ; `info`/`warn` deviennent des breadcrumbs
 * attachés à la prochaine erreur de la même requête.
 */
export const logger = {
  info: (message: unknown, data?: unknown) => {
    if (typeof message === "string") {
      console.log(`[INFO] ${message}`, data ? sanitize(data) : "");
    } else {
      console.log(`[INFO]`, sanitize(message));
    }
    addBreadcrumb("info", message, data);
  },

  warn: (message: unknown, data?: unknown) => {
    if (typeof message === "string") {
      console.warn(`[WARN] ${message}`, data ? sanitize(data) : "");
    } else {
      console.warn(`[WARN]`, sanitize(message));
    }
    addBreadcrumb("warning", message, data);
  },

  error: (message: unknown, error?: unknown) => {
    if (typeof message === "string") {
      const formattedError = error ? formatError(error) : "";
      console.error(`[ERROR] ${message}`, sanitize(formattedError));
    } else {
      console.error(`[ERROR]`, sanitize(formatError(message)));
    }
    reportError(message, error);
  },
};
