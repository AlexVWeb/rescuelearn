"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TreeGenerationState {
  generationStatus: "NONE" | "PROCESSING" | "DONE" | "FAILED";
  generationDone: number;
  generationTotal: number;
  generationError: string | null;
  referencielId: number | null;
}

interface TreeGenerationStatusProps {
  tree: TreeGenerationState;
  isRunning: boolean;
  isStopping: boolean;
  lastNodeTitle: string | null;
  onResume: () => void;
  onRestart: () => void;
  onStop: () => void;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
      <div
        className="h-full rounded-full bg-indigo-600 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// Progression, reprise et erreurs de la génération d'un parcours depuis les sujets
export function TreeGenerationStatus({
  tree,
  isRunning,
  isStopping,
  lastNodeTitle,
  onResume,
  onRestart,
  onStop,
}: TreeGenerationStatusProps) {
  const { generationStatus, generationDone, generationTotal, generationError } =
    tree;
  const errors = generationError?.split("\n").filter(Boolean) ?? [];

  if (isRunning) {
    return (
      <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 font-semibold text-indigo-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération du parcours : leçon{" "}
            {Math.min(generationDone + 1, generationTotal)} / {generationTotal}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onStop}
            disabled={isStopping}
          >
            {isStopping ? "Arrêt après cette leçon..." : "Arrêter"}
          </Button>
        </div>
        <ProgressBar done={generationDone} total={generationTotal} />
        <p className="text-muted-foreground text-xs">
          {lastNodeTitle ? `Dernière leçon : ${lastNodeTitle}. ` : ""}
          Gardez cet onglet ouvert pendant la génération.
          {errors.length > 0 && ` ${errors.length} leçon(s) en échec.`}
        </p>
      </div>
    );
  }

  if (generationStatus === "PROCESSING") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2 text-sm text-amber-900">
          <p className="font-semibold">
            Génération interrompue : {generationDone} / {generationTotal} leçons
            traitées.
          </p>
          <ProgressBar done={generationDone} total={generationTotal} />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={onResume}>
            Reprendre
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRestart}
            disabled={!tree.referencielId}
          >
            Recommencer
          </Button>
        </div>
      </div>
    );
  }

  if (generationStatus === "FAILED" && errors.length > 0) {
    return (
      <details className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          Parcours généré avec {errors.length} leçon(s) en échec sur{" "}
          {generationTotal}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-xs">
          {errors.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      </details>
    );
  }

  if (generationStatus === "DONE") {
    return (
      <p className="flex items-center gap-2 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4" /> Parcours généré depuis les sujets :{" "}
        {generationTotal} leçons.
      </p>
    );
  }

  return null;
}
