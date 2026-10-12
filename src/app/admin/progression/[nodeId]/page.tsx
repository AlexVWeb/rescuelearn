import React from "react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/context";
import { getProgressionNodeDetailsAction } from "@/app/actions/progression-admin-actions";
import { redirect } from "next/navigation";
import ClientNodeBuilder from "./client-node-builder";

export default async function AdminNodeBuilderPage(props: {
  params: Promise<{ nodeId: string }>;
}) {
  await requireSuperAdmin();
  const { nodeId } = await props.params;

  const nodeResult = await getProgressionNodeDetailsAction(nodeId);
  if (!nodeResult.success || !nodeResult.data) {
    redirect("/admin/progression");
  }

  // Fetch lists for selectors. Les éléments déjà utilisés par le nœud restent
  // listés même si leur quiz / fiche est archivé, sinon le select apparaît vide.
  const usedByNode = { progressionExercises: { some: { nodeId } } };

  const questions = await prisma.question.findMany({
    where: { OR: [{ quiz: { archivedAt: null } }, usedByNode] },
    select: {
      id: true,
      text: true,
      correctAnswer: true,
      quiz: { select: { title: true } },
      options: { select: { text: true }, orderBy: { id: "asc" } },
    },
    orderBy: { id: "desc" },
  });

  const cards = await prisma.learningCard.findMany({
    where: { OR: [{ archivedAt: null }, usedByNode] },
    select: { id: true, theme: true, info: true },
    orderBy: { id: "desc" },
  });

  const referenciels = await prisma.referenciel.findMany({
    select: { id: true, title: true, analysisStatus: true },
    orderBy: { title: "asc" },
  });

  return (
    <ClientNodeBuilder
      node={nodeResult.data}
      availableQuestions={questions}
      availableLearningCards={cards}
      referenciels={referenciels}
    />
  );
}
