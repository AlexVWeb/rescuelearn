export type AccessStatus =
  "opened" | "sent" | "link_created" | "no_email" | "not_sent";

/**
 * État du lien vers l'espace stagiaire, du plus avancé au moins avancé.
 * Un lien révoqué redevient « non envoyé » : il faut en renvoyer un.
 */
export function getAccessStatus(inscription: {
  hasAccessLink?: boolean;
  accessSentAt?: Date | null;
  accessLastUsedAt?: Date | null;
  trainee?: { email?: string | null } | null;
}): AccessStatus {
  if (inscription.hasAccessLink) {
    if (inscription.accessLastUsedAt) return "opened";
    if (inscription.accessSentAt) return "sent";
  }
  if (!inscription.trainee?.email) return "no_email";
  return inscription.hasAccessLink ? "link_created" : "not_sent";
}
