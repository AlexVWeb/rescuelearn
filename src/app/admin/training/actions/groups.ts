"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { SESSION_STATUS } from "../types";
import { groupName, type GroupDraft } from "../lib/group-rules";

const CLOSED_ERROR = "Impossible de modifier une session clôturée";
const MAX_GROUP_NAME_LENGTH = 100;

function assertGroupName(name: string) {
  if (name.length > MAX_GROUP_NAME_LENGTH) {
    throw new Error("Nom du groupe trop long");
  }
}

function isSessionClosed(status: string) {
  return (
    status === SESSION_STATUS.TERMINEE || status === SESSION_STATUS.ANNULEE
  );
}

const sessionInclude = {
  formateurs: { select: { userId: true } },
  inscriptions: { select: { id: true } },
} as const;

async function getEditableSession(sessionId: string) {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    include: sessionInclude,
  });
  if (!session) throw new Error("Session introuvable");
  if (isSessionClosed(session.status)) throw new Error(CLOSED_ERROR);
  return session;
}

// TrainingGroup n'a pas d'organismeId : contrôle via la session parente
async function getEditableGroup(groupId: string) {
  const user = await requireOrganisme();
  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    include: { trainingSession: { include: sessionInclude } },
  });
  if (!group || group.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Groupe introuvable");
  }
  if (isSessionClosed(group.trainingSession.status)) {
    throw new Error(CLOSED_ERROR);
  }
  return group;
}

function assertFormateur(
  session: { formateurs: { userId: string }[] },
  formateurId: string | null | undefined
) {
  if (
    formateurId &&
    !session.formateurs.some((f) => f.userId === formateurId)
  ) {
    throw new Error("Formateur non affecté à la session");
  }
}

function assertInscriptions(
  session: { inscriptions: { id: string }[] },
  inscriptionIds: string[]
) {
  const valid = new Set(session.inscriptions.map((i) => i.id));
  const seen = new Set<string>();
  for (const id of inscriptionIds) {
    if (!valid.has(id) || seen.has(id)) throw new Error("Inscription invalide");
    seen.add(id);
  }
}

export async function saveGeneratedGroups(
  sessionId: string,
  drafts: GroupDraft[]
) {
  const session = await getEditableSession(sessionId);
  if (drafts.length > Math.max(1, session.inscriptions.length)) {
    throw new Error("Trop de groupes pour le nombre d'apprenants");
  }
  drafts.forEach((d) => {
    assertFormateur(session, d.formateurId);
    assertGroupName(d.name.trim());
  });
  assertInscriptions(
    session,
    drafts.flatMap((d) => d.inscriptionIds)
  );

  // Ids générés ici pour lier les inscriptions dans la même transaction
  const groups = drafts.map((d, position) => ({
    id: crypto.randomUUID(),
    position,
    name: d.name.trim() || groupName(position),
    formateurId: d.formateurId,
    inscriptionIds: d.inscriptionIds,
  }));

  await prisma.$transaction([
    prisma.trainingGroup.deleteMany({
      where: { trainingSessionId: sessionId },
    }),
    ...groups.map((g) =>
      prisma.trainingGroup.create({
        data: {
          id: g.id,
          trainingSessionId: sessionId,
          name: g.name,
          position: g.position,
          formateurId: g.formateurId,
        },
      })
    ),
    ...groups
      .filter((g) => g.inscriptionIds.length > 0)
      .map((g) =>
        prisma.inscription.updateMany({
          where: { id: { in: g.inscriptionIds }, trainingSessionId: sessionId },
          data: { groupId: g.id },
        })
      ),
  ]);
}

export async function createGroup(sessionId: string) {
  await getEditableSession(sessionId);
  const existing = await prisma.trainingGroup.findMany({
    where: { trainingSessionId: sessionId },
    select: { name: true, position: true },
  });
  // Premier nom libre : évite deux « Groupe B » après une suppression
  const names = new Set(existing.map((g) => g.name));
  let index = 0;
  while (names.has(groupName(index))) index++;

  return prisma.trainingGroup.create({
    data: {
      trainingSessionId: sessionId,
      name: groupName(index),
      position: Math.max(-1, ...existing.map((g) => g.position)) + 1,
    },
  });
}

export async function updateGroup(
  groupId: string,
  data: { name?: string; formateurId?: string | null }
) {
  const group = await getEditableGroup(groupId);
  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error("Le nom du groupe est requis");
  }
  if (name) assertGroupName(name);
  assertFormateur(group.trainingSession, data.formateurId);

  return prisma.trainingGroup.update({
    where: { id: groupId },
    data: {
      ...(name !== undefined && { name }),
      ...(data.formateurId !== undefined && { formateurId: data.formateurId }),
    },
  });
}

export async function deleteGroup(groupId: string) {
  await getEditableGroup(groupId);
  // Les inscriptions repassent en « Non affectés » (onDelete: SetNull)
  return prisma.trainingGroup.delete({ where: { id: groupId } });
}

export async function moveInscriptions(
  sessionId: string,
  inscriptionIds: string[],
  groupId: string | null
) {
  const session = await getEditableSession(sessionId);
  assertInscriptions(session, inscriptionIds);

  if (groupId) {
    const group = await prisma.trainingGroup.findFirst({
      where: { id: groupId, trainingSessionId: sessionId },
      select: { id: true },
    });
    if (!group) throw new Error("Groupe introuvable");
  }

  return prisma.inscription.updateMany({
    where: { id: { in: inscriptionIds }, trainingSessionId: sessionId },
    data: { groupId },
  });
}
