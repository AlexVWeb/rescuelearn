"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type Plyr from "plyr";
import { CheckCircle2, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { YoutubePlyr } from "@/components/video/youtube-plyr";
import { videoCheckpointAction } from "@/app/actions/progression-player-actions";
import { VIDEO_CHECKPOINT_INTERVAL_MS } from "@/lib/progression/video";
import type { PlaySessionVideo } from "@/types/progression";

// Saut toléré côté lecteur avant de revenir en arrière (buffering, arrondis)
const LOCAL_SEEK_TOLERANCE_SEC = 2;

function formatTime(totalSec: number) {
  const sec = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

interface VideoExerciseProps {
  attemptId: string;
  exerciseId: string;
  video: PlaySessionVideo;
  onCompleted: () => void;
}

/**
 * Vidéo à regarder en entier : pas d'avance ni d'accélération, pause quand
 * l'onglet ou la fenêtre perd le focus. Le serveur valide le visionnage à
 * partir des points de contrôle ; le lecteur ne fait que suivre.
 */
export function VideoExercise({
  attemptId,
  exerciseId,
  video,
  onCompleted,
}: VideoExerciseProps) {
  // Déjà validée à l'ouverture : lecture libre (révision)
  const [locked] = useState(!video.completed);
  const [completed, setCompleted] = useState(video.completed);
  const [watchedSec, setWatchedSec] = useState(video.watchedSec);
  const [pausedByFocus, setPausedByFocus] = useState(false);

  const playerRef = useRef<Plyr | null>(null);
  const completedRef = useRef(video.completed);
  // Position la plus avancée atteinte en lecture normale
  const maxReachedRef = useRef(video.watchedSec);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  // Les points de contrôle partent un par un, dans l'ordre
  const sendCheckpoint = useCallback(
    (position: number) => {
      if (completedRef.current) return;
      queueRef.current = queueRef.current.then(async () => {
        if (completedRef.current) return;
        try {
          const res = await videoCheckpointAction({
            attemptId,
            exerciseId,
            position,
          });
          if (!res.success || !res.data) {
            toast.error(res.error || "Visionnage non enregistré.");
            return;
          }
          const { watchedSec: validated, completed: done, rejected } = res.data;
          setWatchedSec(validated);
          if (rejected && playerRef.current) {
            maxReachedRef.current = validated;
            playerRef.current.currentTime = validated;
          }
          if (done) {
            completedRef.current = true;
            setCompleted(true);
            onCompletedRef.current();
          }
        } catch {
          toast.error("Visionnage non enregistré.");
        }
      });
    },
    [attemptId, exerciseId]
  );

  const handleReady = useCallback(
    (player: Plyr) => {
      playerRef.current = player;
      if (!locked) return;

      if (maxReachedRef.current > 0) {
        player.currentTime = maxReachedRef.current;
      }

      const guardPosition = () => {
        if (completedRef.current) return;
        if (
          player.currentTime >
          maxReachedRef.current + LOCAL_SEEK_TOLERANCE_SEC
        ) {
          player.currentTime = maxReachedRef.current;
        }
      };

      player.on("timeupdate", () => {
        guardPosition();
        maxReachedRef.current = Math.max(
          maxReachedRef.current,
          player.currentTime
        );
      });
      player.on("seeking", guardPosition);
      player.on("ratechange", () => {
        if (player.speed !== 1) player.speed = 1;
      });
      player.on("play", () => {
        setPausedByFocus(false);
        sendCheckpoint(player.currentTime);
      });
      player.on("pause", () => sendCheckpoint(player.currentTime));
      // Le serveur plafonne au temps écoulé : annoncer la fin ne fait pas sauter
      player.on("ended", () =>
        sendCheckpoint(Math.max(player.duration, video.durationSec))
      );
    },
    [locked, sendCheckpoint, video.durationSec]
  );

  // Point de contrôle régulier pendant la lecture
  useEffect(() => {
    if (!locked) return;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (player?.playing) sendCheckpoint(player.currentTime);
    }, VIDEO_CHECKPOINT_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [locked, sendCheckpoint]);

  // Pause dès que l'onglet est masqué ou que la fenêtre perd le focus
  useEffect(() => {
    if (!locked) return;
    const pause = () => {
      const player = playerRef.current;
      if (completedRef.current || !player?.playing) return;
      player.pause();
      setPausedByFocus(true);
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
    };
  }, [locked]);

  const progress = Math.min(100, (watchedSec / video.durationSec) * 100);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-800">
        <PlayCircle className="h-5 w-5 text-rose-600" />
        <span className="text-xs font-black tracking-wider uppercase">
          Vidéo
        </span>
        {completed && (
          <span className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Déjà vue
          </span>
        )}
      </div>

      {video.title && (
        <h2 className="text-2xl font-black text-gray-900">{video.title}</h2>
      )}

      <div className="relative">
        <YoutubePlyr
          youtubeId={video.youtubeId}
          locked={locked}
          onReady={handleReady}
        />
        {pausedByFocus && !completed && (
          <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white">
            <PauseCircle className="h-4 w-4" />
            Vidéo en pause, revenez pour continuer
          </div>
        )}
      </div>

      {!completed && (
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              style={{ width: `${progress}%` }}
              className="h-full rounded-full bg-rose-500 transition-all duration-500"
            />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            {formatTime(watchedSec)} / {formatTime(video.durationSec)} regardées
            · regardez la vidéo jusqu&apos;au bout pour continuer
          </p>
        </div>
      )}
    </div>
  );
}
