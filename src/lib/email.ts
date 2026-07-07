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
    // Priorité 1 : SMTP de l'organisme (si configuré avec un hôte)
    // Priorité 2 : SMTP global (via env vars)
    const hasOrganismeSmtp = !!organismeSmtp?.host;
    const smtpConfig = hasOrganismeSmtp ? organismeSmtp : undefined;

    const host = smtpConfig?.host || process.env.SMTP_HOST;
    const port = Number(smtpConfig?.port || process.env.SMTP_PORT || 587);
    const user = smtpConfig?.user || process.env.SMTP_USER;
    const pass = smtpConfig?.pass || process.env.SMTP_PASS;
    const from =
      smtpConfig?.from || process.env.SMTP_FROM || "noreply@rescuelearn.fr";
    const secure = smtpConfig?.secure ?? process.env.SMTP_SECURE === "true";

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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 580px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
        <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">RescueLearn</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">La plateforme des formateurs en secourisme</p>
        </div>
        <div style="padding: 40px 32px; background-color: #ffffff;">
          <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">Rejoignez votre organisme</h2>
          <p style="font-size: 15px; color: #4b5563;">Bonjour,</p>
          <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">
            Vous avez été invité à collaborer avec l'organisme :
          </p>
          
          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 4px 12px 12px 4px; margin-bottom: 28px;">
            <span style="font-size: 16px; font-weight: 700; color: #1f2937; display: block; word-break: break-word;">${organismeName}</span>
          </div>

          <p style="font-size: 15px; color: #4b5563; margin-bottom: 32px;">
            Pour accepter cette invitation et créer votre compte afin d'accéder à la plateforme, cliquez sur le bouton ci-dessous :
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${invitationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
              Accepter l'invitation
            </a>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 32px 0 24px 0;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 500;">
              ⚠️ Ce lien d'invitation est personnel et expirera dans <strong>7 jours</strong>.
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: left;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
              Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} RescueLearn. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    return this.send({ to, subject, text, html, smtp });
  },
  /**
   * Envoie un email de réinitialisation de mot de passe (Identité globale RescueLearn).
   */
  async sendPasswordResetEmail({
    to,
    resetUrl,
  }: {
    to: string;
    resetUrl: string;
  }) {
    const subject = "Réinitialisation de votre mot de passe - RescueLearn";
    const text = `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe RescueLearn.\n\nPour choisir un nouveau mot de passe, veuillez cliquer sur le lien suivant :\n${resetUrl}\n\nCe lien expirera dans 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.\n\nL'équipe RescueLearn`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">RescueLearn</h1>
        </div>
        <div style="padding: 40px 32px; background-color: #ffffff;">
          <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 600;">Réinitialisation de votre mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte <strong>RescueLearn</strong>.</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Réinitialiser mon mot de passe</a>
          </div>
          <p style="color: #4b5563; font-size: 14px;">Ce lien expirera dans 1 heure.</p>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 13px; margin: 0;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} RescueLearn. La plateforme des formateurs en secourisme.</p>
        </div>
      </div>
    `;

    return this.send({ to, subject, text, html });
  },
};
