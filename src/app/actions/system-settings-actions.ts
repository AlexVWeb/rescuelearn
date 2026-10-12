"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/context";
import { revalidateTag } from "next/cache";
import { FeatureKey } from "@/lib/features";
import { logger } from "@/lib/logger";
import {
  buildPlayerModulesState,
  isPlayerModuleKey,
} from "@/types/player-modules";

export async function getSystemSettingsAction() {
  try {
    await requireSuperAdmin();
    const settings = await prisma.systemSetting.findMany();
    return { success: true, data: settings };
  } catch (error) {
    logger.error("Failed to get system settings", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function updateSystemSettingAction(
  key: FeatureKey,
  value: boolean
) {
  try {
    await requireSuperAdmin();
    const stringValue = value ? "true" : "false";

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });

    revalidateTag("system-features", "default");
    return { success: true };
  } catch (error) {
    logger.error(`Failed to update system setting: ${key}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function getPlayerModulesAction() {
  try {
    await requireSuperAdmin();
    const settings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: "MODULE_" } },
    });
    return { success: true, data: buildPlayerModulesState(settings) };
  } catch (error) {
    logger.error("Failed to get player modules", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function updatePlayerModuleAction(key: string, value: boolean) {
  try {
    await requireSuperAdmin();
    if (!isPlayerModuleKey(key) || typeof value !== "boolean") {
      throw new Error("Module inconnu.");
    }
    const stringValue = value ? "true" : "false";

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });

    revalidateTag("system-features", "default");
    return { success: true };
  } catch (error) {
    logger.error(`Failed to update player module: ${key}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
