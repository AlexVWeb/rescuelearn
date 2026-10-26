"use client";

import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

/** Dessine une page d'un PDF dans un canvas (pdfjs, chargé à la demande). */
export function PdfThumbnail({
  blob,
  title,
  page: pageNumber = 1,
}: {
  blob: Blob;
  title: string;
  page?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const task = pdfjs.getDocument({ data: await blob.arrayBuffer() });
      destroy = () => task.destroy();
      const doc = await task.promise;
      const page = await doc.getPage(Math.min(pageNumber, doc.numPages));
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;

      // Rendu net sur écran haute densité, largeur fixée par le CSS
      const scale = (2 * 320) / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
    })().catch((e) => {
      if (cancelled) return;
      logger.error(e);
      setFailed(true);
    });

    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [blob, pageNumber]);

  if (failed) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-xs">
        Miniature indisponible
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Aperçu : ${title}`}
      className="h-auto w-full"
    />
  );
}
