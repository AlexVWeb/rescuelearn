"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// --- Types ---
// Matches Prisma model
export type SNVScenario = {
    id: number;
    title: string;
    level: string;
    description: string;
    // victims are fetched optionally or specifically
};

export type SNVVictim = {
    id: number;
    description: string;
    correctAnswer: number;
    explanation: string;
    scenarioId: number;
    scenario?: SNVScenario;
};

// --- Scenarios Actions ---

export async function getScenariosAction(
    page: number = 1,
    limit: number = 10,
    search: string = ""
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const skip = (page - 1) * limit;
    const where = search
        ? {
            title: { contains: search, mode: "insensitive" as const },
        }
        : {};

    try {
        const [scenarios, total] = await Promise.all([
            prisma.sNVScenario.findMany({ // Capitalization might vary, checking Prisma schema: model SNVScenario
                where,
                skip,
                take: limit,
                orderBy: { id: "desc" },
                include: {
                    _count: {
                        select: { victimes: true }
                    }
                }
            }),
            prisma.sNVScenario.count({ where }),
        ]);

        return {
            success: true,
            data: scenarios,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error("Failed to fetch scenarios:", error);
        return { success: false, error: "Failed to fetch scenarios" };
    }
}

export async function createScenarioAction(data: { title: string; level: string; description: string }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        await prisma.sNVScenario.create({
            data: {
                title: data.title,
                level: data.level,
                description: data.description,
            },
        });
        revalidatePath("/admin/snv/scenarios");
        return { success: true };
    } catch (error) {
        console.error("Failed to create scenario:", error);
        return { success: false, error: "Failed to create scenario" };
    }
}

export async function updateScenarioAction(id: number, data: { title: string; level: string; description: string }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        await prisma.sNVScenario.update({
            where: { id },
            data: {
                title: data.title,
                level: data.level,
                description: data.description,
            },
        });
        revalidatePath("/admin/snv/scenarios");
        return { success: true };
    } catch (error) {
        console.error("Failed to update scenario:", error);
        return { success: false, error: "Failed to update scenario" };
    }
}

export async function deleteScenarioAction(id: number) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        await prisma.sNVScenario.delete({
            where: { id },
        });
        revalidatePath("/admin/snv/scenarios");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete scenario:", error);
        return { success: false, error: "Failed to delete scenario" };
    }
}

// --- Victims Actions ---

export async function getVictimsAction(
    page: number = 1,
    limit: number = 10,
    search: string = "" // Search by description
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const skip = (page - 1) * limit;
    const where = search
        ? {
            description: { contains: search, mode: "insensitive" as const },
        }
        : {};

    try {
        const [victims, total] = await Promise.all([
            prisma.sNVVictim.findMany({
                where,
                skip,
                take: limit,
                orderBy: { id: "desc" },
                include: {
                    scenario: {
                        select: { title: true }
                    }
                }
            }),
            prisma.sNVVictim.count({ where }),
        ]);

        return {
            success: true,
            data: victims,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error("Failed to fetch victims:", error);
        return { success: false, error: "Failed to fetch victims" };
    }
}

export async function createVictimAction(data: { description: string; correctAnswer: number; explanation: string; scenarioId: number }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        await prisma.sNVVictim.create({
            data: {
                description: data.description,
                correctAnswer: data.correctAnswer,
                explanation: data.explanation,
                scenarioId: data.scenarioId,
            },
        });
        revalidatePath("/admin/snv/victims");
        return { success: true };
    } catch (error) {
        console.error("Failed to create victim:", error);
        return { success: false, error: "Failed to create victim" };
    }
}

export async function updateVictimAction(id: number, data: { description: string; correctAnswer: number; explanation: string; scenarioId: number }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        await prisma.sNVVictim.update({
            where: { id },
            data: {
                description: data.description,
                correctAnswer: data.correctAnswer,
                explanation: data.explanation,
                scenarioId: data.scenarioId,
            },
        });
        revalidatePath("/admin/snv/victims");
        return { success: true };
    } catch (error) {
        console.error("Failed to update victim:", error);
        return { success: false, error: "Failed to update victim" };
    }
}

export async function deleteVictimAction(id: number) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        await prisma.sNVVictim.delete({
            where: { id },
        });
        revalidatePath("/admin/snv/victims");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete victim:", error);
        return { success: false, error: "Failed to delete victim" };
    }
}

// Helper to get all scenarios for the select input in Victim Dialog
export async function getAllScenariosSimpleAction() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    try {
        return await prisma.sNVScenario.findMany({
            select: { id: true, title: true },
            orderBy: { title: "asc" }
        });
    } catch (error) {
        console.error("Failed to fetch all scenarios:", error);
        return [];
    }
}
