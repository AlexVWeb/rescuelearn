import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EmailService } from "@/lib/email";
import { Question, QuestionOption } from "@prisma/client";

type QuestionWithOptions = Question & {
  options: QuestionOption[];
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    logger.warn(
      "Tentative non autorisée d'accès au cron d'envoi de questions quotidiennes"
    );
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Fetch users subscribed
    const users = await prisma.user.findMany({
      where: {
        questionSubscriptionEnabled: true,
      },
    });

    const sentCount = { daily: 0, weekly: 0, monthly: 0, total: 0 };

    for (const user of users) {
      // Check lastQuestionSentAt for frequencies
      if (user.lastQuestionSentAt) {
        const lastSent = new Date(user.lastQuestionSentAt);
        const diffMs = now.getTime() - lastSent.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (user.questionSubscriptionFrequency === "daily" && diffDays < 0.9) {
          continue;
        }
        if (user.questionSubscriptionFrequency === "weekly" && diffDays < 6.9) {
          continue;
        }
        if (
          user.questionSubscriptionFrequency === "monthly" &&
          diffDays < 27.9
        ) {
          continue;
        }
      }

      // Determine their onboarding level
      // We will look for LevelQuestions or Quizzes that match user onboardingExperience or onboardingObjective/Expectation
      // Let's check LevelQuestion matching the onboardingExperience:
      // "beginner" -> "Niveau 1" or level id 1
      // "intermediate" -> level id 3
      // "professional" -> level id 4
      let levelNamePattern = "Niveau 1";
      if (user.onboardingExperience === "intermediate") {
        levelNamePattern = "Niveau 3";
      } else if (user.onboardingExperience === "professional") {
        levelNamePattern = "Niveau 4";
      }

      // Let's query matching LevelQuestions or just all quizzes if none matches
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

      // Gather all questions
      let candidateQuestions: QuestionWithOptions[] = [];
      for (const lvl of levels) {
        for (const quiz of lvl.quizzes) {
          candidateQuestions = candidateQuestions.concat(quiz.questions);
        }
      }

      // If no questions found for specific level, fallback to any question in the database
      if (candidateQuestions.length === 0) {
        candidateQuestions = await prisma.question.findMany({
          include: {
            options: true,
            quiz: true,
          },
        });
      }

      if (candidateQuestions.length === 0) {
        continue;
      }

      // Pick a random question
      const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
      const question = candidateQuestions[randomIndex];

      // Formulate a beautiful email with logo / image
      // Let's use the local hostname or production domain for redirect links
      const domain =
        process.env.NEXT_PUBLIC_APP_URL || "https://rescuelearn.fr";
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
          <title>Ton défi RescueLearn</title>
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
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Défi Secourisme du Jour</h1>
                      <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Garde les bons réflexes pour sauver des vies !</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 30px 20px 30px;">
                      <p style="font-size: 16px; color: #1e293b; font-weight: bold; margin-top: 0;">Bonjour ${user.name || "secouriste"},</p>
                      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 25px;">Voici ta question personnalisée du jour basée sur ton profil d'entraînement :</p>
                      
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
                      
                      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        Tu reçois cet e-mail car tu es abonné aux défis périodiques sur ton espace personnel RescueLearn.<br/>
                        Pour modifier tes préférences ou te désabonner, rends-toi sur ton <a href="${dailyQuestionUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Tableau de bord</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr style="background-color: #f8fafc; text-align: center;">
                    <td style="padding: 20px; font-size: 11px; color: #64748b; font-weight: 600;">
                      &copy; ${new Date().getFullYear()} RescueLearn. Tous droits réservés.
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
        subject: `🚑 Défi Secourisme - Garde tes réflexes actifs !`,
        text: `Question de secourisme : ${question.text}\nRéponds sur ${dailyQuestionUrl}`,
        html: emailHtml,
      });

      // Update lastQuestionSentAt
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastQuestionSentAt: now,
        },
      });

      const freq = user.questionSubscriptionFrequency || "daily";
      sentCount[freq as keyof typeof sentCount] += 1;
      sentCount.total += 1;
    }

    logger.info(
      `Cron de questions quotidiennes complété : ${sentCount.total} emails envoyés (${sentCount.daily} quotidiens, ${sentCount.weekly} hebdomadaires, ${sentCount.monthly} mensuels).`
    );

    return NextResponse.json({
      success: true,
      sentCount,
    });
  } catch (error) {
    logger.error(
      "Le cron d'envoi des questions quotidiennes a échoué :",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to dispatch daily questions" },
      { status: 500 }
    );
  }
}
