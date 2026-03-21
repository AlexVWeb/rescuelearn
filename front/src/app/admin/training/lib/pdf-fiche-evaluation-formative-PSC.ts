import dayjs from "dayjs";
import jsPDF from "jspdf";
import { Slot, Inscription } from "../types";

const LOGO_CB_BASE64 =
  "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";
// ── Layout constants ───────────────────────────────────────────────────────────
const L = 15; // left margin
const R = 195; // right margin

// Table columns
const COL_OUI = 100;
const COL_NON = 115;
const COL_OBS = 130;

// ── Helpers ───────────────────────────────────────────────────────────────────
function drawCheckbox(doc: jsPDF, cx: number, cy: number, checked = false) {
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

// ── Data Structure en Blocs ───────────────────────────────────────────────────
type TableBlock = {
  title: string;
  items?: string[];
};

const TABLE_BLOCKS: TableBlock[] = [
  {
    title: "Le candidat est présent tout au long de la formation",
  },
  {
    title: "Protection adaptée",
    items: ["- Identifie le danger", "- Action de protection efficace"],
  },
  {
    title: "Secourir",
    items: [
      "- Identifie les signes",
      "- Gestes conformes aux recommandations PSC 1",
      "- CAT conforme aux recommandations PSC 1",
    ],
  },
  {
    title: "Alerter ou faire Alerter",
    items: [
      "- Transmet les informations",
      "- Répond aux questions posées par les services de secours",
      "- Applique les consignes données",
    ],
  },
  {
    title: "Surveillance",
    items: [
      "- Adaptée à l'état de la victime et jusqu'à l'arrivée des secours",
      "- Protéger de la chaleur, du froid ou des intempéries",
    ],
  },
  {
    title: "Prévention",
    items: [
      "- Identifie le danger",
      "- Propose une action de prévention adaptée",
    ],
  },
];

// ── Page builder ───────────────────────────────────────────────────────────────
function buildFicheEvaluationPage(
  doc: jsPDF,
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
    isFC?: boolean;
  },
  inscription: Inscription,
  formateur: { name: string | null },
  organismeLogoBase64?: string | null
): void {
  const traineeName =
    `${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`.trim();
  const formattedDate = session.startDate
    ? dayjs(session.startDate).format("DD/MM/YYYY")
    : "";
  const isFC = session.isFC ?? false;

  // ── Reference number ───────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("7.2", R, 13, { align: "right" });

  // ── Title ──────────────────────────────────────────────────────────────────
  doc.setLineWidth(0.3);
  doc.rect(L, 10, R - L, 16);

  const logoData =
    organismeLogoBase64 ??
    (LOGO_CB_BASE64 ? "data:image/png;base64," + LOGO_CB_BASE64 : null);
  if (logoData) {
    doc.addImage(logoData, "PNG", L + 2, 12, 32, 10);
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FORMATION EN PREMIERS SECOURS CITOYEN", 105, 19, {
    align: "center",
  });

  doc.setFontSize(14);
  doc.text("FICHE D'EVALUATION FORMATIVE PSC", 105, 30.5, {
    align: "center",
    baseline: "middle",
  });
  doc.rect(L, 10, R - L, 25);

  // ── Formation type checkboxes ──────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const cbY = 39;
  drawCheckbox(doc, 48, cbY, !isFC);
  doc.text("Formation initiale", 53, cbY);
  drawCheckbox(doc, 115, cbY, isFC);
  doc.text("Formation continue", 120, cbY);

  // ── Date + Lieu ────────────────────────────────────────────────────────────
  const infoY = 50;
  doc.setFont("helvetica", "bold");
  doc.text("DATE : ", L, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(formattedDate, L + doc.getTextWidth("DATE : "), infoY);

  doc.setFont("helvetica", "bold");
  doc.text("LIEU : ", 110, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(session.location, 110 + doc.getTextWidth("LIEU : "), infoY);

  // ── Participant & Formateur ────────────────────────────────────────────────
  const partY = 60;
  doc.setFont("helvetica", "bold");
  doc.text("Nom-prénom participant(e) : ", L, partY);
  doc.setFont("helvetica", "normal");
  doc.text(
    traineeName,
    19 + doc.getTextWidth("Nom-prénom participant(e) : "),
    partY
  );
  doc.setLineWidth(0.2);
  doc.line(
    L + doc.getTextWidth("Nom-prénom participant(e) : "),
    partY + 1,
    R,
    partY + 1
  );

  const formY = 70;
  doc.setFont("helvetica", "bold");
  doc.text("Nom-prénom formateur : ", L, formY);
  doc.setFont("helvetica", "normal");
  doc.text(
    formateur.name ?? "",
    19 + doc.getTextWidth("Nom-prénom formateur : "),
    formY
  );
  doc.line(
    L + doc.getTextWidth("Nom-prénom formateur : "),
    formY + 1,
    R,
    formY + 1
  );

  const themeY = 80;
  doc.setFont("helvetica", "bold");
  doc.text("THEME de la mise en situation : ", L, themeY);
  doc.setFont("helvetica", "normal");
  doc.line(
    L + doc.getTextWidth("THEME de la mise en situation : "),
    themeY + 1,
    R,
    themeY + 1
  );

  // ── Table ──────────────────────────────────────────────────────────────────
  const tStartY = 87;
  const headerH = 8;
  const subHeaderH = 6;
  const dataStartY = tStartY + headerH + subHeaderH;

  // Lignes horizontales de l'en-tête
  doc.setLineWidth(0.2);
  // Ligne de séparation Critères/Fait (s'arrête avant Observations)
  doc.line(L, tStartY + headerH, COL_OBS, tStartY + headerH);
  // Ligne de séparation En-tête/Données (traverse tout le tableau)
  doc.line(L, dataStartY, R, dataStartY);

  // Textes de l'en-tête (Centrage vertical avec baseline "middle")
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  doc.text("Critères", (L + COL_OUI) / 2, tStartY + headerH / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.text("Fait", (COL_OUI + COL_OBS) / 2, tStartY + headerH / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.text(
    "Observations",
    (COL_OBS + R) / 2,
    tStartY + (headerH + subHeaderH) / 2,
    { align: "center", baseline: "middle" }
  );

  doc.text("Oui", (COL_OUI + COL_NON) / 2, tStartY + headerH + subHeaderH / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.text("Non", (COL_NON + COL_OBS) / 2, tStartY + headerH + subHeaderH / 2, {
    align: "center",
    baseline: "middle",
  });

  // Rendu des lignes de données (Blocs)
  let curY = dataStartY;
  const maxCriteriaW = COL_OUI - L - 4;

  for (const block of TABLE_BLOCKS) {
    let textY = curY + 5.5; // Padding supérieur interne au bloc

    // Titre du bloc
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(
      block.title,
      maxCriteriaW
    ) as string[];
    titleLines.forEach((line) => {
      doc.text(line, L + 2, textY);
      textY += 4.5;
    });

    // Sous-éléments (s'il y en a)
    if (block.items && block.items.length > 0) {
      doc.setFont("helvetica", "normal");
      block.items.forEach((item) => {
        const itemLines = doc.splitTextToSize(
          item,
          maxCriteriaW - 4
        ) as string[];
        itemLines.forEach((line) => {
          doc.text(line, L + 6, textY); // Légère indentation
          textY += 4.5;
        });
      });
    }

    curY = textY + 1.5; // Ajout d'un padding inférieur avant la ligne de séparation

    // Ligne de séparation horizontale (S'ARRÊTE A LA COLONNE OBSERVATIONS)
    doc.setLineWidth(0.2);
    doc.line(L, curY, COL_OBS, curY);
  }

  const tableBottomY = curY;

  // Traçage des grandes lignes verticales et de la bordure extérieure
  doc.setLineWidth(0.3); // Bordure extérieure plus épaisse
  doc.rect(L, tStartY, R - L, tableBottomY - tStartY);

  doc.setLineWidth(0.2); // Lignes intérieures plus fines
  // Ligne entre Critères et Oui
  doc.line(COL_OUI, tStartY, COL_OUI, tableBottomY);
  // Ligne entre Oui et Non (Commence sous "Fait")
  doc.line(COL_NON, tStartY + headerH, COL_NON, tableBottomY);
  // Ligne entre Fait et Observations (Sépare la grande colonne vide)
  doc.line(COL_OBS, tStartY, COL_OBS, tableBottomY);

  // ── Signatures ─────────────────────────────────────────────────────────────
  const sigY = curY + 10;
  const sigH = 30;

  doc.setLineWidth(0.3);
  doc.rect(L, sigY, R - L, sigH);
  doc.line((L + R) / 2, sigY, (L + R) / 2, sigY + sigH);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Signature du formateur", L + (R - L) / 4, sigY + 6, {
    align: "center",
  });
  doc.text("Signature du participant", L + (3 * (R - L)) / 4, sigY + 6, {
    align: "center",
  });
}
// ── Public exports ─────────────────────────────────────────────────────────────
export function generateFicheEvaluationPDF(
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
    isFC?: boolean;
  },
  inscription: Inscription,
  formateur: { name: string | null },
  organismeLogoBase64?: string | null
): void {
  const doc = new jsPDF("portrait", "mm", "a4");
  buildFicheEvaluationPage(
    doc,
    session,
    inscription,
    formateur,
    organismeLogoBase64
  );
  doc.save(
    `FicheEvaluation_${inscription.trainee?.lastName}_${inscription.trainee?.firstName}.pdf`
  );
}

export function generateAllFichesEvaluationPDF(
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
    isFC?: boolean;
  },
  inscriptions: Inscription[],
  formateur: { name: string | null },
  organismeLogoBase64?: string | null
): void {
  const doc = new jsPDF("portrait", "mm", "a4");
  inscriptions.forEach((inscription, index) => {
    buildFicheEvaluationPage(
      doc,
      session,
      inscription,
      formateur,
      organismeLogoBase64
    );
    if (index < inscriptions.length - 1) {
      doc.addPage();
    }
  });
  doc.save(`FichesEvaluation_${session.title.replace(/\s+/g, "_")}.pdf`);
}
