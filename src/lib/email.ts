import nodemailer from "nodemailer";

/**
 * Configuration SMTP pour un organisme.
 */
export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
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
    smtp,
  }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    smtp?: SMTPConfig;
  }) {
    if (smtp && smtp.host && smtp.user && smtp.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure ?? true,
          auth: {
            user: smtp.user,
            pass: smtp.pass,
          },
        });

        await transporter.sendMail({
          from: smtp.from || smtp.user,
          to,
          subject,
          text,
          html: html || text.replace(/\n/g, "<br>"),
        });

        return { success: true, method: "smtp" };
      } catch (error) {
        console.error("❌ Erreur SMTP :", error);
        // Fallback console en cas d'erreur SMTP pour ne pas perdre la trace ?
      }
    }

    // Fallback Console (Dev / Non configuré)
    console.log("--- SIMULATION EMAIL (Fallback) ---");
    console.log(`À : ${to}`);
    console.log(`Sujet : ${subject}`);
    console.log(`Contenu : ${text}`);
    console.log("------------------------------------");

    return { success: true, method: "console" };
  },
};
