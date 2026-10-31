import * as Sentry from "@sentry/nextjs";
import { enrichServerEvent } from "@/lib/sentry/enrich";
import { sharedOptions } from "@/lib/sentry/options";
import { scrubEvent } from "@/lib/sentry/scrub";

Sentry.init({
  ...sharedOptions,
  includeLocalVariables: false,
  beforeSend: (event, hint) =>
    scrubEvent(enrichServerEvent(event, hint.originalException)),
});
