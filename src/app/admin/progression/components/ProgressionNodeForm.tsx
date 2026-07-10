"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProgressionNodeFormProps {
  initialData?: {
    title: string;
    description: string;
    xpReward: number;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    xpReward: number;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProgressionNodeForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProgressionNodeFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [xpReward, setXpReward] = useState(initialData?.xpReward ?? 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({ title, description, xpReward });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="node-title">Titre de l'étape *</Label>
        <Input
          id="node-title"
          placeholder="Ex: Hémorragies Externes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-description">
          Description / Objectif pédagogique
        </Label>
        <Textarea
          id="node-description"
          placeholder="Ex: Apprendre à compresser et alerter face à un saignement important."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-xp">Récompense XP</Label>
        <Input
          id="node-xp"
          type="number"
          min={0}
          value={xpReward}
          onChange={(e) => setXpReward(parseInt(e.target.value, 10) || 0)}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
