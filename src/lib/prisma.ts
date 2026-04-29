import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, hash } from "./encryption";

const globalForPrisma = globalThis as unknown as { prisma: any };

export const TRAINEE_ENCRYPTED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "dateOfBirth",
  "birthPlace",
  "address",
];
export const EXTERNAL_TRAINING_ENCRYPTED_FIELDS = ["certificateNumber", "name"];

function encryptData(data: any, fields: string[]) {
  if (!data) return data;
  const res = { ...data };
  for (const field of fields) {
    if (res[field] !== undefined && res[field] !== null) {
      const val =
        res[field] instanceof Date
          ? res[field].toISOString()
          : String(res[field]);
      res[field] = encrypt(val);
    }
  }
  return res;
}

export function decryptData(data: any, fields: string[]): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((d) => decryptData(d, fields));

  const res = { ...data };

  // 1. Decrypt direct fields
  for (const field of fields) {
    if (
      res[field] &&
      typeof res[field] === "string" &&
      res[field].split(":").length === 3
    ) {
      try {
        res[field] = decrypt(res[field]);
      } catch {
        // Ignore if not actually encrypted
      }
    }
  }

  // 2. Recursively decrypt known relations if they exist in the object
  if (res.externalTrainings && Array.isArray(res.externalTrainings)) {
    res.externalTrainings = res.externalTrainings.map((et: any) =>
      decryptData(et, EXTERNAL_TRAINING_ENCRYPTED_FIELDS)
    );
  }

  // We can add other relations here if needed (e.g. inscriptions -> trainee)
  if (res.trainee && typeof res.trainee === "object") {
    res.trainee = decryptData(res.trainee, TRAINEE_ENCRYPTED_FIELDS);
  }

  return res;
}

const baseClient = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

export const prisma =
  globalForPrisma.prisma ||
  baseClient.$extends({
    query: {
      trainee: {
        async create({ args, query }: { args: any; query: any }) {
          const data = args.data as any;
          if (data.email && !data.emailHash) data.emailHash = hash(data.email);
          args.data = encryptData(data, TRAINEE_ENCRYPTED_FIELDS);
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async update({ args, query }: { args: any; query: any }) {
          const data = args.data as any;
          if (data.email) data.emailHash = hash(data.email);
          args.data = encryptData(data, TRAINEE_ENCRYPTED_FIELDS);
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async upsert({ args, query }: { args: any; query: any }) {
          const create = args.create as any;
          const update = args.update as any;
          if (create.email && !create.emailHash)
            create.emailHash = hash(create.email);
          if (update.email) update.emailHash = hash(update.email);
          args.create = encryptData(create, TRAINEE_ENCRYPTED_FIELDS);
          args.update = encryptData(update, TRAINEE_ENCRYPTED_FIELDS);
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async findMany({ args, query }: { args: any; query: any }) {
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
      },
      externalTraining: {
        async create({ args, query }: { args: any; query: any }) {
          args.data = encryptData(
            args.data,
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async update({ args, query }: { args: any; query: any }) {
          args.data = encryptData(
            args.data,
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async findMany({ args, query }: { args: any; query: any }) {
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async findUnique({ args, query }: { args: any; query: any }) {
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
      },
    },
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
        findMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }: { args: any; query: any }) => {
          return prisma.trainee.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }: { args: any; query: any }) => {
          const data = args.data as Record<string, unknown>;
          data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          const createData = args.create as Record<string, unknown>;
          const updateData = args.update as Record<string, unknown>;
          createData.organismeId = organismeId;
          updateData.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      trainingSession: {
        findMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }: { args: any; query: any }) => {
          return prisma.trainingSession.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }: { args: any; query: any }) => {
          const data = args.data as Record<string, unknown>;
          data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          const createData = args.create as Record<string, unknown>;
          const updateData = args.update as Record<string, unknown>;
          createData.organismeId = organismeId;
          updateData.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      externalTraining: {
        findMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }: { args: any; query: any }) => {
          return prisma.externalTraining.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }: { args: any; query: any }) => {
          const data = args.data as Record<string, unknown>;
          data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          const createData = args.create as Record<string, unknown>;
          const updateData = args.update as Record<string, unknown>;
          createData.organismeId = organismeId;
          updateData.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      organisme: {
        findUnique: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        update: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        delete: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        count: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
      },
      user: {
        findMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args, query }: { args: any; query: any }) => {
          return prisma.user.findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        update: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        updateMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        delete: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        deleteMany: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        count: async ({ args, query }: { args: any; query: any }) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
    },
  });
}
