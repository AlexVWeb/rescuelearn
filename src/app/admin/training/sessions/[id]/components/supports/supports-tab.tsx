"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  confirmDocumentUpload,
  createDocumentUpload,
} from "@/app/admin/training/actions";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  validateDocumentUpload,
} from "@/app/admin/training/lib/session-documents";
import type { SessionDocument } from "@/app/admin/training/types";
import { formatFileSize } from "@/app/espace/lib/format";
import { DocumentRow } from "./document-row";

const ACCEPT = Object.fromEntries(
  Object.entries(DOCUMENT_TYPES).map(([mime, { extension }]) => [
    mime,
    [`.${extension}`],
  ])
);

async function uploadOne(sessionId: string, file: File) {
  const error = validateDocumentUpload({
    mimeType: file.type,
    size: file.size,
  });
  if (error) throw new Error(error);

  const { key, uploadUrl } = await createDocumentUpload(sessionId, {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  });

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    // Échec réseau avant toute réponse : connexion coupée, ou CORS du bucket
    throw new Error(
      "Envoi interrompu. Vérifiez votre connexion ; si le problème persiste, le stockage n'accepte pas encore les envois directs (CORS)."
    );
  }
  if (!response.ok) throw new Error("Le stockage a refusé le fichier");

  await confirmDocumentUpload(sessionId, {
    key,
    fileName: file.name,
    mimeType: file.type,
  });
}

export function SupportsTab({
  sessionId,
  documents,
}: {
  sessionId: string;
  documents: SessionDocument[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string[]>([]);

  async function onDrop(files: File[], rejections: FileRejection[]) {
    for (const { file, errors } of rejections) {
      toast.error(
        `${file.name} : ${
          errors[0]?.code === "file-too-large"
            ? "trop volumineux (25 Mo maximum)"
            : "format non supporté"
        }`
      );
    }
    if (files.length === 0) return;

    setUploading(files.map((file) => file.name));
    let added = 0;
    // Un par un : sur une connexion de salle de formation, mieux vaut ne pas saturer
    for (const file of files) {
      try {
        await uploadOne(sessionId, file);
        added++;
      } catch (e) {
        toast.error(
          `${file.name} : ${e instanceof Error ? e.message : "envoi impossible"}`
        );
      } finally {
        setUploading((current) => current.filter((name) => name !== file.name));
      }
    }
    if (added > 0) {
      toast.success(
        added > 1 ? `${added} documents ajoutés` : "Document ajouté"
      );
      router.refresh();
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_DOCUMENT_BYTES,
    disabled: uploading.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supports de formation</CardTitle>
        <CardDescription>
          Documents téléchargeables par les stagiaires depuis leur espace. PDF,
          JPG, PNG, DOCX ou PPTX, 25 Mo maximum par fichier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps({
            role: "button",
            "aria-label":
              "Ajouter des documents : glissez des fichiers ou appuyez sur Entrée pour les choisir",
          })}
          className={`focus-visible:ring-ring/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-[3px] ${
            isDragActive
              ? "border-primary bg-muted/50"
              : "border-muted-foreground/25 hover:bg-muted/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload
            className="text-muted-foreground h-6 w-6"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">
            {isDragActive
              ? "Déposez les fichiers ici"
              : "Glissez des fichiers ici, ou cliquez pour les choisir"}
          </p>
        </div>

        {uploading.length > 0 && (
          <ul aria-live="polite" className="space-y-1">
            {uploading.map((name) => (
              <li
                key={name}
                className="text-muted-foreground flex items-center gap-2 text-sm"
              >
                <RefreshCw
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Envoi de {name}…
              </li>
            ))}
          </ul>
        )}

        {documents.length === 0 ? (
          <p className="text-muted-foreground bg-muted/20 flex items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-center text-sm">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Aucun support. Les documents déposés ici seront visibles dans
            l&apos;espace des stagiaires.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                sizeLabel={formatFileSize(document.size)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
