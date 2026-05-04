import nodemailer from "nodemailer";
import { logger } from "./logger";

/**
 * Configuration SMTP pour un organisme.
 */
export interface SMTPConfig {
  host?: string | null;
  port?: number | null;
  user?: string | null;
  pass?: string | null;
  from?: string | null;
  secure?: boolean | null;
}

/**
 * Service d'envoi d'emails.
 * Supporte l'envoi via SMTP configuré ou console en fallback.
 */
export const EmailService = {
  async send({
    to,
    subject,
    text,
    html,
    smtp: organismeSmtp,
  }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    smtp?: SMTPConfig;
  }) {
    // Priorité 1 : SMTP de l'organisme (si configuré)
    // Priorité 2 : SMTP global (via env vars)
    const host = organismeSmtp?.host || process.env.SMTP_HOST;
    const port = Number(organismeSmtp?.port || process.env.SMTP_PORT || 587);
    const user = organismeSmtp?.user || process.env.SMTP_USER;
    const pass = organismeSmtp?.pass || process.env.SMTP_PASS;
    const from =
      organismeSmtp?.from || process.env.SMTP_FROM || "noreply@rescuelearn.fr";
    const secure = organismeSmtp?.secure ?? process.env.SMTP_SECURE === "true";

    if (host) {
      try {
        interface TransportOptions {
          host: string;
          port: number;
          secure: boolean;
          auth?: {
            user: string;
            pass: string;
          };
        }

        const transportConfig: TransportOptions = {
          host,
          port,
          secure,
        };

        // Auth uniquement si user/pass sont fournis (Mailpit n'en a pas besoin par défaut)
        if (user && pass) {
          transportConfig.auth = { user, pass };
        }

        const transporter = nodemailer.createTransport(transportConfig);

        await transporter.sendMail({
          from,
          to,
          subject,
          text,
          html: html || text.replace(/\n/g, "<br>"),
        });

        return { success: true, method: "smtp" };
      } catch (error) {
        logger.error("❌ Erreur SMTP :", error);
        // On continue vers le fallback console si le SMTP échoue en dev
      }
    }

    // Fallback Console (Dev / Non configuré)
    logger.info("--- SIMULATION EMAIL (Fallback) ---");
    logger.info("Email Details", { to, subject, text });

    return { success: true, method: "console" };
  },

  /**
   * Envoie un email d'invitation à un nouveau membre.
   */
  async sendInvitationEmail({
    to,
    organismeName,
    invitationUrl,
    smtp,
  }: {
    to: string;
    organismeName: string;
    invitationUrl: string;
    smtp?: SMTPConfig;
  }) {
    const subject = `Invitation à rejoindre ${organismeName} - RescueLearn`;
    const text = `Bonjour,\n\nVous avez été invité à rejoindre l'organisme ${organismeName} sur RescueLearn en tant que membre.\n\nPour accepter cette invitation et créer votre compte, veuillez cliquer sur le lien suivant :\n${invitationUrl}\n\nCe lien expirera dans 7 jours.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\nL'équipe RescueLearn`;

    const html = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <h2>Invitation à rejoindre ${organismeName}</h2>
        <p>Bonjour,</p>
        <p>Vous avez été invité à rejoindre l'organisme <strong>${organismeName}</strong> sur RescueLearn en tant que membre.</p>
        <p>Pour accepter cette invitation et créer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
        <div style="margin: 20px 0;">
          <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accepter l'invitation</a>
        </div>
        <p>Ce lien expirera dans 7 jours.</p>
        <p style="color: #666; font-size: 0.9em;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>L'équipe RescueLearn</p>
      </div>
    `;

    return this.send({ to, subject, text, html, smtp });
  },
};
