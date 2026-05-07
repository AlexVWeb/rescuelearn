import { logger } from "@/lib/logger";
import { RetentionService } from "../lib/retention-service";

async function main() {
  logger.info("🚀 Démarrage de la maintenance des données...");

  try {
    // 1. Alertes
    const emailsSent = await RetentionService.sendRetentionAlerts();
    logger.info(`${emailsSent} organismes alertés par email.`);

    // 2. Anonymisation (Base Active -> Archive)
    const anonymized = await RetentionService.anonymizeInactiveTrainees();
    logger.info(`${anonymized} stagiaires anonymisés.`);

    // 3. Purge définitive (Archive -> Suppression)
    const purged = await RetentionService.purgeExpiredTrainees();
    logger.info(`${purged} stagiaires purgés définitivement.`);

    logger.info("✅ Maintenance terminée avec succès.");
  } catch (error) {
    logger.error("❌ Erreur lors de la maintenance :", error);
    process.exit(1);
  }
}

main();
