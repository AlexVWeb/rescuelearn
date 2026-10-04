"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  deleteReferencielTopicAction,
  setTopicValidatedAction,
  startReferencielAnalysisAction,
  type ReferencielAnalysis,
  type ReferencielTopicWithCoverage,
} from "@/app/actions/referenciel-topic-actions";
import { ReferencielAnalysisBadge } from "@/components/admin/referenciel-analysis-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  COVERAGE_GAP_THRESHOLD,
  MAX_TOPICS_PER_GENERATION,
  topicCoverage,
} from "@/lib/topic-coverage";
import { AiGenerateDialog } from "@/components/admin/quiz/ai-generate-dialog";
import { ImportDialog } from "@/components/admin/quiz/import-dialog";
import { AiGenerateCardDialog } from "@/components/admin/cards/ai-generate-card-dialog";
import { cn } from "@/lib/utils";
import { TopicEditDialog } from "./topic-edit-dialog";

const REFRESH_INTERVAL_MS = 5000;
const ALL_LEVELS = "ALL";

type Topic = ReferencielTopicWithCoverage;

function groupByChapter(topics: Topic[]) {
  const groups = new Map<string, Topic[]>();
  for (const topic of topics) {
    groups.set(topic.chapter, [...(groups.get(topic.chapter) ?? []), topic]);
  }
  return Array.from(groups, ([chapter, items]) => ({ chapter, items }));
}

function CoverageBar({ topic }: { topic: Topic }) {
  const ratio = topicCoverage(topic._count.questions, topic.questionCapacity);
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            ratio >= 1
              ? "bg-green-600"
              : ratio >= COVERAGE_GAP_THRESHOLD
                ? "bg-amber-500"
                : "bg-red-500"
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className="text-muted-foreground w-12 text-xs tabular-nums">
        {topic._count.questions}/{topic.questionCapacity}
      </span>
    </div>
  );
}

export default function ClientPage({
  analysis,
}: {
  analysis: ReferencielAnalysis;
}) {
  const router = useRouter();
  const { referenciel, topics } = analysis;
  const isMultiLevel = referenciel.levels.length > 1;
  const isProcessing = referenciel.analysisStatus === "PROCESSING";

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState(ALL_LEVELS);
  const [onlyUncovered, setOnlyUncovered] = useState(false);
  const [onlyUnvalidated, setOnlyUnvalidated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Topic | null>(null);
  const [toDelete, setToDelete] = useState<Topic | null>(null);
  // Sujets figés à l'ouverture du dialog de génération (prop stable)
  const [quizTopicIds, setQuizTopicIds] = useState<string[] | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<unknown>(null);
  const [cardTopicIds, setCardTopicIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isProcessing, router]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return topics.filter(
      (t) =>
        (!query ||
          t.title.toLowerCase().includes(query) ||
          t.chapter.toLowerCase().includes(query)) &&
        (level === ALL_LEVELS || t.levels.includes(level)) &&
        (!onlyUncovered || t._count.questions === 0) &&
        (!onlyUnvalidated || !t.validated)
    );
  }, [topics, search, level, onlyUncovered, onlyUnvalidated]);

  const groups = useMemo(() => groupByChapter(filtered), [filtered]);

  const cardDialogReferenciels = useMemo(
    () => [
      {
        id: referenciel.id,
        title: referenciel.title,
        analysisStatus: referenciel.analysisStatus,
      },
    ],
    [referenciel.id, referenciel.title, referenciel.analysisStatus]
  );

  const stats = useMemo(() => {
    const covered = topics.filter((t) => t._count.questions > 0).length;
    const validated = topics.filter((t) => t.validated).length;
    return { covered, validated };
  }, [topics]);

  const toggle = (ids: string[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const selectGaps = () =>
    setSelected(
      new Set(
        filtered
          .filter(
            (t) =>
              topicCoverage(t._count.questions, t.questionCapacity) <
              COVERAGE_GAP_THRESHOLD
          )
          .map((t) => t.id)
      )
    );

  async function handleReanalyze() {
    const result = await startReferencielAnalysisAction(referenciel.id);
    if (result.success) toast.success("Analyse lancée");
    else toast.error(result.error ?? "Impossible de lancer l'analyse");
    router.refresh();
  }

  async function handleValidate(topic: Topic) {
    const result = await setTopicValidatedAction(topic.id, !topic.validated);
    if (!result.success) toast.error(result.error ?? "Erreur");
    router.refresh();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await deleteReferencielTopicAction(toDelete.id);
    if (!result.success) toast.error(result.error ?? "Erreur");
    toggle([toDelete.id], false);
    setToDelete(null);
    router.refresh();
  }

  return (
    <div className="w-full space-y-6 p-8">
      <div>
        <Link
          href="/admin/referenciels"
          className="text-muted-foreground mb-2 inline-flex items-center text-sm hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Référentiels
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {referenciel.title}{" "}
              <span className="text-muted-foreground font-normal">
                ({referenciel.yearEdition})
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <ReferencielAnalysisBadge
                status={referenciel.analysisStatus}
                done={referenciel.analysisDoneChapters}
                total={referenciel.analysisTotalChapters}
                topicCount={topics.length}
                error={referenciel.analysisError}
              />
              {referenciel.levels.map((l) => (
                <Badge key={l} variant="outline">
                  {l}
                </Badge>
              ))}
              {topics.length > 0 && (
                <span className="text-muted-foreground">
                  {stats.covered}/{topics.length} sujets couverts ·{" "}
                  {stats.validated} validés
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleReanalyze}
            disabled={isProcessing}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isProcessing && "animate-spin")}
            />
            {referenciel.analysisStatus === "NONE" ? "Analyser" : "Ré-analyser"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Rechercher un sujet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {isMultiLevel && (
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_LEVELS}>Tous les niveaux</SelectItem>
              {referenciel.levels.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={onlyUncovered}
            onCheckedChange={(c) => setOnlyUncovered(c === true)}
          />
          Non couverts uniquement
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={onlyUnvalidated}
            onCheckedChange={(c) => setOnlyUnvalidated(c === true)}
          />
          Non validés
        </Label>
      </div>

      <div className="bg-muted/50 flex flex-wrap items-center gap-3 rounded-md border px-4 py-2 text-sm">
        <span>
          {selected.size} sujet{selected.size > 1 ? "s" : ""} sélectionné
          {selected.size > 1 ? "s" : ""}
        </span>
        <Button size="sm" variant="outline" onClick={selectGaps}>
          Combler les trous
        </Button>
        <Button
          size="sm"
          disabled={
            selected.size === 0 || selected.size > MAX_TOPICS_PER_GENERATION
          }
          onClick={() => setQuizTopicIds(Array.from(selected))}
        >
          Générer un quiz
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={
            selected.size === 0 || selected.size > MAX_TOPICS_PER_GENERATION
          }
          onClick={() => setCardTopicIds(Array.from(selected))}
        >
          Générer des cartes
        </Button>
        {selected.size > MAX_TOPICS_PER_GENERATION && (
          <span className="text-xs text-amber-600">
            {MAX_TOPICS_PER_GENERATION} sujets maximum par quiz
          </span>
        )}
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            Désélectionner
          </Button>
        )}
      </div>

      {topics.length === 0 ? (
        <div className="text-muted-foreground rounded-md border p-12 text-center">
          {isProcessing
            ? "Analyse en cours, les sujets apparaîtront à la fin."
            : "Aucun sujet. Lancez l'analyse du référentiel."}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ chapter, items }) => {
            const ids = items.map((t) => t.id);
            const allSelected = ids.every((id) => selected.has(id));
            const someSelected = ids.some((id) => selected.has(id));
            return (
              <Collapsible
                key={chapter}
                defaultOpen
                className="rounded-md border"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(c) => toggle(ids, c === true)}
                    aria-label={`Sélectionner ${chapter}`}
                  />
                  <CollapsibleTrigger className="group flex flex-1 items-center justify-between text-left font-medium">
                    <span>
                      {chapter}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({items.length})
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <ul className="divide-y border-t">
                    {items.map((topic) => (
                      <li
                        key={topic.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-2"
                      >
                        <Checkbox
                          checked={selected.has(topic.id)}
                          onCheckedChange={(c) =>
                            toggle([topic.id], c === true)
                          }
                          aria-label={`Sélectionner ${topic.title}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="truncate font-medium"
                              title={topic.summary}
                            >
                              {topic.title}
                            </span>
                            {topic.validated && (
                              <CheckCircle2
                                className="h-4 w-4 shrink-0 text-green-600"
                                aria-label="Validé"
                              />
                            )}
                          </div>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                            <span>
                              p.{topic.pageStart}
                              {topic.pageEnd !== topic.pageStart &&
                                `-${topic.pageEnd}`}
                            </span>
                            {isMultiLevel &&
                              topic.levels.map((l) => (
                                <Badge
                                  key={l}
                                  variant="outline"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  {l}
                                </Badge>
                              ))}
                            {topic.suggestedFormats.map((f) => (
                              <Badge
                                key={f}
                                variant="secondary"
                                className="px-1 py-0 text-[10px]"
                              >
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <CoverageBar topic={topic} />
                        <span className="text-muted-foreground w-20 text-xs">
                          {topic._count.progressionNodes} leçon
                          {topic._count.progressionNodes > 1 ? "s" : ""}
                          <br />
                          {topic._count.learningCards} carte
                          {topic._count.learningCards > 1 ? "s" : ""}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Actions</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(topic)}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleValidate(topic)}
                            >
                              {topic.validated ? "Dévalider" : "Valider"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setToDelete(topic)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {groups.length === 0 && (
            <div className="text-muted-foreground rounded-md border p-8 text-center">
              Aucun sujet ne correspond aux filtres.
            </div>
          )}
        </div>
      )}

      <AiGenerateDialog
        open={quizTopicIds !== null}
        onOpenChange={(open) => !open && setQuizTopicIds(null)}
        initialReferencielId={referenciel.id}
        initialTopicIds={quizTopicIds ?? undefined}
        onGenerationSuccess={setGeneratedQuiz}
      />

      <AiGenerateCardDialog
        open={cardTopicIds !== null}
        onOpenChange={(open) => !open && setCardTopicIds(null)}
        referenciels={cardDialogReferenciels}
        initialReferencielId={referenciel.id}
        initialTopicIds={cardTopicIds ?? undefined}
      />

      <ImportDialog
        open={generatedQuiz !== null}
        onOpenChange={(open) => !open && setGeneratedQuiz(null)}
        initialData={generatedQuiz}
      />

      <TopicEditDialog
        topic={editing}
        availableLevels={referenciel.levels}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => router.refresh()}
      />

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce sujet ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.title} » sera supprimé. Les questions, cartes et
              leçons liées sont conservées mais perdent leur rattachement. Une
              ré-analyse pourra le recréer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
