import React from "react";
import {
  Document,
  Page,
  View,
  Text,
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
  mainTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 10,
    marginBottom: 5,
    marginLeft: 60,
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 20,
    marginBottom: 20,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metaText: {
    fontSize: 10,
  },
  legendText: {
    fontSize: 10,
    marginBottom: 30,
  },
  signatureText: {
    fontSize: 10,
    fontWeight: "bold",
    fontStyle: "italic",
    textDecoration: "underline",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 10,
    marginBottom: 10,
  },
  summaryTable: {
    width: 250,
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    alignSelf: "center",
    marginTop: 30,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryColLabel: {
    width: "70%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  summaryColValue: {
    width: "30%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  summaryLabelText: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  summaryValueText: {
    fontSize: 10,
    textAlign: "center",
  },
});

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────

interface PvPageProps {
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    endDate?: Date | null;
    slots: Slot[];
  };
  inscriptions: Inscription[];
  formateur: {
    lastName: string | null;
    firstName: string | null;
  };
}

const PvPage: React.FC<PvPageProps> = ({
  session,
  inscriptions,
  formateur,
}) => {
  const startDateStr = session.startDate
    ? dayjs(session.startDate).format("DD/MM/YYYY")
    : "_______________";
  const endDateStr = session.endDate
    ? dayjs(session.endDate).format("DD/MM/YYYY")
    : "_______________";

  // Calculate stats
  const total = inscriptions.length;
  const valides = inscriptions.filter(
    (i) => i.attestationResult === "acquis"
  ).length;
  const nonValides = inscriptions.filter(
    (i) => i.attestationResult === "non_acquis"
  ).length;
  const formationContinue = 0; // Or calculate if needed

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.mainTitle}>PROCES VERBAL DE LA FORMATION</Text>

      <Text style={styles.subTitle}>
        COMITE DEPARTEMENTAL RHONE LYON METROPOLE
      </Text>
      <Text style={styles.subTitle}>
        DES SECOURISTES FRANCAIS CROIX BLANCHE
      </Text>
      <Text
        style={[
          styles.subTitle,
          { marginTop: 10, textAlign: "center", marginLeft: 0 },
        ]}
      >
        Association de LYON
      </Text>

      {/* Trainees Table */}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <View style={[styles.tableCol, { width: "10%" }]}>
            <Text style={styles.tableCellHeader}>Civilité{"\n"}M/Mme</Text>
          </View>
          <View style={[styles.tableCol, { width: "20%" }]}>
            <Text style={styles.tableCellHeader}>Nom</Text>
          </View>
          <View style={[styles.tableCol, { width: "20%" }]}>
            <Text style={styles.tableCellHeader}>Prénom</Text>
          </View>
          <View style={[styles.tableCol, { width: "20%" }]}>
            <Text style={styles.tableCellHeader}>
              Date et lieu de naissance
            </Text>
          </View>
          <View style={[styles.tableCol, { width: "15%" }]}>
            <Text style={styles.tableCellHeader}>Evaluation (*)</Text>
          </View>
          <View style={[styles.tableCol, { width: "15%" }]}>
            <Text style={styles.tableCellHeader}>N°{"\n"}du diplôme</Text>
          </View>
        </View>

        {inscriptions.map((inscription, idx) => {
          let dobStr = inscription.trainee?.dateOfBirth
            ? dayjs(inscription.trainee.dateOfBirth).format("DD/MM/YYYY")
            : "";
          if (dobStr && inscription.trainee?.birthPlace) {
            dobStr += ` à ${inscription.trainee.birthPlace}`;
          }

          let evalStr = "";
          if (inscription.attestationResult === "acquis") evalStr = "A";
          else if (inscription.attestationResult === "non_acquis")
            evalStr = "I";

          return (
            <View style={styles.tableRow} key={idx}>
              <View style={[styles.tableCol, { width: "10%" }]}>
                <Text style={styles.tableCell}>
                  {inscription.trainee?.civility || ""}
                </Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>
                  {inscription.trainee?.lastName || ""}
                </Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>
                  {inscription.trainee?.firstName || ""}
                </Text>
              </View>
              <View style={[styles.tableCol, { width: "20%" }]}>
                <Text style={styles.tableCell}>{dobStr}</Text>
              </View>
              <View style={[styles.tableCol, { width: "15%" }]}>
                <Text style={styles.tableCell}>{evalStr}</Text>
              </View>
              <View style={[styles.tableCol, { width: "15%" }]}>
                <Text style={styles.tableCell}></Text>
              </View>
            </View>
          );
        })}
        {/* Render a few empty rows if the list is small to match the look */}
        {Array.from({ length: Math.max(0, 10 - inscriptions.length) }).map(
          (_, idx) => (
            <View style={styles.tableRow} key={`empty-${idx}`}>
              <View style={[styles.tableCol, { width: "10%", height: 20 }]}>
                <Text style={styles.tableCell}></Text>
              </View>
              <View style={[styles.tableCol, { width: "20%", height: 20 }]}>
                <Text style={styles.tableCell}></Text>
              </View>
              <View style={[styles.tableCol, { width: "20%", height: 20 }]}>
                <Text style={styles.tableCell}></Text>
              </View>
              <View style={[styles.tableCol, { width: "20%", height: 20 }]}>
                <Text style={styles.tableCell}></Text>
              </View>
              <View style={[styles.tableCol, { width: "15%", height: 20 }]}>
                <Text style={styles.tableCell}></Text>
              </View>
              <View style={[styles.tableCol, { width: "15%", height: 20 }]}>
                <Text style={styles.tableCell}></Text>
              </View>
            </View>
          )
        )}
      </View>

      {/* Meta Info */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Session du {startDateStr} au {endDateStr}
        </Text>
        <Text style={styles.metaText}>
          lieu : {session.location || "__________________"}
        </Text>
      </View>

      <Text style={styles.legendText}>
        * Préciser : Apte : A - Inapte : I - R : révision
      </Text>

      <Text style={styles.signatureText}>
        Nom et signature du ou des formateur(s)
      </Text>

      <Text style={styles.footerText}>
        PV transmis le : ________________________
      </Text>
      <Text style={styles.footerText}>
        Certificats reçu le : ________________________
      </Text>

      {/* Summary Table */}
      <View style={styles.summaryTable}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColLabel}>
            <Text style={styles.summaryLabelText}>Nombre de participants</Text>
          </View>
          <View style={styles.summaryColValue}>
            <Text style={styles.summaryValueText}>{total}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColLabel}>
            <Text
              style={[
                styles.summaryLabelText,
                { fontWeight: "normal", textAlign: "left" },
              ]}
            >
              Validé
            </Text>
          </View>
          <View style={styles.summaryColValue}>
            <Text style={styles.summaryValueText}>{valides}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColLabel}>
            <Text
              style={[
                styles.summaryLabelText,
                { fontWeight: "normal", textAlign: "left" },
              ]}
            >
              Non validé
            </Text>
          </View>
          <View style={styles.summaryColValue}>
            <Text style={styles.summaryValueText}>{nonValides}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColLabel}>
            <Text
              style={[
                styles.summaryLabelText,
                { fontWeight: "normal", textAlign: "left" },
              ]}
            >
              Formation continue
            </Text>
          </View>
          <View style={styles.summaryColValue}>
            <Text style={styles.summaryValueText}>{formationContinue}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
};

const PvDocument: React.FC<PvPageProps> = (props) => (
  <Document>
    <PvPage {...props} />
  </Document>
);

export const PvPDFDownload: React.FC<
  PvPageProps & {
    children?:
      | React.ReactNode
      | ((props: { loading: boolean }) => React.ReactNode);
    className?: string;
  }
> = ({ children, className, ...props }) => (
  <PDFDownloadLink
    document={<PvDocument {...props} />}
    fileName={`PV_${props.session.title.replace(/\s+/g, "_")}.pdf`}
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
