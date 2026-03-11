import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Slot, Inscription } from "../types";

export function generateEmargementPDF(
  session: { title: string; location?: string | null; type?: string },
  slots: Slot[],
  inscriptions: Inscription[]
) {
  const doc = new jsPDF("landscape");

  // Header
  doc.setFontSize(18);
  doc.text(`Feuille d'émargement: ${session.title}`, 14, 20);

  doc.setFontSize(12);
  doc.text(
    `Lieu: ${session.location || "Non spécifié"} / Type: ${session.type}`,
    14,
    28
  );

  // Prepare table headers
  const head = [
    [
      "Stagiaire",
      ...slots.map(
        (s) =>
          `${s.label}\n${new Date(s.date).toLocaleDateString("fr-FR")}\n${s.startTime} - ${s.endTime}`
      ),
    ],
  ];

  // Prepare table body
  const body = inscriptions.map((inscription) => {
    const row = [
      `${inscription.trainee?.firstName} ${inscription.trainee?.lastName}`,
    ];

    slots.forEach((slot) => {
      const emargement = inscription.emargements?.find(
        (e) => e.slotId === slot.id
      );
      if (emargement?.status === "validé") {
        row.push("Présent");
      } else if (emargement?.status === "absent") {
        row.push("Absent");
      } else {
        row.push(""); // Empty box for signature if printed
      }
    });

    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: 35,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      halign: "center",
      valign: "middle",
    },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: { 0: { fontStyle: "bold", halign: "left" } },
    theme: "grid",
  });

  doc.save(`Emargement_${session.title.replace(/\s+/g, "_")}.pdf`);
}
