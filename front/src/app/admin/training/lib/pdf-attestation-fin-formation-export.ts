import dayjs from "dayjs";
import jsPDF from "jspdf";
import { Slot, Inscription } from "../types";

function slotDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

// Draw a square checkbox at position (cx, cy = text baseline).
// Uses doc.rect() instead of Unicode chars (☐/☑) which Helvetica doesn't support.
function drawCheckbox(doc: jsPDF, cx: number, cy: number, checked: boolean) {
  const size = 3.2;
  doc.setLineWidth(0.3);
  doc.rect(cx, cy - size + 0.3, size, size);
  if (checked) {
    doc.setLineWidth(0.4);
    doc.line(cx + 0.4, cy - size + 0.7, cx + size - 0.4, cy - 0.1);
    doc.line(cx + size - 0.4, cy - size + 0.7, cx + 0.4, cy - 0.1);
  }
  doc.setLineWidth(0.2);
}

function buildAttestationPage(
  doc: jsPDF,
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  },
  inscription: Inscription,
  formateur: { name: string | null }
): void {
  const x = 20;
  const rightMargin = 190; // right limit (210 - 20)

  // ── Title ──────────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ATTESTATION DE FIN DE FORMATION", 105, 25, { align: "center" });

  // ── Formateur ──────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const formateurPrefix = "Je soussigné(e), Mme, M ";
  doc.text(formateurPrefix, x, 45);
  const formateurPrefixW = doc.getTextWidth(formateurPrefix);
  doc.setFont("helvetica", "bold");
  doc.text(formateur.name || "Non renseigné", 22 + formateurPrefixW, 45);
  doc.setFont("helvetica", "normal");

  // ── Stagiaire ──────────────────────────────────────────────────────────────
  const traineePrefix = "Atteste que Mme / M ";
  doc.text(traineePrefix, x, 55);
  const traineeName =
    `${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`.trim();
  const traineePrefixW = doc.getTextWidth(traineePrefix);
  if (traineeName) {
    doc.setFont("helvetica", "bold");
    doc.text(traineeName, 22 + traineePrefixW, 55);
    doc.setFont("helvetica", "normal");
  }

  // ── "A suivi la formation suivante :" bold + underline ─────────────────────
  doc.setFont("helvetica", "bold");
  const suiviText = "A suivi la formation suivante :";
  doc.text(suiviText, x, 67);
  doc.setLineWidth(0.3);
  doc.line(x, 68.5, x + doc.getTextWidth(suiviText), 68.5);

  // ── Intitulé + Lieu ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  const intituleLabel = "Intitulé de la formation : ";
  doc.text(intituleLabel, 20, 77);
  doc.setFont("helvetica", "normal");
  doc.text(session.title, 25 + doc.getTextWidth(intituleLabel), 77);

  doc.setFont("helvetica", "bold");
  const lieuLabel = "Lieu: ";
  doc.text(lieuLabel, 130, 77);
  doc.setFont("helvetica", "normal");
  doc.text(session.location, 135 + doc.getTextWidth(lieuLabel), 77);

  // ── Date + Horaires ────────────────────────────────────────────────────────
  const formattedDate = session.startDate
    ? dayjs(session.startDate).format("DD/MM/YYYY")
    : "Non spécifiée";
  const sortedSlots = [...session.slots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const horaires =
    firstSlot && lastSlot
      ? `${firstSlot.startTime} - ${lastSlot.endTime}`
      : "Non spécifiés";

  doc.setFont("helvetica", "bold");
  doc.text("Date : ", x, 87);
  doc.setFont("helvetica", "normal");
  doc.text(formattedDate, x + doc.getTextWidth("Date : "), 87);

  doc.setFont("helvetica", "bold");
  doc.text("Horaires : ", 100, 87);
  doc.setFont("helvetica", "normal");
  doc.text(horaires, 101 + doc.getTextWidth("Horaires : "), 87);

  // ── Durée ──────────────────────────────────────────────────────────────────
  const totalHours =
    Math.round(
      session.slots.reduce(
        (sum, s) => sum + slotDurationHours(s.startTime, s.endTime),
        0
      ) * 10
    ) / 10;
  doc.setFont("helvetica", "normal");
  doc.text(`Soit une durée de ${totalHours} heures`, x, 98);

  // ── Nature de l'action ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.text(
    "Nature de l'action (article L 6313-1 du Code du travail) :",
    x,
    110
  );

  // Checkbox items — font size 10 to prevent overflow, drawn squares
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const cbX = x + 6; // checkbox left edge
  const cbTextX = cbX + 5; // text starts after the 3.2mm box + 1.8mm gap
  const cbItems = [
    "Action de préformation et de préparation à la vie professionnelle ;",
    "Action d'adaptation et de développement des compétences des salariés ;",
    "Action d'acquisition, d'entretien ou de perfectionnement des connaissances ;",
    "Action de prévention.",
  ];
  const cbYs = [118, 125, 132, 139];
  cbItems.forEach((item, i) => {
    drawCheckbox(doc, cbX, cbYs[i], false);
    // Truncate if text would overflow (safety net)
    const maxW = rightMargin - cbTextX;
    const lines = doc.splitTextToSize(item, maxW);
    doc.text(lines[0], cbTextX, cbYs[i]);
  });

  // ── Objectif(s) ────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  const objY = 151;
  doc.setFont("helvetica", "bold");
  const objLabel = "Objectif(s) de la formation : ";
  doc.text(objLabel, x, objY);
  const objLabelW = doc.getTextWidth(objLabel);
  const objTextX = x + objLabelW;
  const objAvailW = rightMargin - objTextX; // width left on first line

  doc.setFont("helvetica", "normal");
  const objFullText =
    "L'apprenant devra être capable d'acquérir les connaissances nécessaires à la bonne exécution des gestes destinés à préserver la vie et l'intégrité physique d'une victime en attendant l'arrivée des secours organisés";

  // Fit text in the remaining width of first line, then wrap indented
  const objLines = doc.splitTextToSize(objFullText, objAvailW);
  doc.text(objLines[0], objTextX, objY);
  for (let i = 1; i < objLines.length; i++) {
    doc.text(objLines[i], objTextX, objY + i * 6);
  }

  // ── Nature de la formation ─────────────────────────────────────────────────
  const natureY = objY + objLines.length * 6 + 5;
  doc.setFont("helvetica", "bold");
  const natureLabel = "Nature de la formation : ";
  doc.text(natureLabel, x, natureY);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Formation aux premiers secours de type présentiel",
    25 + doc.getTextWidth(natureLabel),
    natureY
  );

  // ── Résultats évaluation ───────────────────────────────────────────────────
  const resultY = natureY + 12;
  doc.setFont("helvetica", "bold");
  doc.text("Résultats de l'évaluation des acquis de la formation", x, resultY);

  // Acquis / Non Acquis — centered with drawn checkboxes
  const isAcquis = inscription.attestationResult === "acquis";
  const acqY = resultY + 9;
  const centerX = 75;
  drawCheckbox(doc, centerX, acqY, isAcquis);
  doc.setFont("helvetica", "normal");
  doc.text("Acquis", centerX + 5, acqY);
  drawCheckbox(doc, centerX + 35, acqY, !isAcquis);
  doc.text("Non Acquis", centerX + 40, acqY);

  // ── Fait à / Le ────────────────────────────────────────────────────────────
  const validatedAt = inscription.attestationValidatedAt
    ? dayjs(inscription.attestationValidatedAt).format("DD/MM/YYYY")
    : dayjs().format("DD/MM/YYYY");
  doc.setFont("helvetica", "normal");
  doc.text(`Fait à ${session.location}`, x, 245);
  doc.text(`Le, ${validatedAt}`, 130, 245);

  // ── Signature du Formateur ─────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.text("Signature du Formateur", 150, 260, { align: "center" });
}

export function generateAttestationPDF(
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  },
  inscription: Inscription,
  formateur: { name: string | null }
): void {
  const doc = new jsPDF("portrait", "mm", "a4");
  buildAttestationPage(doc, session, inscription, formateur);
  doc.save(
    `Attestation_${inscription.trainee?.lastName}_${inscription.trainee?.firstName}.pdf`
  );
}

export function generateAllAttestationsPDF(
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  },
  inscriptions: Inscription[],
  formateur: { name: string | null }
): void {
  const doc = new jsPDF("portrait", "mm", "a4");
  inscriptions.forEach((inscription, index) => {
    buildAttestationPage(doc, session, inscription, formateur);
    if (index < inscriptions.length - 1) {
      doc.addPage();
    }
  });
  doc.save(`Attestations_${session.title.replace(/\s+/g, "_")}.pdf`);
}
