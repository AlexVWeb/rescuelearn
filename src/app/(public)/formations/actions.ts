"use server";

import { z } from "zod";
import { EmailService } from "@/lib/email";
import { logger } from "@/lib/logger";

const contactFormSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  company: z
    .string()
    .min(2, "Le nom de l'organisme doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(6, "Le numéro de téléphone est invalide"),
  message: z.string().optional(),
  website: z.string().optional(), // Honeypot field
});

export async function sendDemoRequestAction(data: unknown) {
  try {
    const validatedData = contactFormSchema.parse(data);

    // Honeypot validation: if website is filled, discard request silently as spam
    if (validatedData.website) {
      logger.warn("Spam detected via honeypot field", {
        company: validatedData.company,
      });
      return { success: true, method: "honeypot" };
    }

    const subject = `Demande de démo RescueLearn - ${validatedData.company}`;
    const text = `
Nouvelle demande de démo pour RescueLearn (Espace Organismes) :

Nom : ${validatedData.name}
Organisme : ${validatedData.company}
Email : ${validatedData.email}
Téléphone : ${validatedData.phone}
Message : ${validatedData.message || "Aucun message supplémentaire"}
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Demande de démo RescueLearn</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #2563eb; padding: 32px 40px; text-align: left;">
                    <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">RescueLearn</span>
                    <div style="font-size: 13px; font-weight: 500; color: #93c5fd; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Espace Organismes</div>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                      Nouvelle demande de démonstration
                    </h1>
                    <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      Un organisme s'intéresse à la partie Formation de RescueLearn. Voici les détails saisis :
                    </p>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px; border-collapse: separate; border-spacing: 0;">
                      <tr>
                        <td style="padding: 12px 16px; width: 35%; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">Nom complet</td>
                        <td style="padding: 12px 16px; font-size: 15px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${validatedData.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">Organisme</td>
                        <td style="padding: 12px 16px; font-size: 15px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${validatedData.company}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">Adresse email</td>
                        <td style="padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${validatedData.email}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${validatedData.email}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">Téléphone</td>
                        <td style="padding: 12px 16px; font-size: 15px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${validatedData.phone}</td>
                      </tr>
                    </table>

                    <h2 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Message d'accompagnement :</h2>
                    <div style="padding: 20px; background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px 12px 12px 4px; font-size: 15px; line-height: 1.6; color: #334155; font-style: italic;">
                      ${validatedData.message ? validatedData.message.replace(/\n/g, "<br>") : "<em>Aucun message supplémentaire</em>"}
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f1f5f9; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      Cet e-mail automatique a été envoyé depuis le formulaire de contact de <a href="https://rescuelearn.fr" style="color: #475569; text-decoration: underline; font-weight: 500;">RescueLearn</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const recipient = process.env.SMTP_FROM || "contact@rescuelearn.fr";

    logger.info("Sending demo request email notification", {
      from: validatedData.email,
      to: recipient,
      company: validatedData.company,
    });

    const result = await EmailService.send({
      to: recipient,
      subject,
      text,
      html,
    });

    return { success: true, method: result.method };
  } catch (error) {
    logger.error("Failed to send demo request email", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Données invalides",
        issues: error.flatten().fieldErrors,
      };
    }
    return {
      success: false,
      error: "Une erreur est survenue lors de l'envoi.",
    };
  }
}
