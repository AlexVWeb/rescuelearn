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

  // Fetch lists for selectors
  const questions = await prisma.question.findMany({
    select: { id: true, text: true },
    orderBy: { id: "desc" },
  });

  const cards = await prisma.learningCard.findMany({
    select: { id: true, theme: true, info: true },
    orderBy: { id: "desc" },
  });

  const referenciels = await prisma.referenciel.findMany({
    select: { id: true, title: true },
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
