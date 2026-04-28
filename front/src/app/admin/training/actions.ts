"use server";

import dayjs from "dayjs";
import {
  computeValidCompetences,
  computeNextExpiry,
} from "./lib/trainee-validity";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { TraineeListItem } from "./types";

async function getUserContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Non autorisé");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      organismeId: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) throw new Error("Utilisateur introuvable");
  return user as typeof user & { organismeId: string | null };
}

export async function getUpcomingSessions() {
  const user = await getUserContext();
  if (!user.organismeId) return [];

  return prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
      status: { in: ["planifiée", "en_cours"] },
    },
    include: {
      slots: true,
      _count: {
        select: { inscriptions: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllSessions() {
  const user = await getUserContext();
  if (!user.organismeId) return [];

  return prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
    },
    include: {
      slots: true,
      _count: {
        select: { inscriptions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMonOrganisme() {
  const user = await getUserContext();
  if (!user.organismeId) return null;

  return prisma.organisme.findUnique({
    where: { id: user.organismeId },
  });
}

export async function getTraineeWithHistory(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) return null;

  return prisma.trainee.findUnique({
    where: { id, organismeId: user.organismeId },
    include: {
      inscriptions: {
        include: {
          trainingSession: true,
        },
        orderBy: { trainingSession: { startDate: "desc" } },
      },
      externalTrainings: {
        orderBy: { obtainedAt: "desc" },
      },
    },
  });
}

export async function getAllTrainees(): Promise<TraineeListItem[]> {
  const user = await getUserContext();
  if (!user.organismeId) return [];

  const trainees = await prisma.trainee.findMany({
    where: { organismeId: user.organismeId },
    include: {
      _count: { select: { inscriptions: true } },
      inscriptions: {
        where: { status: "présent" },
        include: {
          trainingSession: {
            select: { type: true, startDate: true, isFC: true },
          },
        },
      },
      externalTrainings: {
        select: { type: true, obtainedAt: true, isFC: true },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return trainees.map(({ inscriptions, externalTrainings, ...trainee }) => {
    const validCompetences = computeValidCompetences(
      inscriptions,
      externalTrainings
    );
    const nextExpiryResult = computeNextExpiry(inscriptions, externalTrainings);
    return {
      ...trainee,
      validCompetences,
      nextExpiry: nextExpiryResult?.expiryDate.toISOString() ?? null,
      nextExpiryType: nextExpiryResult?.type ?? null,
    };
  }) as TraineeListItem[];
}

import { TrainingSessionService } from "./services/session.service";
import {
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
} from "./types";

export async function createTrainingSession(data: CreateTrainingSessionInput) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.createSession(data, user.organismeId, user.id);
}

export async function updateTrainingSession(
  id: string,
  data: UpdateTrainingSessionInput
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.updateSession(id, data, user.organismeId);
}

export async function deleteTrainingSession(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.deleteSession(id, user.organismeId);
}

export async function createTrainee(data: {
  civility?: string | null;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  birthPlace?: string | null;
  address?: string;
}) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return prisma.trainee.create({
    data: {
      ...data,
      organismeId: user.organismeId,
    },
  });
}

export async function updateTrainee(
  id: string,
  data: {
    civility?: string | null;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    birthPlace?: string | null;
    address?: string;
  }
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify ownership
  const trainee = await prisma.trainee.findFirst({
    where: { id, organismeId: user.organismeId },
  });
  if (!trainee) throw new Error("Stagiaire introuvable");

  return prisma.trainee.update({
    where: { id },
    data,
  });
}

export async function createExternalTraining(data: {
  traineeId: string;
  type: string;
  name: string;
  organisme: string;
  obtainedAt: Date;
  isFC?: boolean;
  certificateNumber?: string;
  fileUrl?: string;
  fileKey?: string;
}) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const trainee = await prisma.trainee.findUnique({
    where: { id: data.traineeId },
  });
  if (!trainee || trainee.organismeId !== user.organismeId) {
    throw new Error("Stagiaire introuvable ou non autorisé");
  }

  return prisma.externalTraining.create({
    data: {
      ...data,
      organismeId: user.organismeId,
    },
  });
}

export async function deleteExternalTraining(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const record = await prisma.externalTraining.findUnique({
    where: { id },
  });
  if (!record || record.organismeId !== user.organismeId) {
    throw new Error("Formation introuvable ou non autorisée");
  }

  if (record.fileKey) {
    const { deleteFile } = await import("@/lib/r2");
    await deleteFile(record.fileKey);
  }

  return prisma.externalTraining.delete({ where: { id } });
}

export async function uploadExternalTrainingFile(formData: FormData) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Aucun fichier fourni");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const key = `rescuelearn/${user.organismeId}/${Date.now()}-${file.name}`;

  const { uploadFile } = await import("@/lib/r2");
  const url = await uploadFile(key, buffer, file.type);

  return { url, key };
}

export async function deleteTrainee(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const trainee = await prisma.trainee.findFirst({
    where: { id, organismeId: user.organismeId },
  });
  if (!trainee) throw new Error("Stagiaire introuvable");

  return prisma.trainee.delete({
    where: { id },
  });
}

export async function importAndEnrollTrainees(
  sessionId: string,
  data: Array<{
    civility?: string | null;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    birthPlace?: string | null;
    address?: string;
  }>
): Promise<{
  created: number;
  enrolled: number;
  skipped: number;
  errors: string[];
}> {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify session ownership
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  let created = 0;
  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const traineeData of data) {
    try {
      // Find or create trainee by email (or by name if no email)
      let trainee;
      if (traineeData.email) {
        trainee = await prisma.trainee.findFirst({
          where: { email: traineeData.email, organismeId: user.organismeId },
        });
      }

      if (!trainee) {
        trainee = await prisma.trainee.create({
          data: { ...traineeData, organismeId: user.organismeId },
        });
        created++;
      }

      // Enroll in session (skip if already inscribed)
      const existingInscription = await prisma.inscription.findUnique({
        where: {
          traineeId_trainingSessionId: {
            traineeId: trainee.id,
            trainingSessionId: sessionId,
          },
        },
      });

      if (existingInscription) {
        skipped++;
      } else {
        await prisma.inscription.create({
          data: { traineeId: trainee.id, trainingSessionId: sessionId },
        });
        enrolled++;
      }
    } catch {
      errors.push(`${traineeData.firstName} ${traineeData.lastName}`);
    }
  }

  return { created, enrolled, skipped, errors };
}

export async function getSessionDetails(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  return TrainingSessionService.getSessionById(id, user.organismeId);
}

// ========================
// SLOTS
// ========================

export async function createSlot(
  sessionId: string,
  data: { label: string; date: Date; startTime: string; endTime: string }
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify session ownership
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  if (!session) throw new Error("Session introuvable");

  return prisma.slot.create({
    data: {
      ...data,
      trainingSessionId: sessionId,
    },
  });
}

export async function deleteSlot(id: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Ensure slot belongs to a session of this organisme
  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { trainingSession: true },
  });
  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  return prisma.slot.delete({ where: { id } });
}

// ========================
// INSCRIPTIONS
// ========================

export async function addTraineeToSession(
  sessionId: string,
  traineeId: string
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  // Verify ownership of both session and trainee
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
  });
  const trainee = await prisma.trainee.findFirst({
    where: { id: traineeId, organismeId: user.organismeId },
  });

  if (!session || !trainee)
    throw new Error("Entité introuvable ou non autorisée");

  return prisma.inscription.create({
    data: {
      trainingSessionId: sessionId,
      traineeId,
    },
  });
}

export async function removeTraineeFromSession(inscriptionId: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { trainingSession: true },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return prisma.inscription.delete({ where: { id: inscriptionId } });
}

export async function updateInscriptionStatus(
  inscriptionId: string,
  status: string
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { trainingSession: true },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return prisma.inscription.update({
    where: { id: inscriptionId },
    data: { status },
  });
}

// ========================
// EMARGEMENT
// ========================

export async function generateSlotPin(slotId: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  // Generate 6 digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  // We need to fetch all inscriptions for this session and create/update Emargement for this slot
  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  // Transaction for batch upsert
  await prisma.$transaction(
    inscriptions.map((inscription: { id: string }) =>
      prisma.emargement.upsert({
        where: {
          inscriptionId_slotId: {
            inscriptionId: inscription.id,
            slotId: slot.id,
          },
        },
        update: { validationCode: pin, codeSentAt: dayjs().toDate() },
        create: {
          inscriptionId: inscription.id,
          slotId: slot.id,
          validationCode: pin,
          codeSentAt: dayjs().toDate(),
        },
      })
    )
  );
  return pin;
}

export async function generateSessionPin(sessionId: string) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: { slots: true },
  });

  if (!session || session.organismeId !== user.organismeId) {
    throw new Error("Session introuvable ou non autorisée");
  }

  // Generate a unique 6-digit PIN per slot
  const pinBySlot = Object.fromEntries(
    session.slots.map((slot) => [
      slot.id,
      Math.floor(100000 + Math.random() * 900000).toString(),
    ])
  );

  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: sessionId },
  });

  // Flat map to create upsert for each (inscription, slot) pair
  const upserts = inscriptions.flatMap((ins) =>
    session.slots.map((slot) =>
      prisma.emargement.upsert({
        where: {
          inscriptionId_slotId: { inscriptionId: ins.id, slotId: slot.id },
        },
        update: {
          validationCode: pinBySlot[slot.id],
          codeSentAt: dayjs().toDate(),
        },
        create: {
          inscriptionId: ins.id,
          slotId: slot.id,
          validationCode: pinBySlot[slot.id],
          codeSentAt: dayjs().toDate(),
        },
      })
    )
  );

  await prisma.$transaction(upserts);
  return pinBySlot;
}

export async function updateEmargementStatus(
  inscriptionId: string,
  slotId: string,
  status: string
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { trainingSession: true },
  });

  if (
    !inscription ||
    inscription.trainingSession.organismeId !== user.organismeId
  ) {
    throw new Error("Inscription introuvable ou non autorisée");
  }

  return prisma.emargement.upsert({
    where: {
      inscriptionId_slotId: { inscriptionId, slotId },
    },
    update: { status },
    create: {
      inscriptionId,
      slotId,
      status,
    },
  });
}

export async function bulkUpdateEmargementStatus(
  slotId: string,
  status: string
) {
  const user = await getUserContext();
  if (!user.organismeId) throw new Error("Aucun organisme associé");

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { trainingSession: true },
  });

  if (!slot || slot.trainingSession.organismeId !== user.organismeId) {
    throw new Error("Créneau introuvable ou non autorisé");
  }

  const inscriptions = await prisma.inscription.findMany({
    where: { trainingSessionId: slot.trainingSessionId },
  });

  return prisma.$transaction(
    inscriptions.map((ins) =>
      prisma.emargement.upsert({
        where: {
          inscriptionId_slotId: { inscriptionId: ins.id, slotId },
        },
        update: { status },
        create: {
          inscriptionId: ins.id,
          slotId,
          status,
        },
      })
    )
  );
}

// ========================
// PUBLIC VALIDATION
// ========================

export async function getTraineesByPin(pin: string) {
  const emargements = await prisma.emargement.findMany({
    where: { validationCode: pin },
    include: {
      slot: { include: { trainingSession: true } },
      inscription: { include: { trainee: true } },
    },
  });

  if (emargements.length === 0) {
    throw new Error("Code PIN invalide");
  }

  return emargements.map((e: any) => ({
    emargementId: e.id,
    slotLabel: e.slot.label,
    sessionTitle: e.slot.trainingSession.title,
    traineeId: e.inscription.trainee.id,
    firstName: e.inscription.trainee.firstName,
    lastName: e.inscription.trainee.lastName,
    status: e.status,
  }));
}

export async function validatePresencePublic(emargementId: string) {
  return prisma.emargement.update({
    where: { id: emargementId },
    data: {
      status: "validé",
      validatedAt: dayjs().toDate(),
    },
  });
}

export async function updateAttestationResult(
  inscriptionId: string,
  result: "acquis" | "non_acquis"
) {
  await getUserContext();
  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: {
      attestationResult: result,
      attestationValidatedAt: new Date(),
    },
  });
}

export async function getFormateur() {
  const user = await getUserContext();
  return {
    lastName: user.lastName ?? null,
    firstName: user.firstName ?? null,
  };
}
