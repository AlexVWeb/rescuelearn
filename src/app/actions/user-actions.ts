"use server";
import { logger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { UserRole } from "@/lib/roles";
import { hashPassword } from "better-auth/crypto";

// Type definitions could be moved to a types file
export type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  roles: UserRole[];
  createdAt: Date;
  emailVerified: boolean;
};

export async function getUsersAction(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const mappedUsers: User[] = users.map((u) => ({
      ...u,
      roles: (typeof u.roles === "string"
        ? JSON.parse(u.roles)
        : u.roles) as UserRole[],
    }));

    return {
      success: true,
      data: mappedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

export async function createUserAction(data: {
  name: string;
  email: string;
  role: string;
  password: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const hashedPwd = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        roles: [data.role],
        emailVerified: false,
      },
    });
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPwd,
      },
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to create user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function deleteUserAction(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function updateUserAction(
  userId: string,
  data: { name?: string; roles?: UserRole[] }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        roles: data.roles ? JSON.stringify(data.roles) : undefined,
      },
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update user:", error);
    return { success: false, error: "Failed to update user" };
  }
}
