import { RetentionService } from "../lib/retention-service";

async function main() {
  console.log("🚀 Démarrage de la maintenance des données...");

  try {
    // 1. Alertes
    const emailsSent = await RetentionService.sendRetentionAlerts();
    console.log(`📢 ${emailsSent} organismes alertés par email.`);

    // 2. Anonymisation (Base Active -> Archive)
    const anonymized = await RetentionService.anonymizeInactiveTrainees();
    console.log(`👤 ${anonymized} stagiaires anonymisés.`);

    // 3. Purge définitive (Archive -> Suppression)
    const purged = await RetentionService.purgeExpiredTrainees();
    console.log(`🗑️ ${purged} stagiaires purgés définitivement.`);

    console.log("✅ Maintenance terminée avec succès.");
  } catch (error) {
    console.error("❌ Erreur lors de la maintenance :", error);
    process.exit(1);
  }
}

main();
