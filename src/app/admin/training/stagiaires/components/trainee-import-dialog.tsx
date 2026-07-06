"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileUp, AlertCircle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTraineeImport } from "../lib/use-trainee-import";

interface TraineeImportDialogProps {
  sessionId?: string;
  children?: React.ReactNode;
}

export function TraineeImportDialog({
  sessionId,
  children,
}: TraineeImportDialogProps) {
  const [open, setOpen] = useState(false);
  const { preview, fileName, loading, handleFileDrop, executeImport, reset } =
    useTraineeImport(sessionId);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".csv"],
      "application/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  async function handleImport() {
    const success = await executeImport();
    if (success) {
      setOpen(false);
    }
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importer des stagiaires</DialogTitle>
          <DialogDescription>
            Importez un fichier CSV ou Excel. Les colonnes attendues :{" "}
            <span className="font-medium">
              Prénom, Nom, Email, Téléphone, Date de naissance, Adresse, Code
              postal, Ville
            </span>
            . Les stagiaires seront créés s&apos;ils n&apos;existent pas
            {sessionId ? ", puis inscrits à la session" : ""}.
          </DialogDescription>
        </DialogHeader>

        {preview.length === 0 ? (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="text-muted-foreground mb-3 h-10 w-10" />
            <p className="text-sm font-medium">
              {isDragActive
                ? "Déposez le fichier ici..."
                : "Glissez-déposez un fichier, ou cliquez pour sélectionner"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              CSV, XLS, XLSX acceptés
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileUp className="text-primary h-4 w-4" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">
                  — {preview.length} stagiaire(s) détecté(s)
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Prénom</th>
                    <th className="px-3 py-2 text-left font-medium">Nom</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Téléphone
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Naissance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((t, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5">{t.firstName}</td>
                      <td className="px-3 py-1.5">{t.lastName}</td>
                      <td className="text-muted-foreground px-3 py-1.5">
                        {t.email || "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-1.5">
                        {t.phone || "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-1.5">
                        {t.dateOfBirth
                          ? new Date(t.dateOfBirth).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {preview.length > 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">
                    Prêt à importer {sessionId ? "et inscrire " : ""}
                    {preview.length} stagiaire(s)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600">
                    Aucun stagiaire valide détecté
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={preview.length === 0 || loading}
          >
            {loading
              ? "Import en cours..."
              : `Importer${preview.length > 0 ? ` (${preview.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
