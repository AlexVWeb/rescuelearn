"use client";

import React, { useEffect, useRef, useState } from "react";
import type Plyr from "plyr";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YoutubePlyr } from "@/components/video/youtube-plyr";
import { parseYoutubeId } from "@/lib/progression/video";
import type { Exercise } from "@/types/progression";

interface VideoExerciseConfigProps {
  exercise: Exercise;
  onChange: (fields: Partial<Exercise>) => void;
}

/**
 * Lien YouTube + aperçu Plyr : la durée détectée remplit le champ s'il est
 * vide, sinon elle est proposée (l'admin peut l'avoir corrigée à la main).
 */
export function VideoExerciseConfig({
  exercise,
  onChange,
}: VideoExerciseConfigProps) {
  const [detected, setDetected] = useState<{
    youtubeId: string;
    durationSec: number;
  } | null>(null);
  const youtubeId = parseYoutubeId(exercise.videoUrl ?? "");
  // Valeur courante pour les événements Plyr qui arrivent après coup
  const durationRef = useRef(exercise.videoDurationSec);
  useEffect(() => {
    durationRef.current = exercise.videoDurationSec;
  }, [exercise.videoDurationSec]);
  const detectedSec =
    detected && detected.youtubeId === youtubeId ? detected.durationSec : null;

  const handleReady = (player: Plyr) => {
    const readDuration = () => {
      const durationSec = Math.round(player.duration);
      if (!youtubeId || !Number.isFinite(durationSec) || durationSec <= 0) {
        return;
      }
      setDetected({ youtubeId, durationSec });
      if (!durationRef.current) {
        durationRef.current = durationSec;
        onChange({ videoDurationSec: durationSec });
      }
    };
    // YouTube renseigne la durée au ready ; relecture au lancement par sécurité
    readDuration();
    player.on("playing", readDuration);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Lien YouTube</Label>
        <Input
          value={exercise.videoUrl || ""}
          onChange={(e) =>
            onChange({ videoUrl: e.target.value, videoDurationSec: null })
          }
          placeholder="https://www.youtube.com/watch?v=..."
        />
        {exercise.videoUrl && !youtubeId && (
          <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> Lien YouTube invalide.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Titre (optionnel)</Label>
        <Input
          value={exercise.videoTitle || ""}
          onChange={(e) => onChange({ videoTitle: e.target.value })}
          placeholder="Ex: Pose d'un garrot"
        />
      </div>

      {youtubeId && (
        <YoutubePlyr
          key={youtubeId}
          youtubeId={youtubeId}
          onReady={handleReady}
        />
      )}

      <div className="grid gap-2">
        <Label>Durée (secondes)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            className="w-32"
            value={exercise.videoDurationSec ?? ""}
            onChange={(e) =>
              onChange({
                videoDurationSec: e.target.value
                  ? Math.max(0, Math.round(Number(e.target.value)))
                  : null,
              })
            }
            placeholder="Auto"
          />
          {detectedSec !== null &&
            detectedSec !== exercise.videoDurationSec && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange({ videoDurationSec: detectedSec })}
              >
                Utiliser la durée détectée ({detectedSec} s)
              </Button>
            )}
        </div>
        <p className="text-muted-foreground text-xs">
          Le joueur devra regarder la vidéo jusqu&apos;au bout, sans avancer,
          avant de passer à la suite.
        </p>
      </div>
    </div>
  );
}
