import * as Sentry from "@sentry/nextjs";
import { sharedOptions, SENTRY_APPLICATION_KEY } from "@/lib/sentry/options";
import { scrubEvent } from "@/lib/sentry/scrub";

// Pas de Session Replay ni de widget feedback (collecte de saisies et d'emails).
Sentry.init({
  ...sharedOptions,
  integrations: [
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: [SENTRY_APPLICATION_KEY],
      // Garde l'événement mais le tague : filtrable avec `!third_party_code:True`
      behaviour: "apply-tag-if-exclusively-contains-third-party-frames",
    }),
  ],
  beforeSend: (event) => scrubEvent(event),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
