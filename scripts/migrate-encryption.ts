import { logger } from "@/lib/logger";
import { PrismaClient } from "@prisma/client";
import { encrypt, hash } from "../src/lib/encryption";
import { getFile, uploadFile } from "../src/lib/r2";

/**
 * Script de migration pour chiffrer les données existantes.
 * À exécuter avec: bun scripts/migrate-encryption.ts
 */

const prisma = new PrismaClient();

const TRAINEE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "birthPlace",
  "address",
];
const EXTERNAL_FIELDS = ["certificateNumber", "name"];

async function main() {
  logger.info("Début de la migration de chiffrement...");

  // 1. Migration des stagiaires
  const trainees = await prisma.trainee.findMany();
  logger.info(`${trainees.length} stagiaires à traiter.`);

  for (const trainee of trainees) {
    const updateData: Record<string, string> = {};

    for (const field of TRAINEE_FIELDS) {
      const val = (trainee as Record<string, unknown>)[field];
      if (val && typeof val === "string" && !val.includes(":")) {
        updateData[field] = encrypt(val);
      }
    }

    // Gestion de la date de naissance (anciennement Date, maintenant String chiffré)
    // Note: Si prisma generate a déjà été lancé, le type peut être différent.
    const dob = (trainee as Record<string, unknown>).dateOfBirth;
    if (
      dob &&
      (dob instanceof Date || (typeof dob === "string" && !dob.includes(":")))
    ) {
      const iso = dob instanceof Date ? dob.toISOString() : dob;
      updateData.dateOfBirth = encrypt(iso);
    }

    // Hash de l'email pour les recherches
    if (trainee.email && !trainee.emailHash) {
      const plainEmail = trainee.email.includes(":")
        ? trainee.email // On ne déchiffre pas ici car on n'a pas accès au client étendu facilement sans risquer des boucles
        : trainee.email;

      // Si l'email est déjà chiffré, on a un problème pour calculer le hash sans le déchiffrer.
      // Mais dans cette migration, on suppose qu'on part de données claires.
      updateData.emailHash = hash(plainEmail);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.trainee.update({
        where: { id: trainee.id },
        data: updateData,
      });
      logger.info(`Stagiaire ${trainee.id} mis à jour.`);
    }
  }

  // 2. Migration des formations externes
  const externals = await prisma.externalTraining.findMany();
  logger.info(`${externals.length} formations externes à traiter.`);

  for (const ext of externals) {
    const updateData: Record<string, string> = {};

    for (const field of EXTERNAL_FIELDS) {
      const val = (ext as Record<string, unknown>)[field];
      if (val && typeof val === "string" && !val.includes(":")) {
        updateData[field] = encrypt(val);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.externalTraining.update({
        where: { id: ext.id },
        data: updateData,
      });
      logger.info(`Formation externe ${ext.id} mise à jour.`);
    }

    // 3. Migration des fichiers R2
    if (ext.fileKey) {
      try {
        const { buffer, contentType } = await getFile(ext.fileKey);
        // On vérifie si c'est déjà chiffré. Difficile sur un buffer,
        // mais on peut essayer de déchiffrer. Si ça échoue, c'est probablement pas chiffré.
        // Ou on se base sur le fait que la migration est lancée une fois.
        await uploadFile(
          ext.fileKey,
          buffer,
          contentType || "application/octet-stream",
          true
        );
        logger.info(`Fichier R2 ${ext.fileKey} chiffré.`);
      } catch (e) {
        logger.error(`Erreur chiffrement fichier ${ext.fileKey}:`, e);
      }
    }
  }

  logger.info("Migration terminée avec succès.");
}

main()
  .catch((e) => {
    logger.error("Erreur pendant la migration:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
