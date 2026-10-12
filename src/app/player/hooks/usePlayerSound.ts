"use client";

import { useCallback, useState } from "react";
import { logger } from "@/lib/logger";

export type PlayerSoundType = "click" | "success" | "locked";

export function usePlayerSound() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playSound = useCallback(
    (type: PlayerSoundType) => {
      if (!soundEnabled) return;
      try {
        const ctx = new (
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        )();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
          osc.stop(ctx.currentTime + 0.3);
        } else if (type === "locked") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(120, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } else {
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        }
      } catch (e) {
        logger.warn("Web Audio failed to load:", e);
      }
    },
    [soundEnabled]
  );

  const toggleSound = useCallback(() => setSoundEnabled((prev) => !prev), []);

  return { soundEnabled, toggleSound, playSound };
}
