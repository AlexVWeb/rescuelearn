"use server";

import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/context";
import { EmailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { UserRole, hasRole } from "@/lib/roles";
import {
  inviteMemberSchema,
  acceptInvitationSchema,
  InviteMemberInput,
  AcceptInvitationInput,
} from "@/lib/schemas/invitation.schema";

/**
 * Invite un nouveau membre ou rattache un utilisateur existant.
 */
export async function inviteMemberAction(input: InviteMemberInput) {
  const validated = inviteMemberSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Validation échouée",
    };
  }

  const { email, role, organismeId } = validated.data;
  const user = await getUserContext();

  // RBAC Check: Seul un admin de l'organisme ou un super-admin peut inviter
  const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
  const isOrgAdmin =
    hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
    user.organismeId === organismeId;

  if (!isSuperAdmin && !isOrgAdmin) {
    return {
      success: false,
      error:
        "Vous n'avez pas les droits pour inviter un membre à cet organisme.",
    };
  }

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.organismeId === organismeId) {
        return {
          success: false,
          error: "Cet utilisateur est déjà membre de cet organisme.",
        };
      }

      // On rattache l'utilisateur existant
      const memberRole = role === UserRole.ADMIN_ORGANISME ? "admin" : "member";
      const existingMember = await prisma.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: organismeId,
        },
      });

      if (!existingMember) {
        await prisma.member.create({
          data: {
            userId: existingUser.id,
            organizationId: organismeId,
            role: memberRole,
          },
        });
      } else if (existingMember.role !== memberRole) {
        await prisma.member.update({
          where: { id: existingMember.id },
          data: { role: memberRole },
        });
      }

      const currentRoles = (existingUser.roles as string[]) || [];
      const newRoles: string[] = [role];
      if (hasRole(currentRoles, UserRole.SUPER_ADMIN)) {
        newRoles.push(UserRole.SUPER_ADMIN);
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          organismeId,
          roles: newRoles,
        },
      });

      revalidatePath(`/admin/organismes/${organismeId}`);
      return {
        success: true,
        message: "Utilisateur existant rattaché à l'organisme.",
      };
    }

    // 2. Vérifier s'il y a déjà une invitation en cours
    const existingInvitation = await prisma.invitation.findFirst({
      where: { email, organizationId: organismeId, status: "pending" },
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return {
        success: false,
        error: "Une invitation est déjà en cours pour cet email.",
      };
    }

    // 3. Créer l'invitation
    if (isOrgAdmin) {
      // ADMIN_ORGANISME : déléguer à Better-Auth (gère DB + email via sendInvitationEmail)
      // Mapper nos rôles système vers les rôles Better-Auth org
      const orgRole: "admin" | "member" =
        role === UserRole.ADMIN_ORGANISME ? "admin" : "member";

      try {
        await auth.api.createInvitation({
          headers: await headers(),
          body: { email, role: orgRole, organizationId: organismeId },
        });
      } catch (err) {
        logger.error("Better-Auth createInvitation failed:", err);
        return {
          success: false,
          error: "Une erreur est survenue lors de l'invitation.",
        };
      }
    } else {
      // SUPER_ADMIN : chemin direct Prisma + email (pas forcément membre de l'org)
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.invitation.create({
        data: {
          email,
          role,
          organizationId: organismeId,
          token,
          expiresAt,
          inviterId: user.id,
        },
      });

      const organisme = await prisma.organisme.findUnique({
        where: { id: organismeId },
      });

      if (!organisme) return { success: false, error: "Organisme introuvable" };

      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitation/${token}`;

      await EmailService.sendInvitationEmail({
        to: email,
        organismeName: organisme.name,
        invitationUrl,
        smtp: {
          host: organisme.smtpHost,
          port: organisme.smtpPort,
          user: organisme.smtpUser,
          pass: organisme.smtpPassword,
          from: organisme.smtpFrom,
          secure: organisme.smtpSecure,
        },
      });
    }

    revalidatePath(`/admin/organismes/${organismeId}`);
    return { success: true, message: "Invitation envoyée avec succès." };
  } catch (error) {
    logger.error("Failed to invite member:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'invitation.",
    };
  }
}

/**
 * Récupère les détails d'une invitation via son token.
 */
export async function getInvitationAction(token: string) {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (
      !invitation ||
      invitation.expiresAt < new Date() ||
      invitation.status !== "pending"
    ) {
      return { success: false, error: "Invitation invalide ou expirée." };
    }

    return { success: true, data: invitation };
  } catch (error) {
    logger.error("Failed to get invitation:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'invitation.",
    };
  }
}

/**
 * Accepte une invitation et crée le compte utilisateur.
 */
export async function acceptInvitationAction(input: AcceptInvitationInput) {
  const validated = acceptInvitationSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Validation échouée",
    };
  }

  const { token, password, firstName, lastName } = validated.data;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      return { success: false, error: "Invitation invalide ou expirée." };
    }

    // Sécurité supplémentaire : vérifier si un compte a été créé entre temps
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Un compte existe déjà pour cet email. Veuillez vous connecter.",
      };
    }

    const hashedPassword = await hashPassword(password);

    // Création atomique (si possible, ici via transaction manuelle ou simple suite)
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        organismeId: invitation.organizationId,
        roles: [invitation.role],
        emailVerified: true,
      },
    });

    // Création du membre de l'organisation
    const finalMemberRole =
      invitation.role === UserRole.ADMIN_ORGANISME ||
      invitation.role === "admin"
        ? "admin"
        : "member";

    await prisma.member.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: finalMemberRole,
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

    // Nettoyage : supprimer l'invitation
    await prisma.invitation.delete({
      where: { id: invitation.id },
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to accept invitation:", error);
    return { success: false, error: "Erreur lors de la création du compte." };
  }
}

/**
 * Récupère les invitations en attente pour un organisme.
 */
export async function getPendingInvitationsAction(organismeId: string) {
  const user = await getUserContext();
  const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
  const isOrgAdmin =
    hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
    user.organismeId === organismeId;

  if (!isSuperAdmin && !isOrgAdmin) {
    return { success: false, error: "Non autorisé" };
  }

  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: organismeId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: invitations };
  } catch (error) {
    logger.error("Failed to get pending invitations:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des invitations.",
    };
  }
}

/**
 * Annule une invitation.
 */
export async function cancelInvitationAction(invitationId: string) {
  const user = await getUserContext();

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) return { success: false, error: "Invitation introuvable" };

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
    const isOrgAdmin =
      hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
      user.organismeId === invitation.organizationId;

    if (!isSuperAdmin && !isOrgAdmin) {
      return { success: false, error: "Non autorisé" };
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    revalidatePath(`/admin/organismes/${invitation.organizationId}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to cancel invitation:", error);
    return { success: false, error: "Erreur lors de l'annulation." };
  }
}

/**
 * Renvoie une invitation (génère un nouveau token et renvoie l'email).
 */
export async function resendInvitationAction(invitationId: string) {
  const user = await getUserContext();

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { organization: true },
    });

    if (!invitation) return { success: false, error: "Invitation introuvable" };

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);
    const isOrgAdmin =
      hasRole(user.roles, UserRole.ADMIN_ORGANISME) &&
      user.organismeId === invitation.organizationId;

    if (!isSuperAdmin && !isOrgAdmin) {
      return { success: false, error: "Non autorisé" };
    }

    // 1. Générer nouveau token et expiration
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token,
        expiresAt,
        createdAt: new Date(),
      },
    });

    // 2. Renvoyer l'email
    const { organization: organisme } = invitation;
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitation/${token}`;

    await EmailService.sendInvitationEmail({
      to: invitation.email,
      organismeName: organisme.name,
      invitationUrl,
      smtp: {
        host: organisme.smtpHost,
        port: organisme.smtpPort,
        user: organisme.smtpUser,
        pass: organisme.smtpPassword,
        from: organisme.smtpFrom,
        secure: organisme.smtpSecure,
      },
    });

    revalidatePath(`/admin/organismes/${invitation.organizationId}`);
    return { success: true, message: "Invitation renvoyée avec succès." };
  } catch (error) {
    logger.error("Failed to resend invitation:", error);
    return { success: false, error: "Erreur lors du renvoi de l'invitation." };
  }
}
