import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Returns an extended Prisma client that automatically filters by organismeId
 * for models that have it (Trainee, TrainingSession, ExternalTraining).
 */
export function withOrganisme(organismeId: string) {
  return prisma.$extends({
    query: {
      trainee: {
        findMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }) => {
          return prisma.trainee.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }) => {
          const data = args.data as Record<string, unknown>;
          data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          const createData = args.create as Record<string, unknown>;
          const updateData = args.update as Record<string, unknown>;
          createData.organismeId = organismeId;
          updateData.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      trainingSession: {
        findMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }) => {
          return prisma.trainingSession.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }) => {
          const data = args.data as Record<string, unknown>;
          data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          const createData = args.create as Record<string, unknown>;
          const updateData = args.update as Record<string, unknown>;
          createData.organismeId = organismeId;
          updateData.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      externalTraining: {
        findMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }) => {
          return prisma.externalTraining.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }) => {
          const data = args.data as Record<string, unknown>;
          data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          const createData = args.create as Record<string, unknown>;
          const updateData = args.update as Record<string, unknown>;
          createData.organismeId = organismeId;
          updateData.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      organisme: {
        findUnique: async ({ args, query }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        update: async ({ args, query }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        delete: async ({ args, query }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        count: async ({ args, query }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
      },
      user: {
        findMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }) => {
          return prisma.user.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        update: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        count: async ({ args, query }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
    },
  });
}
