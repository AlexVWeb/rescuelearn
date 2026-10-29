"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSessionWelcome } from "@/app/admin/training/actions";
import { resolveToBring, type ChecklistItem } from "@/lib/welcome-kit";
import { formatFileSize } from "@/app/espace/lib/format";

export interface SessionWelcomeView {
  type: string;
  accessInfo: string | null;
  toBringExtra: string | null;
  kit: {
    toBring: string | null;
    checklist: ChecklistItem[];
    documents: {
      id: string;
      title: string;
      size: number;
      visibleFrom: Date | null;
    }[];
  } | null;
}

export function WelcomeSection({
  sessionId,
  welcome,
}: {
  sessionId: string;
  welcome: SessionWelcomeView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accessInfo, setAccessInfo] = useState(welcome.accessInfo ?? "");
  const [toBringExtra, setToBringExtra] = useState(welcome.toBringExtra ?? "");

  const modelHref = `/admin/training/organisme?tab=accueil&type=${encodeURIComponent(welcome.type)}`;
  const kit = welcome.kit;
  const toBring = resolveToBring(kit?.toBring ?? null, null);
  const isEmpty =
    !kit ||
    (toBring.length === 0 &&
      kit.checklist.length === 0 &&
      kit.documents.length === 0);

  function save() {
    startTransition(async () => {
      try {
        await updateSessionWelcome(sessionId, { accessInfo, toBringExtra });
        toast.success("Infos de la session enregistrées");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Enregistrement impossible"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Infos de la session</CardTitle>
          <CardDescription>
            Affichées aux stagiaires dans « Infos pratiques », avec le lieu et
            les horaires des créneaux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-access-info">Accès, parking, étage</Label>
            <Textarea
              id="session-access-info"
              value={accessInfo}
              onChange={(e) => setAccessInfo(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ex. : entrée côté parking, 2e étage, salle B"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-to-bring-extra">
              À apporter en plus pour cette session
            </Label>
            <Textarea
              id="session-to-bring-extra"
              value={toBringExtra}
              onChange={(e) => setToBringExtra(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-describedby="session-to-bring-extra-hint"
            />
            <p
              id="session-to-bring-extra-hint"
              className="text-muted-foreground text-xs"
            >
              Une ligne par élément, ajoutée à la liste du modèle {welcome.type}
              .
            </p>
          </div>
          <Button type="button" onClick={save} disabled={pending}>
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hérité du modèle {welcome.type}</CardTitle>
          <CardDescription>
            Commun à toutes les sessions {welcome.type} de l&apos;organisme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEmpty ? (
            <div className="text-muted-foreground bg-muted/20 space-y-3 rounded-lg border border-dashed p-6 text-center text-sm">
              <p>Aucun modèle d&apos;accueil pour {welcome.type}.</p>
              <Button asChild variant="outline" size="sm">
                <Link href={modelHref}>
                  Créer le modèle
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {toBring.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">À apporter</h3>
                  <ul className="text-muted-foreground mt-1 list-disc pl-5 text-sm">
                    {toBring.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {kit.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">Checklist</h3>
                  <ul className="text-muted-foreground mt-1 list-disc pl-5 text-sm">
                    {kit.checklist.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {kit.documents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">
                    Documents à lire avant la session
                  </h3>
                  <ul className="mt-1 divide-y rounded-lg border">
                    {kit.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText
                            className="text-muted-foreground h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{doc.title}</span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatFileSize(doc.size)}
                          </span>
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {doc.visibleFrom
                            ? `Visible le ${dayjs(doc.visibleFrom).locale("fr").format("D MMM")}`
                            : "Dès l'envoi des accès"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href={modelHref}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                Modifier le modèle {welcome.type}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
