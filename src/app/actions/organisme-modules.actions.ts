"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context";
import { UserRole, hasRole } from "@/lib/roles";
import {
  ORGANISME_MODULES,
  isOrganismeModuleKey,
} from "@/lib/organisme-modules/registry";

type Result = { success: true } | { success: false; error: string };

function revalidateOrganismePages(organismeId: string) {
  revalidatePath(`/admin/organismes/${organismeId}`);
  revalidatePath("/admin/training", "layout");
}

/** Super admin : rend un module disponible (ou non) pour un organisme. */
export async function setModuleAvailabilityAction(
  organismeId: string,
  key: string,
  available: boolean
): Promise<Result> {
  const user = await getUserContext();
  if (!hasRole(user.roles, UserRole.SUPER_ADMIN)) {
    return { success: false, error: "Non autorisé" };
  }
  if (!isOrganismeModuleKey(key)) {
    return { success: false, error: "Module inconnu" };
  }

  await prisma.organismeModule.upsert({
    where: { organismeId_module: { organismeId, module: key } },
    create: {
      organismeId,
      module: key,
      available,
      enabled: ORGANISME_MODULES[key].defaults.enabled,
    },
    update: { available },
  });
  revalidateOrganismePages(organismeId);
  return { success: true };
}

/**
 * Admin organisme : active un module disponible sur son organisme.
 * Le super admin peut agir sur n'importe quel organisme (organismeId requis).
 */
export async function setModuleEnabledAction(
  key: string,
  enabled: boolean,
  organismeId?: string
): Promise<Result> {
  const user = await getUserContext();
  const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
  const targetId = isSuperAdmin
    ? organismeId
    : hasRole(user.roles, UserRole.ADMIN_ORGANISME)
      ? user.organismeId
      : null;
  if (!targetId) return { success: false, error: "Non autorisé" };
  if (!isOrganismeModuleKey(key)) {
    return { success: false, error: "Module inconnu" };
  }

  const row = await prisma.organismeModule.findUnique({
    where: { organismeId_module: { organismeId: targetId, module: key } },
    select: { available: true },
  });
  const available = row?.available ?? ORGANISME_MODULES[key].defaults.available;
  if (!available) return { success: false, error: "Module non disponible" };

  await prisma.organismeModule.upsert({
    where: { organismeId_module: { organismeId: targetId, module: key } },
    create: { organismeId: targetId, module: key, available, enabled },
    update: { enabled },
  });
  revalidateOrganismePages(targetId);
  return { success: true };
}
