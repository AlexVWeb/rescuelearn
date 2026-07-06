import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireOrganisme } from "@/lib/context";
import { getFile } from "@/lib/r2";
import { hasRole, UserRole } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 1. Vérification de l'authentification et de l'organisme
    const user = await requireOrganisme();
    const resolvedParams = await params;
    const key = resolvedParams.path.join("/");

    // Format attendu : {dev|prod}/organisme/{uuid}/{documents|external-trainings}/{filename}
    const PATH_REGEX =
      /^(dev|prod)\/organisme\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(documents|external-trainings)\/.+$/;
    if (!PATH_REGEX.test(key)) {
      logger.warn(
        `Chemin invalide rejeté pour l'utilisateur ${user.id}: ${key}`
      );
      return new NextResponse("Chemin invalide", { status: 400 });
    }

    const keyParts = key.split("/");
    const organismeIdInKey = keyParts[2];

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    if (!isSuperAdmin && organismeIdInKey !== user.organismeId) {
      logger.warn(
        `Accès refusé pour l'utilisateur ${user.id} sur le fichier ${key}`
      );
      return new NextResponse("Accès refusé", { status: 403 });
    }

    // 3. Téléchargement et déchiffrement
    // On déchiffre seulement si c'est un certificat (external-trainings)
    const isExternalTraining = keyParts[3] === "external-trainings";
    const { buffer, contentType } = await getFile(key, isExternalTraining);

    // 4. Retour du fichier
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    logger.error("Erreur lors du téléchargement du document:", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
