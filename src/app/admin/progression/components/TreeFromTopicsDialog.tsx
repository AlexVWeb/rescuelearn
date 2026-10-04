"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getReferencielAnalysisAction,
  type ReferencielTopicWithCoverage,
} from "@/app/actions/referenciel-topic-actions";
import { planNodesFromTopics } from "@/lib/progression/plan-from-topics";

export interface AnalysedReferenciel {
  id: number;
  title: string;
  levels: string[];
}

interface TreeFromTopicsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: string;
  referenciels: AnalysedReferenciel[];
  existingNodeCount: number;
  isStarting: boolean;
  onStart: (referencielId: number) => void;
  onSwitchToFreeMode: () => void;
}

export function TreeFromTopicsDialog({
  open,
  onOpenChange,
  level,
  referenciels,
  existingNodeCount,
  isStarting,
  onStart,
  onSwitchToFreeMode,
}: TreeFromTopicsDialogProps) {
  const [referencielId, setReferencielId] = useState("");
  const [topics, setTopics] = useState<ReferencielTopicWithCoverage[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Référentiel couvrant ce niveau proposé par défaut
  const selectedId =
    referencielId ||
    String(
      (referenciels.find((r) => r.levels.includes(level)) ?? referenciels[0])
        ?.id ?? ""
    );

  useEffect(() => {
    if (!open || !selectedId) return;
    let cancelled = false;
    const loadTopics = async () => {
      setIsLoadingTopics(true);
      const res = await getReferencielAnalysisAction(parseInt(selectedId, 10));
      if (cancelled) return;
      setTopics(res.success ? res.data.topics : []);
      setIsLoadingTopics(false);
    };
    loadTopics();
    return () => {
      cancelled = true;
    };
  }, [open, selectedId]);

  const plan = useMemo(
    () => planNodesFromTopics(topics, level),
    [topics, level]
  );
  const topicTitles = useMemo(
    () => new Map(topics.map((t) => [t.id, t.title])),
    [topics]
  );
  const topicCount = plan.reduce((sum, n) => sum + n.topicIds.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Sparkles className="h-5 w-5 fill-current text-indigo-600" />
            Parcours {level} depuis les sujets
          </DialogTitle>
          <DialogDescription>
            Les sujets du référentiel sont regroupés en leçons de 1 à 3 sujets,
            dans l&apos;ordre du référentiel. Chaque leçon est générée à partir
            des seules pages de ses sujets.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tree-topics-ref">Référentiel analysé</Label>
            <Select
              value={selectedId}
              onValueChange={(value) => {
                setReferencielId(value);
                setTopics([]);
              }}
            >
              <SelectTrigger id="tree-topics-ref">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {referenciels.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.title}
                    {r.levels.length > 0 && ` (${r.levels.join(", ")})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Aperçu du plan</Label>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {isLoadingTopics ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 p-6 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement des
                  sujets...
                </div>
              ) : plan.length === 0 ? (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Aucun sujet de niveau {level} dans ce référentiel.
                </p>
              ) : (
                <ol className="divide-y text-sm">
                  {plan.map((node, index) => (
                    <li key={index} className="flex gap-3 px-3 py-2">
                      <span className="text-muted-foreground w-6 shrink-0 text-right tabular-nums">
                        {index + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{node.title}</p>
                        {node.topicIds.length > 1 && (
                          <p className="text-muted-foreground truncate text-xs">
                            {node.topicIds
                              .map((id) => topicTitles.get(id))
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            {plan.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {plan.length} leçons · {topicCount} sujets · environ{" "}
                {Math.ceil((plan.length * 40) / 60)} min de génération.
                L&apos;onglet doit rester ouvert ; la génération peut être
                reprise si elle est interrompue.
              </p>
            )}
          </div>

          {existingNodeCount > 0 && (
            <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>
                <strong>Attention :</strong> les {existingNodeCount} étapes
                existantes du niveau {level} et la progression des joueurs sur
                ces étapes seront supprimées.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={onSwitchToFreeMode}
          >
            Générer depuis un sujet libre
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={isStarting || isLoadingTopics || plan.length === 0}
              onClick={() => onStart(parseInt(selectedId, 10))}
            >
              {isStarting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Générer {plan.length} leçons
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
