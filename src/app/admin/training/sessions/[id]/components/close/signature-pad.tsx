"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Zone de tracé. Ne remonte qu'une image PNG (jamais les points ni leurs
 * horodatages) : la signature reste une image statique, non biométrique.
 */
export function SignaturePad({
  onChange,
  disabled = false,
}: {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  // Le parent passe souvent une fonction recréée à chaque rendu
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePadLib(canvas, { penColor: "black" });
    padRef.current = pad;

    // Canvas à la densité de l'écran, sinon tracé flou sur mobile
    function resize() {
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      setEmpty(true);
      onChangeRef.current(null);
    }

    function handleEnd() {
      const isEmpty = pad.isEmpty();
      setEmpty(isEmpty);
      onChangeRef.current(isEmpty ? null : pad.toDataURL("image/png"));
    }

    resize();
    pad.addEventListener("endStroke", handleEnd);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.removeEventListener("endStroke", handleEnd);
      pad.off();
    };
  }, []);

  useEffect(() => {
    if (disabled) padRef.current?.off();
    else padRef.current?.on();
  }, [disabled]);

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      {/* Fond blanc dans les deux thèmes : l'encre noire est celle du PDF */}
      <canvas
        ref={canvasRef}
        aria-label="Zone de signature"
        className="h-40 w-full touch-none rounded-md border bg-white"
      />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Signez avec le doigt, un stylet ou la souris.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled || empty}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
          Effacer
        </Button>
      </div>
    </div>
  );
}
