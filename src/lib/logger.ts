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
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      ...(error as unknown as Record<string, unknown>),
    };
  }
  return error;
}

/**
 * Centralized logger that prevents sensitive data leakage (CWE-532).
 */
export const logger = {
  info: (message: unknown, data?: unknown) => {
    if (typeof message === "string") {
      console.log(`[INFO] ${message}`, data ? sanitize(data) : "");
    } else {
      console.log(`[INFO]`, sanitize(message));
    }
  },

  warn: (message: unknown, data?: unknown) => {
    if (typeof message === "string") {
      console.warn(`[WARN] ${message}`, data ? sanitize(data) : "");
    } else {
      console.warn(`[WARN]`, sanitize(message));
    }
  },

  error: (message: unknown, error?: unknown) => {
    if (typeof message === "string") {
      const formattedError = error ? formatError(error) : "";
      console.error(`[ERROR] ${message}`, sanitize(formattedError));
    } else {
      console.error(`[ERROR]`, sanitize(formatError(message)));
    }
  },
};
