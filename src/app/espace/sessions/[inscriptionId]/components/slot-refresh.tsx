"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rafraîchit la page à la prochaine ouverture ou fermeture de créneau, et au
 * retour sur l'onglet (téléphone sorti de veille). Pas de polling.
 */
export function SlotRefresh({ at }: { at: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!at) return;
    const delay = new Date(at).getTime() - Date.now() + 1000;
    if (delay > MAX_DELAY_MS) return;
    const timer = setTimeout(() => router.refresh(), Math.max(delay, 0));
    return () => clearTimeout(timer);
  }, [at, router]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return null;
}
