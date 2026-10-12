"use client";

import React, { useEffect, useRef } from "react";
import type Plyr from "plyr";
import "plyr/dist/plyr.css";
import { cn } from "@/lib/utils";

interface YoutubePlyrProps {
  youtubeId: string;
  // Lecture imposée : ni barre de progression, ni vitesse, ni raccourcis
  locked?: boolean;
  onReady?: (player: Plyr) => void;
  className?: string;
}

const LOCKED_OPTIONS: Plyr.Options = {
  controls: ["play-large", "play", "mute", "volume", "fullscreen"],
  settings: [],
  keyboard: { focused: false, global: false },
  speed: { selected: 1, options: [1] },
  seekTime: 0,
  displayDuration: false,
};

/**
 * Lecteur YouTube basé sur Plyr. Plyr modifie le DOM lui-même : la cible est
 * créée à la main dans un conteneur que React ne touche pas.
 */
export function YoutubePlyr({
  youtubeId,
  locked = false,
  onReady,
  className,
}: YoutubePlyrProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let player: Plyr | null = null;
    let cancelled = false;

    const target = document.createElement("div");
    target.dataset.plyrProvider = "youtube";
    target.dataset.plyrEmbedId = youtubeId;
    container.appendChild(target);

    import("plyr").then(({ default: PlyrClass }) => {
      if (cancelled) return;
      player = new PlyrClass(target, {
        ...(locked ? LOCKED_OPTIONS : {}),
        youtube: { noCookie: true, rel: 0, modestbranding: 1 },
      });
      const instance = player;
      instance.on("ready", () => onReadyRef.current?.(instance));
    });

    return () => {
      cancelled = true;
      player?.destroy();
      container.replaceChildren();
    };
  }, [youtubeId, locked]);

  return (
    <div
      ref={containerRef}
      // L'iframe ne reçoit aucun clic : pas de lien « Regarder sur YouTube »
      // ni de contrôles YouTube natifs, Plyr gère la lecture.
      className={cn(
        "overflow-hidden rounded-2xl bg-black [&_iframe]:pointer-events-none",
        className
      )}
    />
  );
}
