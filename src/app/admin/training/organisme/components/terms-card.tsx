"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { Eye, FileText, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  confirmTermsUpload,
  createTermsUpload,
  getTermsPreviewUrl,
} from "@/app/admin/training/actions";
import { directUpload } from "@/app/admin/training/lib/direct-upload";

const MAX_TERMS_BYTES = 10 * 1024 * 1024;

function validateTerms(file: { mimeType: string; size: number }) {
  if (file.mimeType !== "application/pdf") {
    return "Les conditions générales doivent être un PDF.";
  }
  if (file.size <= 0) return "Le fichier est vide.";
  if (file.size > MAX_TERMS_BYTES)
    return "Fichier trop volumineux (10 Mo maximum).";
  return null;
}

export function TermsCard({
  terms,
  canEditTerms,
}: {
  terms: { version: string | null; updatedAt: Date } | null;
  canEditTerms: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [previewing, startPreview] = useTransition();

  async function onDrop(files: File[], rejections: FileRejection[]) {
    if (rejections.length > 0) {
      toast.error(
        rejections[0].errors[0]?.code === "file-too-large"
          ? "Fichier trop volumineux (10 Mo maximum)."
          : "Les conditions générales doivent être un PDF."
      );
    }
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      await directUpload(
        file,
        createTermsUpload,
        confirmTermsUpload,
        validateTerms
      );
      toast.success("Conditions générales enregistrées");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setUploading(false);
    }
  }

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_TERMS_BYTES,
    maxFiles: 1,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: uploading || !canEditTerms,
  });

  function preview() {
    startPreview(async () => {
      try {
        const url = await getTermsPreviewUrl();
        window.open(url, "_blank", "noopener");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Aperçu impossible");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditions générales</CardTitle>
        <CardDescription>
          {terms
            ? "Les stagiaires les acceptent depuis leur espace, avant la session."
            : "Ajoutez vos conditions générales : les stagiaires les accepteront depuis leur espace."}
        </CardDescription>
      </CardHeader>
      <CardContent {...getRootProps()} className="space-y-3">
        <input {...getInputProps()} />
        {terms && (
          <p className="flex items-center gap-2 text-sm">
            <FileText
              className="text-muted-foreground h-4 w-4"
              aria-hidden="true"
            />
            Version du{" "}
            {dayjs(terms.updatedAt).locale("fr").format("D MMM YYYY")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {terms && (
            <Button
              type="button"
              variant="outline"
              onClick={preview}
              disabled={previewing}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Aperçu
            </Button>
          )}
          <Button
            type="button"
            variant={terms ? "outline" : "default"}
            onClick={open}
            disabled={uploading || !canEditTerms}
            aria-describedby="terms-hint"
          >
            {uploading ? (
              <RefreshCw
                className="h-4 w-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {terms ? "Remplacer" : "Déposer le PDF"}
          </Button>
        </div>
        <p id="terms-hint" className="text-muted-foreground text-xs">
          {!canEditTerms
            ? "Seul un administrateur de l'organisme peut déposer les conditions générales."
            : terms
              ? "Les stagiaires ayant accepté une version précédente restent liés à celle-ci."
              : "PDF, 10 Mo maximum."}
        </p>
      </CardContent>
    </Card>
  );
}
