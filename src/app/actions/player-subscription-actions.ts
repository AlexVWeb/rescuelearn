"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { z } from "zod";
import { EmailService } from "@/lib/email";
import { Question, QuestionOption } from "@prisma/client";

const subscriptionSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
});

export async function updateQuestionSubscriptionAction(values: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const parsed = subscriptionSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { enabled, frequency } = parsed.data;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        questionSubscriptionEnabled: enabled,
        questionSubscriptionFrequency: enabled ? (frequency ?? "daily") : null,
      },
    });

    logger.info(
      `Abonnement mis à jour pour l'utilisateur ${session.user.email} : ${enabled} (${frequency ?? "daily"})`
    );
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la mise à jour de l'abonnement :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function getPlayerSubscriptionStatusAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        questionSubscriptionEnabled: true,
        questionSubscriptionFrequency: true,
      },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable." };
    }

    return {
      success: true,
      data: {
        enabled: user.questionSubscriptionEnabled,
        frequency: user.questionSubscriptionFrequency || "daily",
      },
    };
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération du statut d'abonnement :",
      error
    );
    return { success: false, error: "Une erreur interne est survenue." };
  }
}

export async function testSendDailyQuizEmailAction() {
  if (process.env.NODE_ENV !== "development") {
    return {
      success: false,
      error: "Action autorisée uniquement en développement local.",
    };
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: "Non autorisé." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable." };
    }

    // Determine onboarding level
    let levelNamePattern = "Niveau 1";
    if (user.onboardingExperience === "intermediate") {
      levelNamePattern = "Niveau 3";
    } else if (user.onboardingExperience === "professional") {
      levelNamePattern = "Niveau 4";
    }

    const levels = await prisma.levelQuestion.findMany({
      where: {
        name: {
          contains: levelNamePattern,
          mode: "insensitive",
        },
      },
      include: {
        quizzes: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    let candidateQuestions: (Question & { options: QuestionOption[] })[] = [];
    for (const lvl of levels) {
      for (const quiz of lvl.quizzes) {
        candidateQuestions = candidateQuestions.concat(quiz.questions);
      }
    }

    if (candidateQuestions.length === 0) {
      candidateQuestions = await prisma.question.findMany({
        include: {
          options: true,
        },
      });
    }

    if (candidateQuestions.length === 0) {
      return {
        success: false,
        error: "Aucune question trouvée dans la base de données.",
      };
    }

    const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
    const question = candidateQuestions[randomIndex];

    const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const dailyQuestionUrl = `${domain}/player?dailyQuestionId=${question.id}`;

    const optionsHtml =
      question.options && question.options.length > 0
        ? `<div style="margin-top: 15px; margin-bottom: 25px;">
          ${question.options
            .map(
              (opt: QuestionOption, idx: number) => `
            <a href="${domain}/player?dailyQuestionId=${question.id}&selectOption=${idx}" style="text-decoration: none; display: block; margin-bottom: 8px;">
              <div style="padding: 12px 16px; background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; font-weight: bold; color: #334155; font-size: 15px; text-align: left;">
                ${opt.text}
              </div>
            </a>
          `
            )
            .join("")}
         </div>`
        : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test - Ton défi RescueLearn</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 20px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 40px 20px; text-align: center;">
                  <td style="padding: 30px 20px; text-align: center;">
                    <img src="${domain}/icon.png" alt="RescueLearn" style="width: 64px; height: 64px; border-radius: 16px; margin-bottom: 12px; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.15);" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">[TEST] Défi Secourisme</h1>
                    <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Test d'envoi en local</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 30px 20px 30px;">
                    <p style="font-size: 16px; color: #1e293b; font-weight: bold; margin-top: 0;">Bonjour ${user.name || "secouriste"},</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 25px;">Ceci est un email de test pour valider l'affichage du défi périodique :</p>
                    
                    <!-- Question Box -->
                    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                      <span style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">Question</span>
                      <p style="font-size: 16px; color: #1e293b; font-weight: 800; margin: 8px 0 0 0; line-height: 1.4;">${question.text}</p>
                    </div>

                    ${optionsHtml}

                    <!-- CTA Button -->
                    <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
                      <a href="${dailyQuestionUrl}" style="background-color: #2563eb; color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);">
                        Répondre sur RescueLearn
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await EmailService.send({
      to: user.email,
      subject: `🚑 [TEST] Défi Secourisme - Garde tes réflexes actifs !`,
      text: `Question de secourisme : ${question.text}\nRéponds sur ${dailyQuestionUrl}`,
      html: emailHtml,
    });

    logger.info(`E-mail de test envoyé avec succès à ${user.email}`);
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de l'envoi de l'e-mail de test :", error);
    return { success: false, error: "Une erreur interne est survenue." };
  }
}
