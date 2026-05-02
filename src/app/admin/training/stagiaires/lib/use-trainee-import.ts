"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { importAndEnrollTrainees, importTrainees } from "../../actions";
import { logger } from "@/lib/logger";
import { ParsedTrainee, readFileAsTrainees } from "./trainee-import";

export function useTraineeImport(sessionId?: string) {
  const [preview, setPreview] = useState<ParsedTrainee[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const parsed = await readFileAsTrainees(file);
      if (parsed.length === 0) {
        toast.warning("Aucun stagiaire valide trouvé dans le fichier");
      }
      setPreview(parsed);
    } catch (err) {
      logger.error("Erreur lecture fichier:", err);
      toast.error("Impossible de lire le fichier");
    }
  }, []);

  async function executeImport() {
    if (preview.length === 0) return;
    setLoading(true);

    try {
      if (sessionId) {
        const result = await importAndEnrollTrainees(sessionId, preview);
        toast.success(
          `Import terminé : ${result.enrolled} inscrit(s), ${result.created} nouveau(x) stagiaire(s) créé(s)${result.skipped > 0 ? `, ${result.skipped} déjà inscrit(s)` : ""}`
        );
        if (result.errors.length > 0) {
          toast.error(`Erreurs sur : ${result.errors.join(", ")}`);
        }
      } else {
        const result = await importTrainees(preview);
        toast.success(
          `Import terminé : ${result.created} nouveau(x) stagiaire(s) créé(s)${result.skipped > 0 ? `, ${result.skipped} déjà présent(s)` : ""}`
        );
        if (result.errors.length > 0) {
          toast.error(`Erreurs sur : ${result.errors.join(", ")}`);
        }
      }

      setPreview([]);
      setFileName("");
      router.refresh();
      return true;
    } catch (err) {
      logger.error("Import error:", err);
      toast.error("Une erreur est survenue lors de l'import");
      return false;
    } finally {
      setLoading(false);
    }
  }

  const reset = useCallback(() => {
    setPreview([]);
    setFileName("");
  }, []);

  return {
    preview,
    fileName,
    loading,
    handleFileDrop,
    executeImport,
    reset,
  };
}
