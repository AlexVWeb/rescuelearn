import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Slot, Inscription } from "../types";

// ──────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  headerLogoContainer: {
    marginBottom: 20,
    height: 50,
  },
  headerLogo: {
    width: 150,
    height: 50,
    objectFit: "contain",
  },
  mainTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  metaText: {
    fontSize: 10,
  },
  textBold: {
    fontWeight: "bold",
  },
  subTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    flexDirection: "row",
    border: "1 solid #000",
    marginBottom: 15,
  },
  grayBar: {
    width: 25,
    backgroundColor: "#d9d9d9",
    borderRight: "1 solid #000",
    justifyContent: "center",
    alignItems: "center",
  },
  verticalText: {
    transform: "rotate(-90deg)",
    fontSize: 10,
    fontWeight: "bold",
    width: 150,
    textAlign: "center",
  },
  contentCol: {
    flex: 1,
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
  },
  borderBottom: {
    borderBottom: "1 solid #000",
  },
  borderRight: {
    borderRight: "1 solid #000",
  },
  borderLeft: {
    borderLeft: "1 solid #000",
  },
  cell: {
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginRight: 4,
  },
  cellValue: {
    fontSize: 9,
  },
  evalText: {
    fontSize: 9,
  },
  evalBox: {
    width: 35,
    borderLeft: "1 solid #000",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ──────────────────────────────────────────────────────────────────────────
// FISE PAGE COMPONENT
// ──────────────────────────────────────────────────────────────────────────

interface FisePageProps {
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  };
  inscription: Inscription;
  formateur: {
    lastName: string | null;
    firstName: string | null;
  };
  organismeLogoBase64?: string | null;
}

const FisePage: React.FC<FisePageProps> = ({
  session,
  inscription,
  formateur,
  organismeLogoBase64,
}) => {
  const dateStr = session.startDate
    ? dayjs(session.startDate).format("DD/MM/YYYY")
    : "";

  const formateurName = `${formateur.lastName ?? ""} ${
    formateur.firstName ?? ""
  }`.trim();

  const dobStr = inscription.trainee?.dateOfBirth
    ? dayjs(inscription.trainee.dateOfBirth).format("DD/MM/YYYY")
    : "";

  const isAcquis = inscription.attestationResult === "acquis";

  return (
    <Page size="A4" style={styles.page}>
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <View style={styles.headerLogoContainer}>
        {organismeLogoBase64 && (
          <Image src={organismeLogoBase64} style={styles.headerLogo} />
        )}
      </View>

      <Text style={styles.mainTitle}>
        FICHE DE RENSEIGNEMENTS, DE SUIVI ET D'EVALUATION
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          <Text style={styles.textBold}>COMITE :</Text> RHONE LYON METROPOLE
        </Text>
        <Text style={styles.metaText}>
          <Text style={styles.textBold}>ASSOCIATION :</Text> LYON
        </Text>
      </View>

      <Text style={styles.subTitle}>FORMATION EN PREMIERS SECOURS CITOYEN</Text>

      {/* ── STAGE SECTION ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.grayBar}>
          <Text style={styles.verticalText}>STAGE</Text>
        </View>
        <View style={styles.contentCol}>
          <View style={[styles.row, { minHeight: 45 }]}>
            <View style={[styles.cell, { flex: 2 }, styles.borderRight]}>
              <Text style={styles.cellLabel}>Lieu :</Text>
              <Text style={styles.cellValue}>{session.location}</Text>
            </View>
            <View style={[styles.cell, { flex: 1 }, styles.borderRight]}>
              <Text style={styles.cellLabel}>Date :</Text>
              <Text style={styles.cellValue}>{dateStr}</Text>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cellLabel}>Formateur :</Text>
              <Text style={styles.cellValue}>{formateurName}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── PARTICIPANT SECTION ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.grayBar}>
          <Text style={styles.verticalText}>PARTICIPANT</Text>
        </View>
        <View style={styles.contentCol}>
          {/* Row 1 */}
          <View style={[styles.row, styles.borderBottom]}>
            <View style={[styles.cell, { flex: 1.5 }, styles.borderRight]}>
              <Text style={styles.cellLabel}>Nom :</Text>
              <Text style={styles.cellValue}>
                {inscription.trainee?.lastName ?? ""}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 1.5 }, styles.borderRight]}>
              <Text style={styles.cellLabel}>Prénom :</Text>
              <Text style={styles.cellValue}>
                {inscription.trainee?.firstName ?? ""}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cellLabel}>Date et lieu de naissance :</Text>
              <Text style={styles.cellValue}>{dobStr}</Text>
            </View>
          </View>
          {/* Row 2 */}
          <View style={[styles.row, styles.borderBottom]}>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellLabel}>Adresse :</Text>
              <Text style={styles.cellValue}>
                {inscription.trainee?.address ?? ""}
              </Text>
            </View>
          </View>
          {/* Row 3 */}
          <View style={[styles.row, styles.borderBottom]}>
            <View style={[styles.cell, { flex: 2 }, styles.borderRight]}>
              <Text style={styles.cellLabel}>Email :</Text>
              <Text style={styles.cellValue}>
                {inscription.trainee?.email ?? ""}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellLabel}>Téléphone :</Text>
              <Text style={styles.cellValue}>
                {inscription.trainee?.phone ?? ""}
              </Text>
            </View>
          </View>
          {/* Row 4 */}
          <View style={[styles.row]}>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellLabel}>Autorisation parentale :</Text>
              <Text style={styles.cellValue}></Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── EVALUATION SECTION ──────────────────────────────────────────────── */}
      <View style={[styles.row, { paddingRight: 0 }]}>
        <View style={{ width: 25 }} />
        <View style={{ flex: 1 }} />
        <View
          style={{
            width: 35,
            border: "1 solid #000",
            borderBottom: 0,
            borderRight: 0,
            paddingVertical: 4,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>OUI</Text>
        </View>
        <View
          style={{
            width: 35,
            border: "1 solid #000",
            borderBottom: 0,
            borderRight: 0,
            paddingVertical: 4,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>NON</Text>
        </View>
        <View
          style={{
            width: 120,
            border: "1 solid #000",
            borderBottom: 0,
            paddingVertical: 4,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>Observations</Text>
        </View>
      </View>

      <View style={[styles.section, { marginBottom: 0 }]}>
        <View style={styles.grayBar}>
          <Text style={styles.verticalText}>EVALUATION DU PARTICIPANT</Text>
        </View>
        <View style={[styles.contentCol, { flexDirection: "row" }]}>
          {/* Left (Questions + Boxes) */}
          <View style={{ flex: 1, flexDirection: "column" }}>
            {/* Row 1 */}
            <View style={[styles.row, styles.borderBottom, { minHeight: 45 }]}>
              <View style={{ flex: 1, padding: 6, justifyContent: "center" }}>
                <Text style={styles.evalText}>
                  Le participant a participé à toutes les phases de la formation
                </Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10 }}></Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10 }}></Text>
              </View>
            </View>
            {/* Row 2 */}
            <View style={[styles.row, styles.borderBottom, { minHeight: 45 }]}>
              <View style={{ flex: 1, padding: 6, justifyContent: "center" }}>
                <Text style={styles.evalText}>
                  Le participant a réalisé tous les gestes de premiers secours
                  au cours des ateliers d'apprentissage pratique
                </Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10 }}></Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10 }}></Text>
              </View>
            </View>
            {/* Row 3 */}
            <View style={[styles.row, styles.borderBottom, { minHeight: 45 }]}>
              <View style={{ flex: 1, padding: 6, justifyContent: "center" }}>
                <Text style={styles.evalText}>
                  Le participant a participé au moins une fois, comme sauveteur,
                  à une activité d'application (mise en situation)
                </Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10 }}></Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10 }}></Text>
              </View>
            </View>
            {/* Row 4 */}
            <View style={[styles.row, styles.borderBottom, { minHeight: 45 }]}>
              <View
                style={{
                  width: "45%",
                  padding: 6,
                  justifyContent: "center",
                  borderRight: "1 solid #000",
                }}
              >
                <Text style={styles.evalText}>Thème de mise en situation</Text>
              </View>
              <View style={{ flex: 1 }}></View>
            </View>
            {/* Row 5 */}
            <View style={[styles.row, { minHeight: 45 }]}>
              <View style={{ flex: 1, padding: 6, justifyContent: "center" }}>
                <Text style={[styles.evalText, { marginBottom: 2 }]}>
                  Certificat de compétences délivré
                </Text>
                <Text style={styles.evalText}>(si 3 cases oui cochées)</Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10, fontWeight: "bold" }}>OUI</Text>
              </View>
              <View style={styles.evalBox}>
                <Text style={{ fontSize: 10, fontWeight: "bold" }}>NON</Text>
              </View>
            </View>
          </View>

          {/* Right (Observations) */}
          <View style={{ width: 120, borderLeft: "1 solid #000" }}></View>
        </View>
      </View>

      {/* ── SIGNATURE ────────────────────────────────────────────────────────── */}
      <View style={{ marginTop: 20, paddingLeft: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: "bold" }}>
          SIGNATURE ET NOM DU FORMATEUR
        </Text>
      </View>
    </Page>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// PDF DOCUMENTS FOR EXPORT
// ──────────────────────────────────────────────────────────────────────────

/**
 * Single FISE PDF Document
 */
const SingleFiseDocument: React.FC<FisePageProps> = (props) => (
  <Document>
    <FisePage {...props} />
  </Document>
);

/**
 * Multiple FISE PDFs in one document (one per page)
 */
interface MultipleFiseDocumentProps {
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  };
  inscriptions: Inscription[];
  formateur: {
    lastName: string | null;
    firstName: string | null;
  };
  organismeLogoBase64?: string | null;
}

const MultipleFiseDocument: React.FC<MultipleFiseDocumentProps> = ({
  session,
  inscriptions,
  formateur,
  organismeLogoBase64,
}) => (
  <Document>
    {inscriptions.map((inscription, index) => (
      <FisePage
        key={index}
        session={session}
        inscription={inscription}
        formateur={formateur}
        organismeLogoBase64={organismeLogoBase64}
      />
    ))}
  </Document>
);

// ──────────────────────────────────────────────────────────────────────────
// EXPORT FUNCTIONS (React components with PDFDownloadLink)
// ──────────────────────────────────────────────────────────────────────────

type PDFDownloadChildren =
  | React.ReactNode
  | ((props: { loading: boolean }) => React.ReactNode);

/**
 * Component to download a single FISE PDF
 */
export const SingleFisePDFDownload: React.FC<
  FisePageProps & { children?: PDFDownloadChildren; className?: string }
> = ({ children, className, ...props }) => (
  <PDFDownloadLink
    document={<SingleFiseDocument {...props} />}
    fileName={`FISE_${props.inscription.trainee?.lastName}_${props.inscription.trainee?.firstName}.pdf`}
    className={className}
  >
    {({ loading }) =>
      children
        ? typeof children === "function"
          ? children({ loading })
          : children
        : loading
          ? "Génération..."
          : "Télécharger"
    }
  </PDFDownloadLink>
);

/**
 * Component to download multiple FISE PDFs in one file
 */
export const MultipleFisePDFDownload: React.FC<
  MultipleFiseDocumentProps & {
    children?: PDFDownloadChildren;
    className?: string;
  }
> = ({ children, className, ...props }) => (
  <PDFDownloadLink
    document={<MultipleFiseDocument {...props} />}
    fileName={`FISE_${props.session.title.replace(/\s+/g, "_")}.pdf`}
    className={className}
  >
    {({ loading }) =>
      children
        ? typeof children === "function"
          ? children({ loading })
          : children
        : loading
          ? "Génération..."
          : "Télécharger"
    }
  </PDFDownloadLink>
);

// ──────────────────────────────────────────────────────────────────────────
// ALTERNATIVE: Direct generation functions (if you prefer programmatic export)
// ──────────────────────────────────────────────────────────────────────────

/**
 * For direct PDF generation without React component rendering:
 * Use renderToString or renderToFile from @react-pdf/renderer
 */
import { renderToBuffer } from "@react-pdf/renderer";

export async function generateFisePDFBuffer(
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  },
  inscription: Inscription,
  formateur: { lastName: string | null; firstName: string | null },
  organismeLogoBase64?: string | null
): Promise<Buffer> {
  const doc = (
    <SingleFiseDocument
      session={session}
      inscription={inscription}
      formateur={formateur}
      organismeLogoBase64={organismeLogoBase64}
    />
  );
  return await renderToBuffer(doc);
}

export async function generateAllFisePDFBuffer(
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  },
  inscriptions: Inscription[],
  formateur: { lastName: string | null; firstName: string | null },
  organismeLogoBase64?: string | null
): Promise<Buffer> {
  const doc = (
    <MultipleFiseDocument
      session={session}
      inscriptions={inscriptions}
      formateur={formateur}
      organismeLogoBase64={organismeLogoBase64}
    />
  );
  return await renderToBuffer(doc);
}
