"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <TriangleAlert className="text-destructive h-8 w-8" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">
          Impossible d&apos;afficher la session
        </h1>
        <p className="text-muted-foreground text-sm">
          Une erreur est survenue lors du chargement. Vos données ne sont pas
          perdues.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <Button variant="outline" asChild>
          <Link href="/admin/training/sessions">Retour aux sessions</Link>
        </Button>
      </div>
    </div>
  );
}
