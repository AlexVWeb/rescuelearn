import * as Sentry from "@sentry/nextjs";
import { sharedOptions } from "@/lib/sentry/options";
import { scrubEvent } from "@/lib/sentry/scrub";

Sentry.init({
  ...sharedOptions,
  beforeSend: (event) => scrubEvent(event),
});
