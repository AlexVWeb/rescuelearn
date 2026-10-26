import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { OrganismeModuleKey } from "./registry";
import { resolveModules, type OrganismeModuleState } from "./resolve";

export const getOrganismeModules = cache(
  async (organismeId: string): Promise<OrganismeModuleState[]> => {
    const rows = await prisma.organismeModule.findMany({
      where: { organismeId },
      select: { module: true, available: true, enabled: true },
    });
    return resolveModules(rows);
  }
);

export async function isModuleActive(
  organismeId: string,
  key: OrganismeModuleKey
): Promise<boolean> {
  const modules = await getOrganismeModules(organismeId);
  return modules.find((m) => m.key === key)?.active ?? false;
}

/**
 * Filtre Prisma sur `Organisme` : module actif. Suppose `defaults.enabled`
 * à false (une ligne est alors nécessaire pour être actif).
 */
export function activeModuleWhere(key: OrganismeModuleKey) {
  return { modules: { some: { module: key, available: true, enabled: true } } };
}
