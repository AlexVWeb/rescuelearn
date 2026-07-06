"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";

export async function createSlot(
  sessionId: string,
  data: { label: string; date: Date; startTime: string; endTime: string }
) {
  const user = await requireOrganisme();

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  return prisma.slot.create({
    data: { ...data, trainingSessionId: sessionId },
  });
}

export async function deleteSlot(id: string) {
  const user = await requireOrganisme();

  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { trainingSession: true },
  });
  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  return prisma.slot.delete({ where: { id } });
}
