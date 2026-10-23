"use server";

import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import { markEmargementSigned } from "@/lib/emargement-sign";
import {
  assertNotRateLimited,
  getClientIp,
  registerFailure,
  type RateLimitRule,
} from "@/lib/rate-limit";
import { EMARGEMENT_STATUS, SESSION_STATUS } from "../types";

// Actions appelées sans authentification depuis /validation.
// Chaque action revérifie le PIN côté serveur : un emargementId seul ne suffit
// jamais, et aucune donnée d'identification (date de naissance) ne quitte le serveur.

const PIN_PATTERN = /^\d{6}$/;
const MIN_PREFIX_LENGTH = 3;
const FAILURE_WINDOW_SECONDS = 15 * 60;

// Généreux : une salle entière partage souvent la même IP publique
function pinRule(ip: string): RateLimitRule {
  return {
    key: `validation:pin:${ip}`,
    max: 30,
    windowSeconds: FAILURE_WINDOW_SECONDS,
  };
}

// Indépendant de l'IP : empêche de deviner une date de naissance en changeant d'IP
function dobRule(pin: string, prefix: string): RateLimitRule {
  return {
    key: `validation:dob:${pin}:${prefix}`,
    max: 5,
    windowSeconds: FAILURE_WINDOW_SECONDS,
  };
}

function normalizeString(str: string): string {
  return str.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizePrefix(lastNamePrefix: string): string {
  const prefix = normalizeString(lastNamePrefix);
  if (prefix.length < MIN_PREFIX_LENGTH) {
    throw new Error("Saisissez les 3 premières lettres de votre nom.");
  }
  return prefix;
}

function formatDob(dateOfBirth: string | null | undefined): string | null {
  return dateOfBirth ? dayjs(dateOfBirth).format("YYYY-MM-DD") : null;
}

async function findEmargementsByPin(pin: string) {
  const rule = pinRule(await getClientIp());
  await assertNotRateLimited(rule);

  const emargements = PIN_PATTERN.test(pin)
    ? await prisma.emargement.findMany({
        where: {
          validationCode: pin,
          slot: {
            trainingSession: {
              status: {
                notIn: [SESSION_STATUS.TERMINEE, SESSION_STATUS.ANNULEE],
              },
            },
          },
        },
        include: {
          slot: { include: { trainingSession: true } },
          inscription: { include: { trainee: true } },
        },
      })
    : [];

  if (emargements.length === 0) {
    await registerFailure(rule);
    throw new Error("Code PIN invalide");
  }

  return emargements;
}

type PinEmargement = Awaited<ReturnType<typeof findEmargementsByPin>>[number];

function matchByPrefix(emargements: PinEmargement[], prefix: string) {
  return emargements.filter((e) =>
    normalizeString(e.inscription.trainee?.lastName || "").startsWith(prefix)
  );
}

function toTraineeEntry(e: PinEmargement) {
  return {
    emargementId: e.id,
    slotLabel: e.slot.label,
    sessionTitle: e.slot.trainingSession.title,
    traineeId: e.inscription.trainee.id,
    firstName: e.inscription.trainee.firstName || "",
    lastName: e.inscription.trainee.lastName || "",
    status: e.status,
  };
}

export async function getSessionDetailsByPin(pin: string) {
  const [emargement] = await findEmargementsByPin(pin);

  return {
    sessionTitle: emargement.slot.trainingSession.title,
    slotLabel: emargement.slot.label,
  };
}

// Plusieurs stagiaires partagent le préfixe : on ne renvoie aucun nom,
// le client doit d'abord fournir une date de naissance.
export async function getTraineesByPinAndName(
  pin: string,
  lastNamePrefix: string
) {
  const prefix = normalizePrefix(lastNamePrefix);
  const matched = matchByPrefix(await findEmargementsByPin(pin), prefix);

  if (matched.length > 1) {
    return { requiresDob: true, trainees: [] };
  }
  return { requiresDob: false, trainees: matched.map(toTraineeEntry) };
}

export async function getTraineesByPinNameAndDob(
  pin: string,
  lastNamePrefix: string,
  dateOfBirth: string
) {
  const prefix = normalizePrefix(lastNamePrefix);
  const matched = matchByPrefix(await findEmargementsByPin(pin), prefix);

  const rule = dobRule(pin, prefix);
  await assertNotRateLimited(rule);

  const byDob = matched.filter(
    (e) => formatDob(e.inscription.trainee.dateOfBirth) === dateOfBirth
  );
  if (byDob.length === 0) {
    await registerFailure(rule);
    throw new Error("Date de naissance incorrecte.");
  }

  return byDob.map(toTraineeEntry);
}

export async function validatePresencePublic(input: {
  pin: string;
  emargementId: string;
  lastNamePrefix: string;
  dateOfBirth?: string;
}) {
  const prefix = normalizePrefix(input.lastNamePrefix);
  const matched = matchByPrefix(await findEmargementsByPin(input.pin), prefix);

  const target = matched.find((e) => e.id === input.emargementId);
  if (!target) throw new Error("Stagiaire introuvable pour ce code.");

  // Même règle que le parcours : préfixe ambigu → date de naissance exigée
  if (matched.length > 1) {
    const rule = dobRule(input.pin, prefix);
    await assertNotRateLimited(rule);
    if (
      formatDob(target.inscription.trainee.dateOfBirth) !== input.dateOfBirth
    ) {
      await registerFailure(rule);
      throw new Error("Date de naissance incorrecte.");
    }
  }

  await markEmargementSigned(target, "pin");

  return { status: EMARGEMENT_STATUS.VALIDE };
}
