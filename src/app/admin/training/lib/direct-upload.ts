"use client";

import { validateDocumentUpload } from "./session-documents";

type FileMeta = { fileName: string; mimeType: string; size: number };

/**
 * Envoi direct navigateur → R2 en deux temps : URL présignée, PUT, puis
 * confirmation serveur (qui revérifie taille et signature).
 */
export async function directUpload<T>(
  file: File,
  create: (meta: FileMeta) => Promise<{ key: string; uploadUrl: string }>,
  confirm: (upload: {
    key: string;
    fileName: string;
    mimeType: string;
  }) => Promise<T>,
  validate: (file: {
    mimeType: string;
    size: number;
  }) => string | null = validateDocumentUpload
): Promise<T> {
  const error = validate({ mimeType: file.type, size: file.size });
  if (error) throw new Error(error);

  const { key, uploadUrl } = await create({
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  });

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    // Échec réseau avant toute réponse : connexion coupée, ou CORS du bucket
    throw new Error(
      "Envoi interrompu. Vérifiez votre connexion ; si le problème persiste, le stockage n'accepte pas encore les envois directs (CORS)."
    );
  }
  if (!response.ok) throw new Error("Le stockage a refusé le fichier");

  return confirm({ key, fileName: file.name, mimeType: file.type });
}
