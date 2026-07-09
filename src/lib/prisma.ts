import { logger } from "@/lib/logger";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { encrypt, decrypt, hash } from "./encryption";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

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
export const ORGANISME_ENCRYPTED_FIELDS = ["smtpPassword"];

type QueryCb<TArgs> = {
  args: TArgs;
  query: (args: TArgs) => Promise<unknown>;
};

type FindArgs = { where?: Record<string, unknown> };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = {
  where?: Record<string, unknown>;
  data: Record<string, unknown>;
};
type UpsertArgs = {
  where?: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};
type DeleteArgs = { where: Prisma.ReferencielWhereUniqueInput };
type FindFirstDelegate = {
  findFirst: (args: Record<string, unknown>) => Promise<unknown>;
};

function encryptData(
  data: Record<string, unknown> | null | undefined,
  fields: string[]
) {
  if (!data) return data;
  const res = { ...data };
  for (const field of fields) {
    if (res[field] !== undefined && res[field] !== null) {
      const val =
        res[field] instanceof Date
          ? (res[field] as Date).toISOString()
          : String(res[field]);
      res[field] = encrypt(val);
    }
  }
  return res;
}

export function decryptData<T>(data: T, fields: string[]): T {
  if (!data) return data;
  if (Array.isArray(data))
    return data.map((d) => decryptData(d, fields)) as unknown as T;

  const res = { ...(data as Record<string, unknown>) };

  for (const field of fields) {
    if (
      res[field] &&
      typeof res[field] === "string" &&
      (res[field] as string).split(":").length === 3
    ) {
      try {
        res[field] = decrypt(res[field] as string);
      } catch {
        // Ignore
      }
    }
  }

  if (res.externalTrainings && Array.isArray(res.externalTrainings)) {
    res.externalTrainings = res.externalTrainings.map((et: unknown) =>
      decryptData(et, EXTERNAL_TRAINING_ENCRYPTED_FIELDS)
    );
  }

  if (res.inscriptions && Array.isArray(res.inscriptions)) {
    res.inscriptions = res.inscriptions.map((i: unknown) => decryptData(i, []));
  }

  if (res.inscription && typeof res.inscription === "object") {
    res.inscription = decryptData(res.inscription, []);
  }

  if (res.trainee && typeof res.trainee === "object") {
    res.trainee = decryptData(res.trainee, TRAINEE_ENCRYPTED_FIELDS);
  }

  return res as unknown as T;
}

const dbUrl =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DIRECT_URL ||
  process.env.DIRECT_URL;

logger.info(
  "🔌 Initialisation Prisma avec DATABASE_URL:",
  dbUrl?.replace(/:[^:@]+@/, ":****@")
);
const pool = new Pool({
  connectionString: dbUrl,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});
const adapter = new PrismaPg(pool);

const baseClient = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

export const prisma =
  globalForPrisma.prisma ||
  baseClient.$extends({
    query: {
      emargement: {
        async create({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async update({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async upsert({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findMany({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findFirst({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findUnique({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
      },
      trainee: {
        async create({ args, query }: QueryCb<CreateArgs>) {
          const data = args.data;
          if (data.email && !data.emailHash && typeof data.email === "string")
            data.emailHash = hash(data.email);
          data.lastActivityAt = new Date();
          args.data = encryptData(data, TRAINEE_ENCRYPTED_FIELDS) as Record<
            string,
            unknown
          >;
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async update({ args, query }: QueryCb<UpdateArgs>) {
          const data = args.data;
          if (data.email && typeof data.email === "string")
            data.emailHash = hash(data.email);
          data.lastActivityAt = new Date();
          args.data = encryptData(data, TRAINEE_ENCRYPTED_FIELDS) as Record<
            string,
            unknown
          >;
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async upsert({ args, query }: QueryCb<UpsertArgs>) {
          const create = args.create;
          const update = args.update;
          if (
            create.email &&
            !create.emailHash &&
            typeof create.email === "string"
          )
            create.emailHash = hash(create.email);
          if (update.email && typeof update.email === "string")
            update.emailHash = hash(update.email);
          args.create = encryptData(create, TRAINEE_ENCRYPTED_FIELDS) as Record<
            string,
            unknown
          >;
          args.update = encryptData(update, TRAINEE_ENCRYPTED_FIELDS) as Record<
            string,
            unknown
          >;
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async findMany({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async findFirst({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
        async findUnique({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), TRAINEE_ENCRYPTED_FIELDS);
        },
      },
      externalTraining: {
        async create({ args, query }: QueryCb<CreateArgs>) {
          args.data = encryptData(
            args.data,
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          ) as Record<string, unknown>;
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async update({ args, query }: QueryCb<UpdateArgs>) {
          args.data = encryptData(
            args.data,
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          ) as Record<string, unknown>;
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async findMany({ args, query }: QueryCb<unknown>) {
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async findFirst({ args, query }: QueryCb<unknown>) {
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
        async findUnique({ args, query }: QueryCb<unknown>) {
          return decryptData(
            await query(args),
            EXTERNAL_TRAINING_ENCRYPTED_FIELDS
          );
        },
      },
      inscription: {
        async create({ args, query }: QueryCb<unknown>) {
          const res = (await query(args)) as Record<string, unknown>;
          if (res.traineeId) {
            await prisma.trainee.update({
              where: { id: res.traineeId as string },
              data: { lastActivityAt: new Date() },
            });
          }
          return decryptData(res, []);
        },
        async findMany({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findFirst({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findUnique({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
      },
      trainingSession: {
        async findMany({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findFirst({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
        async findUnique({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), []);
        },
      },
      organisme: {
        async create({ args, query }: QueryCb<CreateArgs>) {
          args.data = encryptData(
            args.data,
            ORGANISME_ENCRYPTED_FIELDS
          ) as Record<string, unknown>;
          return decryptData(await query(args), ORGANISME_ENCRYPTED_FIELDS);
        },
        async update({ args, query }: QueryCb<UpdateArgs>) {
          args.data = encryptData(
            args.data,
            ORGANISME_ENCRYPTED_FIELDS
          ) as Record<string, unknown>;
          return decryptData(await query(args), ORGANISME_ENCRYPTED_FIELDS);
        },
        async findMany({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), ORGANISME_ENCRYPTED_FIELDS);
        },
        async findFirst({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), ORGANISME_ENCRYPTED_FIELDS);
        },
        async findUnique({ args, query }: QueryCb<unknown>) {
          return decryptData(await query(args), ORGANISME_ENCRYPTED_FIELDS);
        },
      },
      referenciel: {
        async delete({ args, query }: QueryCb<DeleteArgs>) {
          const referenciel = await baseClient.referenciel.findUnique({
            where: args.where,
            select: { pdfUrl: true },
          });
          const result = await query(args);
          if (referenciel?.pdfUrl) {
            try {
              const r2PublicUrl = process.env.R2_PUBLIC_URL;
              if (r2PublicUrl && referenciel.pdfUrl.startsWith(r2PublicUrl)) {
                const { deleteFile } = await import("@/lib/r2");
                const key = referenciel.pdfUrl.replace(`${r2PublicUrl}/`, "");
                await deleteFile(key);
              }
            } catch (error) {
              logger.error(
                "Failed to delete referenciel file from R2 during database delete hook:",
                error
              );
            }
          }
          return result;
        },
        async deleteMany({ args, query }: QueryCb<FindArgs>) {
          const referenciels = await baseClient.referenciel.findMany({
            where: args.where,
            select: { pdfUrl: true },
          });
          const result = await query(args);
          const r2PublicUrl = process.env.R2_PUBLIC_URL;
          if (r2PublicUrl) {
            try {
              const { deleteFile } = await import("@/lib/r2");
              for (const ref of referenciels) {
                if (ref.pdfUrl && ref.pdfUrl.startsWith(r2PublicUrl)) {
                  try {
                    const key = ref.pdfUrl.replace(`${r2PublicUrl}/`, "");
                    await deleteFile(key);
                  } catch (error) {
                    logger.error(
                      "Failed to delete referenciel file from R2 during database deleteMany hook:",
                      error
                    );
                  }
                }
              }
            } catch (error) {
              logger.error(
                "Failed to run R2 cleanup during database deleteMany hook:",
                error
              );
            }
          }
          return result;
        },
      },
    },
  });

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma as unknown as PrismaClient;

export function withOrganisme(organismeId: string) {
  return (prisma as unknown as PrismaClient).$extends({
    query: {
      trainee: {
        findMany: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args }: QueryCb<FindArgs>) => {
          return (prisma.trainee as unknown as FindFirstDelegate).findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }: QueryCb<CreateArgs>) => {
          args.data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        upsert: async ({ args, query }: QueryCb<UpsertArgs>) => {
          args.where = { ...args.where, organismeId };
          args.create.organismeId = organismeId;
          args.update.organismeId = organismeId;
          return query(args);
        },
        count: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      trainingSession: {
        findMany: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args }: QueryCb<FindArgs>) => {
          return (
            prisma.trainingSession as unknown as FindFirstDelegate
          ).findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }: QueryCb<CreateArgs>) => {
          args.data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        count: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      externalTraining: {
        findMany: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args }: QueryCb<FindArgs>) => {
          return (
            prisma.externalTraining as unknown as FindFirstDelegate
          ).findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        create: async ({ args, query }: QueryCb<CreateArgs>) => {
          args.data.organismeId = organismeId;
          return query(args);
        },
        update: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        count: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
      organisme: {
        findUnique: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        update: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
        count: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, id: organismeId };
          return query(args);
        },
      },
      user: {
        findMany: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findFirst: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        findUnique: async ({ args }: QueryCb<FindArgs>) => {
          return (prisma.user as unknown as FindFirstDelegate).findFirst({
            ...args,
            where: { ...args.where, organismeId },
          });
        },
        update: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
        count: async ({ args, query }: QueryCb<FindArgs>) => {
          args.where = { ...args.where, organismeId };
          return query(args);
        },
      },
    },
  });
}
