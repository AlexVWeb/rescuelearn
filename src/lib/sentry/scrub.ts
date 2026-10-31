import type { Breadcrumb, ErrorEvent, NodeOptions } from "@sentry/nextjs";

/**
 * Filtrage RGPD de tout ce qui part vers Sentry (erreurs, breadcrumbs, spans).
 *
 * Principe : on garde la structure (types, stack traces, routes, ids techniques,
 * codes HTTP/Prisma) et on retire les données personnelles et les secrets.
 * Les règles côté serveur Sentry (Data Scrubbing) restent un second filet.
 */

export type StreamedSpanJSON = Parameters<
  NonNullable<NodeOptions["beforeSendSpan"]>
>[0];

export const FILTERED = "[Filtered]";
const MAX_DEPTH = 10;

/** Noms de champs exacts (comparés en minuscules). Pas de sous-chaîne : `total` ≠ `to`. */
const SENSITIVE_KEYS = new Set([
  "email",
  "emailhash",
  "password",
  "newpassword",
  "currentpassword",
  "token",
  "secret",
  "firstname",
  "lastname",
  "phone",
  "address",
  "birthplace",
  "dateofbirth",
  "civility",
  "ipaddress",
  "ip_address",
  "useragent",
  "termsacceptedip",
  "termsacceptedua",
  "answers",
  "signature",
  "signatureimage",
  "pin",
  "otp",
  "authorization",
  "cookie",
  "cookies",
  "set-cookie",
  "iban",
  "siret",
  "smtpuser",
  "smtppass",
]);

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /(api|access|private)[_-]?key/i,
];

const VALUE_RULES: [RegExp, string][] = [
  // URL absolue dans du texte libre (logs console, messages) : ni query ni fragment
  [/(https?:\/\/[^\s"'?#]+)[?#][^\s"']*/g, "$1"],
  [/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g, "[jwt]"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]"],
  [/(?<![\w+])(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}(?!\d)/g, "[tel]"],
  [
    /([?&]X-Amz-(?:Signature|Credential|Security-Token)=)[^&#\s"']+/gi,
    `$1${FILTERED}`,
  ],
  [
    /([?&#](?:token|t|bypass|code|secret|key|sig|signature|password|q|query|search|email)=)[^&#\s"']+/gi,
    `$1${FILTERED}`,
  ],
  [/(\/invitation\/)[^/?#\s"']+/g, "$1[token]"],
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  const last = lower.split(".").pop() ?? lower;
  return (
    SENSITIVE_KEYS.has(lower) ||
    SENSITIVE_KEYS.has(last) ||
    SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))
  );
}

export function scrubString(value: string): string {
  return VALUE_RULES.reduce((acc, [re, rep]) => acc.replace(re, rep), value);
}

/**
 * Le fragment (`#t=` de l'espace stagiaire) et la query string ne sortent jamais :
 * ils portent des tokens et des recherches (noms de stagiaires).
 */
export function scrubUrl(url: string): string {
  return scrubString(url.split("#")[0].split("?")[0]);
}

export function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[MaxDepth]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? FILTERED : scrubDeep(val, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Les erreurs Prisma de validation recopient la requête et ses valeurs
 * (`where: { lastName: "Dupont" }`). On garde l'appel (1re ligne) et la cause
 * (dernière ligne), qui suffisent au diagnostic.
 */
function scrubPrismaMessage(value: string): string {
  const lines = value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 2) return value;
  return [lines[0], "[requête masquée]", lines[lines.length - 1]].join("\n");
}

const URL_DATA_KEYS = new Set(["url", "from", "to"]);

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Saisies clavier dans les formulaires : jamais.
  if (breadcrumb.category === "ui.input") return null;

  const out: Breadcrumb = { ...breadcrumb };
  if (out.message) out.message = scrubString(out.message);
  if (out.data) {
    const data: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(out.data)) {
      data[key] =
        URL_DATA_KEYS.has(key) && typeof val === "string"
          ? scrubUrl(val)
          : isSensitiveKey(key)
            ? FILTERED
            : scrubDeep(val, 1);
    }
    out.data = data;
  }
  return out;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // Seul l'id technique (cuid) identifie l'utilisateur : ni email, ni IP, ni nom.
  if (event.user) {
    if (event.user.id) event.user = { id: event.user.id };
    else delete event.user;
  }

  if (event.request) {
    const req = event.request;
    if (req.url) req.url = scrubUrl(req.url);
    delete req.query_string;
    delete req.cookies;
    delete req.data;
    delete req.env; // REMOTE_ADDR côté Node
    if (req.headers)
      req.headers = scrubDeep(req.headers) as Record<string, string>;
  }

  for (const ex of event.exception?.values ?? []) {
    if (ex.value) {
      if (ex.type?.startsWith("PrismaClient"))
        ex.value = scrubPrismaMessage(ex.value);
      ex.value = scrubString(ex.value);
    }
    for (const frame of ex.stacktrace?.frames ?? []) {
      delete frame.vars;
      // Lignes de code source autour de l'erreur : une fixture ou un seed peut
      // contenir des données en dur.
      if (frame.context_line)
        frame.context_line = scrubString(frame.context_line);
      frame.pre_context = frame.pre_context?.map(scrubString);
      frame.post_context = frame.post_context?.map(scrubString);
    }
  }

  if (event.message) event.message = scrubString(event.message);
  if (event.logentry)
    event.logentry = scrubDeep(event.logentry) as typeof event.logentry;
  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  if (event.extra) event.extra = scrubDeep(event.extra) as typeof event.extra;
  if (event.contexts)
    event.contexts = scrubDeep(event.contexts) as typeof event.contexts;
  if (event.tags) event.tags = scrubDeep(event.tags) as typeof event.tags;
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is Breadcrumb => b !== null);
  }

  return event;
}

const QUERY_ATTRIBUTE = /(^|\.)query(_string)?$/;
const URL_ATTRIBUTE = /url|target/i;

export function scrubSpan(span: StreamedSpanJSON): StreamedSpanJSON {
  const attributes: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(span.attributes ?? {})) {
    if (QUERY_ATTRIBUTE.test(key)) continue;
    if (isSensitiveKey(key)) attributes[key] = FILTERED;
    else if (typeof val === "string")
      attributes[key] = URL_ATTRIBUTE.test(key)
        ? scrubUrl(val)
        : scrubString(val);
    else attributes[key] = val;
  }
  return {
    ...span,
    name: scrubString(span.name),
    attributes: attributes as StreamedSpanJSON["attributes"],
  };
}
