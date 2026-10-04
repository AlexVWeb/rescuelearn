"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateReferencielTopicAction,
  type ReferencielTopicWithCoverage,
} from "@/app/actions/referenciel-topic-actions";

interface TopicEditDialogProps {
  topic: ReferencielTopicWithCoverage | null;
  availableLevels: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TopicEditDialog({ topic, ...props }: TopicEditDialogProps) {
  return (
    <Dialog open={!!topic} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        {/* key : état du formulaire réinitialisé à chaque sujet ouvert */}
        {topic && <TopicEditForm key={topic.id} topic={topic} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function TopicEditForm({
  topic,
  availableLevels,
  onOpenChange,
  onSaved,
}: Omit<TopicEditDialogProps, "topic"> & {
  topic: ReferencielTopicWithCoverage;
}) {
  const [title, setTitle] = useState(topic.title);
  const [summary, setSummary] = useState(topic.summary);
  const [keyPoints, setKeyPoints] = useState(topic.keyPoints.join("\n"));
  const [levels, setLevels] = useState<string[]>(topic.levels);
  const [questionCapacity, setQuestionCapacity] = useState(
    topic.questionCapacity
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateReferencielTopicAction(topic.id, {
      title,
      summary,
      keyPoints: keyPoints
        .split("\n")
        .map((k) => k.trim())
        .filter(Boolean),
      levels,
      questionCapacity,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Impossible d'enregistrer le sujet");
      return;
    }
    toast.success("Sujet enregistré et validé");
    onSaved();
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Modifier le sujet</DialogTitle>
        <DialogDescription>
          Un sujet modifié est marqué comme validé : une ré-analyse ne mettra
          plus à jour que ses pages.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic-title">Titre</Label>
          <Input
            id="topic-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic-summary">Résumé</Label>
          <Textarea
            id="topic-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic-keypoints">Points clés (un par ligne)</Label>
          <Textarea
            id="topic-keypoints"
            rows={6}
            value={keyPoints}
            onChange={(e) => setKeyPoints(e.target.value)}
          />
        </div>
        {availableLevels.length > 1 && (
          <div className="space-y-2">
            <Label>Niveaux</Label>
            <div className="flex flex-wrap gap-4">
              {availableLevels.map((level) => (
                <Label
                  key={level}
                  className="flex items-center gap-2 font-normal"
                >
                  <Checkbox
                    checked={levels.includes(level)}
                    onCheckedChange={(checked) =>
                      setLevels((prev) =>
                        checked
                          ? [...prev, level]
                          : prev.filter((l) => l !== level)
                      )
                    }
                  />
                  {level}
                </Label>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="topic-capacity">Capacité (questions)</Label>
          <Input
            id="topic-capacity"
            type="number"
            min={1}
            max={30}
            className="w-24"
            value={questionCapacity}
            onChange={(e) => setQuestionCapacity(Number(e.target.value))}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || questionCapacity < 1}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </>
  );
}
