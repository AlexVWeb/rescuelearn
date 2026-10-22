import type { ReactElement } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";

/**
 * Génère le PDF à la demande puis déclenche son téléchargement.
 * Contrairement à `PDFDownloadLink`, rien n'est rendu tant que l'utilisateur
 * ne clique pas, ce qui évite de régénérer le PDF à chaque rendu React.
 */
export async function downloadPdfDocument(
  doc: ReactElement<DocumentProps>,
  fileName: string
) {
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
