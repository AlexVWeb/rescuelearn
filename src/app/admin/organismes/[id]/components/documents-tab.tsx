"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  uploadOrganismeLogoAction,
  deleteOrganismeLogoAction,
  getOrganismeLogoUrlAction,
} from "@/app/actions/logo.actions";

interface DocumentsTabProps {
  organismeId: string;
  hasLogo: boolean;
}

export function DocumentsTab({ organismeId, hasLogo }: DocumentsTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(hasLogo);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!hasLogo) return;
    getOrganismeLogoUrlAction(organismeId).then((result) => {
      if (result.success) setLogoUrl(result.url);
      else toast.error("Impossible de charger le logo");
      setLoadingUrl(false);
    });
  }, [organismeId, hasLogo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const result = await uploadOrganismeLogoAction(organismeId, fd);
      if (result.success) {
        toast.success("Logo mis à jour");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Erreur inattendue");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteOrganismeLogoAction(organismeId);
      if (result.success) {
        toast.success("Logo supprimé");
        setLogoUrl(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur lors de la suppression");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo officiel</CardTitle>
          <CardDescription>
            Ce logo sera utilisé dans les documents générés (attestations,
            fiches d'évaluation). Formats acceptés : PNG, JPG, SVG, WebP — max 2
            Mo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingUrl ? (
            <div className="bg-muted h-28 animate-pulse rounded-md" />
          ) : logoUrl ? (
            <div className="flex items-start gap-4">
              <div className="bg-muted/30 rounded-md border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo de l'organisme"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Upload en cours..." : "Remplacer"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={uploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`hover:border-primary/50 flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-8 transition-colors ${uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <ImageIcon className="text-muted-foreground h-10 w-10" />
              <p className="text-muted-foreground text-center text-sm">
                Aucun logo enregistré.
                <br />
                <span className="text-primary font-medium">
                  {uploading
                    ? "Upload en cours..."
                    : "Cliquez pour ajouter un logo"}
                </span>
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le logo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le logo sera supprimé définitivement. Les documents déjà générés
              ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
