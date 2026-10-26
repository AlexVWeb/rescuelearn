"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmKitDocumentUpload,
  createKitDocumentUpload,
  saveWelcomeKit,
} from "@/app/admin/training/actions";
import { directUpload } from "@/app/admin/training/lib/direct-upload";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
} from "@/app/admin/training/lib/session-documents";
import {
  VALID_SESSION_TYPES,
  type SessionType,
} from "@/app/admin/training/types";
import { formatFileSize } from "@/app/espace/lib/format";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_CHECKLIST_LABEL,
  type ChecklistItem,
} from "@/lib/welcome-kit";
import { KitDocumentRow } from "./kit-document-row";

export interface KitDocumentView {
  id: string;
  title: string;
  mimeType: string;
  size: number;
  visibleDaysBefore: number | null;
}

export interface KitView {
  type: string;
  toBring: string | null;
  checklist: ChecklistItem[];
  documents: KitDocumentView[];
}

const ACCEPT = Object.fromEntries(
  Object.entries(DOCUMENT_TYPES).map(([mime, { extension }]) => [
    mime,
    [`.${extension}`],
  ])
);

function isConfigured(kit: KitView | undefined) {
  return Boolean(
    kit && (kit.toBring?.trim() || kit.checklist.length || kit.documents.length)
  );
}

function asType(value: string | null): SessionType {
  return VALID_SESSION_TYPES.includes(value as SessionType)
    ? (value as SessionType)
    : VALID_SESSION_TYPES[0];
}

export function WelcomeKitEditor({
  kits,
  initialType,
}: {
  kits: KitView[];
  initialType: string | null;
}) {
  const [type, setType] = useState<SessionType>(asType(initialType));
  const byType = new Map(kits.map((kit) => [kit.type, kit]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kits d&apos;accueil par formation</CardTitle>
        <CardDescription>
          Ce qu&apos;il faut apporter, la checklist et les documents à lire
          avant la session. Chaque session du type reprend ce modèle.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[12rem_1fr]">
        <div className="md:hidden">
          <Label htmlFor="kit-type" className="sr-only">
            Type de formation
          </Label>
          <Select
            value={type}
            onValueChange={(value) => setType(asType(value))}
          >
            <SelectTrigger id="kit-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALID_SESSION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t} · {isConfigured(byType.get(t)) ? "configuré" : "vide"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Types de formation" className="hidden md:block">
          <ul className="space-y-1">
            {VALID_SESSION_TYPES.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setType(t)}
                  aria-current={t === type ? "true" : undefined}
                  className={`focus-visible:ring-ring/50 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-[3px] ${
                    t === type ? "bg-muted font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  {t}
                  {isConfigured(byType.get(t)) ? (
                    <Badge variant="success">configuré</Badge>
                  ) : (
                    <Badge variant="outline">vide</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <KitPanel key={type} type={type} kit={byType.get(type)} />
      </CardContent>
    </Card>
  );
}

function KitPanel({ type, kit }: { type: SessionType; kit?: KitView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toBring, setToBring] = useState(kit?.toBring ?? "");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    kit?.checklist ?? []
  );
  const [uploading, setUploading] = useState<string[]>([]);

  function updateLabel(id: string, label: string) {
    setChecklist((items) =>
      items.map((item) => (item.id === id ? { ...item, label } : item))
    );
  }

  function move(index: number, delta: -1 | 1) {
    setChecklist((items) => {
      const next = [...items];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      try {
        await saveWelcomeKit(type, { toBring, checklist });
        toast.success(`Modèle ${type} enregistré`);
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Enregistrement impossible"
        );
      }
    });
  }

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
    for (const file of files) {
      try {
        await directUpload(
          file,
          (meta) => createKitDocumentUpload(type, meta),
          (upload) => confirmKitDocumentUpload(type, upload)
        );
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

  const documents = kit?.documents ?? [];

  return (
    <section aria-labelledby="kit-title" className="min-w-0 space-y-6">
      <h3 id="kit-title" className="text-lg font-semibold">
        Modèle {type}
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="kit-to-bring">À apporter</Label>
        <Textarea
          id="kit-to-bring"
          value={toBring}
          onChange={(e) => setToBring(e.target.value)}
          rows={4}
          maxLength={2000}
          aria-describedby="kit-to-bring-hint"
          placeholder={"Tenue de sport\nPièce d'identité"}
        />
        <p id="kit-to-bring-hint" className="text-muted-foreground text-xs">
          Une ligne par élément.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Checklist avant session</legend>
        <p className="text-muted-foreground text-xs">
          Le stagiaire coche chaque élément depuis son espace ; vous suivez sa
          progression dans la liste des stagiaires.
        </p>
        {checklist.length > 0 && (
          <ol className="space-y-2">
            {checklist.map((item, index) => (
              <li key={item.id} className="flex items-center gap-1">
                <Input
                  value={item.label}
                  onChange={(e) => updateLabel(item.id, e.target.value)}
                  maxLength={MAX_CHECKLIST_LABEL}
                  aria-label={`Élément ${index + 1}`}
                  placeholder="Ex. : Revoir la fiche Bilans"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Monter l'élément ${index + 1}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => move(index, 1)}
                  disabled={index === checklist.length - 1}
                  aria-label={`Descendre l'élément ${index + 1}`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() =>
                    setChecklist((items) =>
                      items.filter((other) => other.id !== item.id)
                    )
                  }
                  aria-label={`Supprimer l'élément ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setChecklist((items) => [
              ...items,
              { id: crypto.randomUUID(), label: "" },
            ])
          }
          disabled={checklist.length >= MAX_CHECKLIST_ITEMS}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Ajouter un élément
        </Button>
      </fieldset>

      <div>
        <Button type="button" onClick={save} disabled={pending}>
          Enregistrer
        </Button>
      </div>

      <div className="space-y-3 border-t pt-6">
        <div>
          <h4 className="text-sm font-medium">
            Documents à lire avant la session
          </h4>
          <p className="text-muted-foreground text-xs">
            Visibles dès l&apos;envoi des accès, ou à partir de J-N avant le
            début de la session. PDF, JPG, PNG, DOCX ou PPTX, 25 Mo maximum.
          </p>
        </div>
        <div
          {...getRootProps({
            role: "button",
            "aria-label":
              "Ajouter des documents à lire : glissez des fichiers ou appuyez sur Entrée pour les choisir",
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
            Aucun document à lire pour {type}.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {documents.map((document) => (
              <KitDocumentRow
                key={document.id}
                document={document}
                sizeLabel={formatFileSize(document.size)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
