import React from "react";
import {
  Document,
  Page,
  Text,
  Image,
  Svg,
  G,
  Rect,
  Line,
  renderToBuffer,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import { SLOT_TIMEZONE, formatParisTime } from "@/lib/slot-window";
import { Slot, Inscription } from "../types";
import { downloadPdfDocument } from "./pdf-download";

function slotDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

export function formatAttestationDate(session: {
  startDate?: Date | null;
  endDate?: Date | null;
  slots?: Slot[];
}): string {
  const slots = session.slots ?? [];
  const timestamps: number[] = [];

  slots.forEach((s) => {
    if (s.date) {
      const t = new Date(s.date).getTime();
      if (!Number.isNaN(t)) timestamps.push(t);
    }
  });

  if (session.startDate) {
    const t = new Date(session.startDate).getTime();
    if (!Number.isNaN(t)) timestamps.push(t);
  }
  if (session.endDate) {
    const t = new Date(session.endDate).getTime();
    if (!Number.isNaN(t)) timestamps.push(t);
  }

  if (timestamps.length === 0) return "Non spécifiée";

  const minDate = dayjs(Math.min(...timestamps)).format("DD/MM/YYYY");
  const maxDate = dayjs(Math.max(...timestamps)).format("DD/MM/YYYY");

  if (minDate !== maxDate) {
    return `du ${minDate} au ${maxDate}`;
  }
  return minDate;
}

export function formatAttestationHoraires(slots: Slot[]): string {
  if (!slots || slots.length === 0) return "Non spécifiés";

  const startTimes = slots
    .map((s) => s.startTime)
    .filter(Boolean)
    .sort();
  const endTimes = slots
    .map((s) => s.endTime)
    .filter(Boolean)
    .sort();

  if (startTimes.length === 0 || endTimes.length === 0) {
    return "Non spécifiés";
  }

  const earliestStart = startTimes[0];
  const latestEnd = endTimes[endTimes.length - 1];

  return `${earliestStart} - ${latestEnd}`;
}

export function formatAttestationDuration(slots: Slot[]): number {
  if (!slots || slots.length === 0) return 0;
  return (
    Math.round(
      slots.reduce(
        (sum, s) => sum + slotDurationHours(s.startTime, s.endTime),
        0
      ) * 10
    ) / 10
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MISE EN PAGE
// Coordonnées en mm sur une page A4 ; `y` désigne la ligne de base du texte.
// Les libellés étant fixes, les positions des valeurs qui les suivent sont
// des constantes (largeur du libellé en Helvetica 11 pt incluse).
// ──────────────────────────────────────────────────────────────────────────

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const mm = (value: number) => (value * 72) / 25.4;

// react-pdf place la ligne de base à 0,9 × la taille de police sous le haut du bloc
const BASELINE_RATIO = 0.9;

function TextAt({
  x,
  y,
  size = 11,
  bold = false,
  center = false,
  width = 100,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  /** Centre le texte sur `x`. */
  center?: boolean;
  /** Largeur du bloc centré, en mm. */
  width?: number;
  children: React.ReactNode;
}) {
  const centeredWidth = width;
  return (
    <Text
      style={{
        position: "absolute",
        left: mm(center ? x - centeredWidth / 2 : x),
        top: mm(y) - BASELINE_RATIO * size,
        fontFamily: bold ? "Helvetica-Bold" : "Helvetica",
        fontSize: size,
        ...(center && { width: mm(centeredWidth), textAlign: "center" }),
      }}
    >
      {children}
    </Text>
  );
}

// Case à cocher dessinée (x = bord gauche, y = ligne de base du texte associé)
function Checkbox({
  x,
  y,
  checked,
}: {
  x: number;
  y: number;
  checked: boolean;
}) {
  const size = 3.2;
  return (
    <G>
      <Rect
        x={x}
        y={y - size + 0.3}
        width={size}
        height={size}
        fill="none"
        stroke="black"
        strokeWidth={0.3}
      />
      {checked && (
        <G>
          <Line
            x1={x + 0.4}
            y1={y - size + 0.7}
            x2={x + size - 0.4}
            y2={y - 0.1}
            stroke="black"
            strokeWidth={0.4}
          />
          <Line
            x1={x + size - 0.4}
            y1={y - size + 0.7}
            x2={x + 0.4}
            y2={y - 0.1}
            stroke="black"
            strokeWidth={0.4}
          />
        </G>
      )}
    </G>
  );
}

const ACTION_ITEMS = [
  "Action de préformation et de préparation à la vie professionnelle ;",
  "Action d'adaptation et de développement des compétences des salariés ;",
  "Action d'acquisition, d'entretien ou de perfectionnement des connaissances ;",
  "Action de prévention.",
];
const ACTION_YS = [118, 125, 132, 139];
// Seule l'action d'acquisition / perfectionnement des connaissances est cochée
const CHECKED_ACTION_INDEX = 2;

// Texte découpé pour tenir entre OBJECTIF_X et la marge droite (190 mm)
const OBJECTIF_LINES = [
  "L'apprenant devra être capable d'acquérir les connaissances",
  "nécessaires à la bonne exécution des gestes destinés à préserver la",
  "vie et l'intégrité physique d'une victime en attendant l'arrivée des",
  "secours organisés",
];
const OBJECTIF_Y = 151;
const OBJECTIF_X = 71.379; // 20 + largeur de "Objectif(s) de la formation : " (gras)
const OBJECTIF_LINE_HEIGHT = 6;

const NATURE_Y = OBJECTIF_Y + OBJECTIF_LINES.length * OBJECTIF_LINE_HEIGHT + 5;
const RESULT_Y = NATURE_Y + 12;
const ACQUIS_Y = RESULT_Y + 9;
const ACQUIS_X = 75;

function AttestationPage({
  session,
  inscription,
  formateur,
  signer,
}: {
  session: AttestationSession;
  inscription: Inscription;
  formateur: AttestationFormateur;
  signer?: AttestationSigner;
}) {
  const x = 20;
  const formateurName =
    signer?.name ||
    `${formateur.lastName ?? ""} ${formateur.firstName ?? ""}`.trim() ||
    "Non renseigné";
  const traineeName =
    `${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`.trim();
  const totalHours = formatAttestationDuration(session.slots);
  const hoursLabel = totalHours > 1 ? "heures" : "heure";
  const isAcquis = inscription.attestationResult === "acquis";
  // Signée : la date est celle de la signature, pas celle du téléchargement
  const validatedAt = signer
    ? dayjs(signer.signedAt).tz(SLOT_TIMEZONE).format("DD/MM/YYYY")
    : inscription.attestationValidatedAt
      ? dayjs(inscription.attestationValidatedAt).format("DD/MM/YYYY")
      : dayjs().format("DD/MM/YYYY");

  return (
    <Page size="A4">
      {/* ── Traits : soulignement et cases à cocher ── */}
      <Svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: mm(PAGE_WIDTH),
          height: mm(PAGE_HEIGHT),
        }}
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
      >
        {/* 55.026 = largeur de "A suivi la formation suivante :" (gras) */}
        <Line
          x1={x}
          y1={68.5}
          x2={x + 55.026}
          y2={68.5}
          stroke="black"
          strokeWidth={0.3}
        />
        {ACTION_YS.map((y, i) => (
          <Checkbox
            key={y}
            x={x + 6}
            y={y}
            checked={i === CHECKED_ACTION_INDEX}
          />
        ))}
        <Checkbox x={ACQUIS_X} y={ACQUIS_Y} checked={isAcquis} />
        <Checkbox x={ACQUIS_X + 35} y={ACQUIS_Y} checked={!isAcquis} />
      </Svg>

      {/* ── Titre ── */}
      <TextAt x={PAGE_WIDTH / 2} y={25} size={14} bold center>
        ATTESTATION DE FIN DE FORMATION
      </TextAt>

      {/* ── Formateur ── */}
      <TextAt x={x} y={45}>
        Je soussigné(e), Mme, M
      </TextAt>
      <TextAt x={66.432} y={45} bold>
        {formateurName}
      </TextAt>

      {/* ── Stagiaire ── */}
      <TextAt x={x} y={55}>
        Atteste que Mme / M
      </TextAt>
      {traineeName && (
        <TextAt x={58.749} y={55} bold>
          {traineeName}
        </TextAt>
      )}

      <TextAt x={x} y={67} bold>
        A suivi la formation suivante :
      </TextAt>

      {/* ── Intitulé + Lieu ── */}
      <TextAt x={x} y={77} bold>
        Intitulé de la formation :
      </TextAt>
      <TextAt x={66.212} y={77}>
        {session.title}
      </TextAt>
      <TextAt x={130} y={77} bold>
        Lieu:
      </TextAt>
      <TextAt x={144.43} y={77}>
        {session.location}
      </TextAt>

      {/* ── Date + Horaires (le bloc date ne dépasse jamais x = 105) ── */}
      <TextAt x={x} y={87} bold>
        Date :
      </TextAt>
      <TextAt x={31.409} y={87}>
        {formatAttestationDate(session)}
      </TextAt>
      <TextAt x={105} y={87} bold>
        Horaires :
      </TextAt>
      <TextAt x={122.812} y={87}>
        {formatAttestationHoraires(session.slots)}
      </TextAt>

      {/* ── Durée ── */}
      <TextAt x={x} y={98}>
        {`Soit une durée de ${totalHours} ${hoursLabel}`}
      </TextAt>

      {/* ── Nature de l'action ── */}
      <TextAt x={x} y={110} bold>
        Nature de l&apos;action (article L 6313-1 du Code du travail) :
      </TextAt>
      {ACTION_ITEMS.map((item, i) => (
        <TextAt key={item} x={x + 11} y={ACTION_YS[i]} size={10}>
          {item}
        </TextAt>
      ))}

      {/* ── Objectif(s) ── */}
      <TextAt x={x} y={OBJECTIF_Y} bold>
        Objectif(s) de la formation :
      </TextAt>
      {OBJECTIF_LINES.map((line, i) => (
        <TextAt
          key={line}
          x={OBJECTIF_X}
          y={OBJECTIF_Y + i * OBJECTIF_LINE_HEIGHT}
        >
          {line}
        </TextAt>
      ))}

      {/* ── Nature de la formation ── */}
      <TextAt x={x} y={NATURE_Y} bold>
        Nature de la formation :
      </TextAt>
      <TextAt x={66.406} y={NATURE_Y}>
        Formation aux premiers secours de type présentiel
      </TextAt>

      {/* ── Résultats évaluation ── */}
      <TextAt x={x} y={RESULT_Y} bold>
        Résultats de l&apos;évaluation des acquis de la formation
      </TextAt>
      <TextAt x={ACQUIS_X + 5} y={ACQUIS_Y}>
        Acquis
      </TextAt>
      <TextAt x={ACQUIS_X + 40} y={ACQUIS_Y}>
        Non Acquis
      </TextAt>

      {/* ── Fait à / Le ── */}
      <TextAt x={x} y={245}>
        {`Fait à ${session.location}`}
      </TextAt>
      <TextAt x={130} y={245}>
        {`Le, ${validatedAt}`}
      </TextAt>

      {/* ── Signature du Formateur ── */}
      <TextAt x={150} y={260} bold center>
        Signature du Formateur
      </TextAt>
      {signer && (
        <>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf, pas un <img> */}
          <Image
            src={signer.imageDataUrl}
            style={{
              position: "absolute",
              left: mm(120),
              top: mm(263),
              width: mm(60),
              height: mm(22),
              objectFit: "contain",
            }}
          />
          <TextAt x={PAGE_WIDTH / 2} y={287} size={8} center width={170}>
            {`Signé électroniquement par ${signer.name} le ${dayjs(signer.signedAt).tz(SLOT_TIMEZONE).format("DD/MM/YYYY")} à ${formatParisTime(signer.signedAt)}`}
          </TextAt>
          <TextAt x={PAGE_WIDTH / 2} y={291} size={8} center width={170}>
            {`Réf. ${signer.signatureId}`}
          </TextAt>
        </>
      )}
    </Page>
  );
}

export type AttestationSession = {
  title: string;
  location: string;
  startDate: Date | null;
  endDate?: Date | null;
  slots: Slot[];
};
export type AttestationFormateur = {
  lastName: string | null;
  firstName: string | null;
};
export type AttestationSigner = {
  name: string;
  signedAt: Date;
  signatureId: string;
  /** data:image/png;base64,… */
  imageDataUrl: string;
};

/** Une page par inscription. */
export function AttestationDocument({
  session,
  inscriptions,
  formateur,
  signer,
}: {
  session: AttestationSession;
  inscriptions: Inscription[];
  formateur: AttestationFormateur;
  signer?: AttestationSigner;
}) {
  return (
    <Document>
      {inscriptions.map((inscription) => (
        <AttestationPage
          key={inscription.id}
          session={session}
          inscription={inscription}
          formateur={formateur}
          signer={signer}
        />
      ))}
    </Document>
  );
}

export function attestationFileName(inscription: Inscription): string {
  return `Attestation_${inscription.trainee?.lastName}_${inscription.trainee?.firstName}.pdf`;
}

/** PDF d'une attestation, généré côté serveur. */
export async function renderAttestationPDF(
  session: AttestationSession,
  inscription: Inscription,
  formateur: AttestationFormateur
): Promise<Buffer> {
  return await renderToBuffer(
    <AttestationDocument
      session={session}
      inscriptions={[inscription]}
      formateur={formateur}
    />
  );
}

/** PDF signé : rendu une seule fois, à la signature, puis stocké. */
export async function renderSignedAttestationPDF(
  session: AttestationSession,
  inscription: Inscription,
  signer: AttestationSigner
): Promise<Buffer> {
  return await renderToBuffer(
    <AttestationDocument
      session={session}
      inscriptions={[inscription]}
      formateur={{ lastName: signer.name, firstName: null }}
      signer={signer}
    />
  );
}

export function generateAttestationPDF(
  session: AttestationSession,
  inscription: Inscription,
  formateur: AttestationFormateur
) {
  return downloadPdfDocument(
    <AttestationDocument
      session={session}
      inscriptions={[inscription]}
      formateur={formateur}
    />,
    attestationFileName(inscription)
  );
}

export function generateAllAttestationsPDF(
  session: AttestationSession,
  inscriptions: Inscription[],
  formateur: AttestationFormateur
) {
  return downloadPdfDocument(
    <AttestationDocument
      session={session}
      inscriptions={inscriptions}
      formateur={formateur}
    />,
    `Attestations_${session.title.replace(/\s+/g, "_")}.pdf`
  );
}
