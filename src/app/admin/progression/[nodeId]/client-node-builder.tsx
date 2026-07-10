"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LessonExercisesBuilder } from "../components/LessonExercisesBuilder";
import { ProgressionAiGenerator } from "../components/ProgressionAiGenerator";
import { saveProgressionNodeExercisesAction } from "@/app/actions/progression-admin-actions";
import { useRouter } from "next/navigation";

interface Question {
  id: number;
  text: string;
}

interface LearningCard {
  id: number;
  theme: string;
  info: string;
}

interface Referenciel {
  id: number;
  title: string;
}

import { Exercise } from "@/types/progression";

interface ClientNodeBuilderProps {
  node: {
    id: string;
    title: string;
    description: string | null;
    tree: { level: string };
    exercises: Exercise[];
  };
  availableQuestions: Question[];
  availableLearningCards: LearningCard[];
  referenciels: Referenciel[];
}

export default function ClientNodeBuilder({
  node,
  availableQuestions,
  availableLearningCards,
  referenciels,
}: ClientNodeBuilderProps) {
  const [exercises, setExercises] = useState<Exercise[]>(node.exercises);
  const [key, setKey] = useState(0); // Force re-render of builder when importing
  const router = useRouter();

  const handleSave = async (updatedExercises: Exercise[]) => {
    const res = await saveProgressionNodeExercisesAction(
      node.id,
      updatedExercises
    );
    if (res.success) {
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to save exercises");
    }
  };

  const handleImportAiGenerated = (generated: Exercise[]) => {
    // Append generated exercises to current list
    setExercises([...exercises, ...generated]);
    // Force reset/update key of the builder
    setKey((prev) => prev + 1);
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/progression"
          className="text-muted-foreground inline-flex items-center text-sm font-bold hover:text-blue-600"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour à la progression
        </Link>
      </div>

      {/* Header Info */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-800 uppercase">
            Niveau {node.tree.level}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-gray-900">{node.title}</h1>
        {node.description && (
          <p className="text-muted-foreground mt-1 text-sm">
            {node.description}
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Visual builder - left column */}
        <div className="lg:col-span-7">
          <LessonExercisesBuilder
            key={key}
            initialExercises={exercises}
            availableQuestions={availableQuestions}
            availableLearningCards={availableLearningCards}
            onSave={handleSave}
          />
        </div>

        {/* AI generator - right column */}
        <div className="space-y-6 lg:col-span-5">
          <div className="sticky top-6">
            <ProgressionAiGenerator
              referenciels={referenciels}
              defaultLevel={node.tree.level}
              onImport={handleImportAiGenerated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
