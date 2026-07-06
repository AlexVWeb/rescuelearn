import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Slot, Inscription, EMARGEMENT_STATUS } from "../types";

const L = 14;
const R = 283;

export function generateEmargementPDF(
  session: { title: string; location?: string | null; type?: string },
  slots: Slot[],
  inscriptions: Inscription[]
) {
  const doc = new jsPDF("landscape");

  // ── Header box ─────────────────────────────────────────────────────────────
  doc.setLineWidth(0.5);
  doc.rect(L, 10, R - L, 18);

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("FEUILLE D'ÉMARGEMENT", (L + R) / 2, 21, { align: "center" });

  // ── Session info ───────────────────────────────────────────────────────────
  const infoY = 37;
  doc.setFontSize(10);

  doc.setFont("helvetica", "bold");
  doc.text("Formation : ", L, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(session.title, 35, infoY);

  doc.setFont("helvetica", "bold");
  doc.text("Lieu : ", 130, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(
    session.location || "Non spécifié",
    132 + doc.getTextWidth("Lieu : "),
    infoY
  );

  doc.setFont("helvetica", "bold");
  doc.text("Type : ", 230, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(session.type || "", 232 + doc.getTextWidth("Type : "), infoY);

  // ── Table ──────────────────────────────────────────────────────────────────
  const head = [
    [
      "Stagiaire",
      ...slots.map(
        (s) =>
          `${s.label}\n${dayjs(s.date).startOf("day").format("DD/MM/YYYY")}\n${s.startTime} - ${s.endTime}`
      ),
    ],
  ];

  const body = inscriptions.map((inscription) => {
    const row = [
      `${inscription.trainee?.lastName ?? ""} ${inscription.trainee?.firstName ?? ""}`.trim(),
    ];

    slots.forEach((slot) => {
      const emargement = inscription.emargements?.find(
        (e) => e.slotId === slot.id
      );
      if (emargement?.status === EMARGEMENT_STATUS.VALIDE) {
        row.push("Présent");
      } else if (emargement?.status === EMARGEMENT_STATUS.ABSENT) {
        row.push("Absent");
      } else {
        row.push("");
      }
    });

    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: 43,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
      font: "helvetica",
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left", cellWidth: 55 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: "grid",
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const val = data.cell.raw as string;
        if (val?.includes("Présent")) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = "bold";
        } else if (val?.includes("Absent")) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(`Emargement_${session.title.replace(/\s+/g, "_")}.pdf`);
}
