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

    // 2. Vérification de l'autorisation sur le fichier
    // Format attendu du stockage : {mode}/organisme/{organismeId}/{type}/{filename}
    const keyParts = key.split("/");
    const organismeIdInKey = keyParts[2];

    const isSuperAdmin = hasRole(user.roles, UserRole.SUPER_ADMIN);

    if (!isSuperAdmin && organismeIdInKey !== user.organismeId) {
      console.warn(
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
    console.error("Erreur lors du téléchargement du document:", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
