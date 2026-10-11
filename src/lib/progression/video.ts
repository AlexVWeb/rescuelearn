// Règles des exercices vidéo : identifiant YouTube et validation du visionnage
// par points de contrôle (partagé client admin / serveur).

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

// Une longue pause n'accumule pas de crédit de visionnage
export const MAX_CHECKPOINT_CREDIT_SEC = 30;
// Marge pour la latence réseau entre deux points de contrôle
export const VIDEO_TOLERANCE_SEC = 3;
// Une vidéo est validée à quelques secondes de la fin
export const VIDEO_END_MARGIN_SEC = 2;
// Fréquence d'envoi des points de contrôle par le lecteur
export const VIDEO_CHECKPOINT_INTERVAL_MS = 15_000;

/** Identifiant YouTube (11 caractères) depuis une URL ou un identifiant brut. */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;

  const candidate =
    url.hostname === "youtu.be"
      ? url.pathname.split("/")[1]
      : (url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]);

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

/**
 * Applique un point de contrôle : le visionnage ne peut avancer que du temps
 * réellement écoulé depuis le précédent (plafonné), ce qui bloque l'avance
 * rapide comme la lecture accélérée.
 */
export function nextVideoWatch(
  watch: { watchedSec: number; lastCheckpointAt: Date },
  position: number,
  durationSec: number,
  now: Date
): { watchedSec: number; completed: boolean; rejected: boolean } {
  const elapsedSec = Math.min(
    Math.max((now.getTime() - watch.lastCheckpointAt.getTime()) / 1000, 0),
    MAX_CHECKPOINT_CREDIT_SEC
  );
  const allowed = Math.floor(
    watch.watchedSec + elapsedSec + VIDEO_TOLERANCE_SEC
  );
  const watchedSec = Math.min(
    Math.max(watch.watchedSec, Math.min(Math.floor(position), allowed)),
    durationSec
  );

  return {
    watchedSec,
    completed: watchedSec >= durationSec - VIDEO_END_MARGIN_SEC,
    rejected: position > allowed,
  };
}
