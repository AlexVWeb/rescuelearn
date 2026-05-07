import { logger } from "@/lib/logger";
import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import { hashPassword } from "better-auth/crypto";
import { UserRole } from "../src/lib/roles";

const prisma = new PrismaClient();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Remplace l'output pour masquer la saisie (API interne non exposée dans les types)
    const rlInternal = rl as unknown as {
      stdoutMuted: boolean;
      _writeToOutput: (str: string) => void;
    };
    rlInternal.stdoutMuted = true;
    rlInternal._writeToOutput = (str: string) => {
      if (rlInternal.stdoutMuted && str.trim()) {
        process.stdout.write("*");
      } else {
        process.stdout.write(str);
      }
    };

    rl.question(question, (answer) => {
      process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  logger.info("🚀 Seed RescueLearn - Création du SUPER_ADMIN\n");

  const email = await prompt("📧 Email du SUPER_ADMIN : ");
  const name = await prompt("👤 Nom complet : ");
  const password = await promptHidden("🔒 Mot de passe : ");
  const confirmPassword = await promptHidden("🔒 Confirmer le mot de passe : ");

  if (password !== confirmPassword) {
    logger.error("\n❌ Les mots de passe ne correspondent pas.");
    process.exit(1);
  }

  if (password.length < 8) {
    logger.error("\n❌ Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  logger.info("\n⏳ Création en cours...\n");

  const hashedPassword = await hashPassword(password);

  const organisme = await prisma.organisme.create({
    data: {
      name: "Administration RescueLearn",
      slug: "administration-rescuelearn",
      agreementNumber: "ADMIN-001",
      siret: "12345678910121",
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      emailVerified: true,
      roles: [UserRole.FORMATEUR, UserRole.SUPER_ADMIN],
      organismeId: organisme.id,
    },
  });

  await prisma.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    },
  });

  logger.info("=============================================");
  logger.info("✅ SUPER_ADMIN créé avec succès !\n");
  logger.info(`🏢 Organisme  : ${organisme.name}`);
  logger.info(`🔑 Invite code: ${organisme.inviteCode}`);
  logger.info(`👤 Utilisateur: ${user.name}`);
  logger.info(`📧 Email      : ${user.email}`);
  logger.info(`🎭 Rôles      : ${(user.roles as string[]).join(", ")}`);
  logger.info("=============================================");
  logger.info("\n➡️  Connectez-vous sur http://localhost:3000/login");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    logger.error("❌ Erreur lors du seed :", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
