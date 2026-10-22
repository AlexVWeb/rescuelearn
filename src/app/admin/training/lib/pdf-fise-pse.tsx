import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Slot, Inscription } from "../types";

// ──────────────────────────────────────────────────────────────────────────
// TECHNIQUES (Annexe 1 du référentiel interne SFCB – PSE 1 et PSE 2)
// ──────────────────────────────────────────────────────────────────────────

export type PseLevel = "PSE1" | "PSE2";

interface TechniqueSection {
  /** Absent : suite de la catégorie de la colonne précédente */
  title?: string;
  techniques: string[];
}

const PSE1_LEFT: TechniqueSection[] = [
  {
    title: "Attitude et comportement",
    techniques: [
      "Évaluation de l'impact psychologique",
      "Stabiliser l'état psycho-physiologique d'une victime",
      "L'écoute active",
      "La respiration contrôlée",
      "La focalisation / défocalisation attentionnelle",
    ],
  },
  {
    title: "Bilans",
    techniques: [
      "Retournement à deux secouristes et à un secouriste",
      "Evaluation de la fonction respiratoire",
      "Evaluation de la fonction circulatoire",
      "Mesure de la glycémie capillaire",
      "Mesure de la pression artérielle",
      "Mesure de la saturation pulsée en oxygène",
      "Mesure de la température",
      "Evaluation de la fonction neurologique",
      "Mesure de la douleur",
      "Recherche des lésions",
    ],
  },
  {
    title: "Protection et sécurité",
    techniques: ["Dégagements d'urgence"],
  },
  {
    title: "Hygiène et aseptie",
    techniques: [
      "Equipement contre les agents infectieux",
      "Friction des mains",
      "Lavage des mains",
      "Mise en place de gants stériles",
      "Retrait des gants à usage unique",
      "Utilisation des emballages à élimination de déchets",
      "Utilisation des détergents et désinfectants",
      "Nettoyage et désinfection du matériel",
      "Nettoyage et désinfection d'un véhicule ou d'un local",
    ],
  },
  {
    title: "Malaises et affections spécifiques",
    techniques: [
      "Positions d'attente et de confort",
      "Aide à la prise de médicaments",
      "Manœuvres physiques",
    ],
  },
  {
    title: "Urgences vitales",
    techniques: [
      "Compression manuelle",
      "Pansement compressif",
      "Garrots",
      "Gaze imbibée de substance hémostatique",
      "Technique de réchauffement d'une victime",
      "Désobstruction par la méthode des claques dans le dos",
      "Désobstruction par la méthode des compressions abdominales",
      "Désobstruction par la méthode des compressions thoraciques",
      "Utilisation d'une bouteille d'oxygène",
      "Administration de l'oxygène par inhalation",
      "LVA chez une victime non traumatisée",
      "LVA chez une victime traumatisée",
    ],
  },
];

const PSE1_RIGHT: TechniqueSection[] = [
  {
    techniques: [
      "LVA chez une victime assise",
      "Position latérale de sécurité à 1 secouriste",
      "Position latérale de sécurité à 2 secouristes",
      "Aspiration de mucosité",
      "Compressions thoraciques",
      "Ventilation artificielle par voie orale",
      "Administration d'oxygène par insufflations",
      "Ventilation artificielle avec insufflateur manuel",
      "Utilisation d'un défibrillateur automatisé externe",
      "Mise en place d'une canule oropharyngée",
    ],
  },
  {
    title: "Traumatismes",
    techniques: [
      "Immobilisation d'un membre au moyen d'une attelle à dépression",
      "Immobilisation d'un membre au moyen d'une attelle modulable",
      "Immobilisation d'un membre supérieur au moyen d'écharpes",
      "Maintien de la tête en position neutre",
      "Pose d'un collier cervical",
      "Retrait d'un casque de protection",
      "Application de froid",
      "Emballages au moyen d'un pansement stérile",
      "Pansement et maintien d'un pansement",
      "Utilisation d'un lot membre arraché ou sectionné",
    ],
  },
  {
    title: "Relevage et brancardage",
    techniques: ["Préparation d'un dispositif de portage"],
  },
];

const PSE2_TABLES: TechniqueSection[] = [
  {
    title: "Traumatismes",
    techniques: [
      "Contention pelvienne",
      "Immobilisation d'un membre inférieur au moyen d'une attelle à traction",
      "Immobilisation générale sur un plan dur",
      "Immobilisation générale sur un matelas à dépression",
      "Pose de l'attelle cervico-thoracique",
      "Réalignement de membre",
    ],
  },
  {
    title: "Relevage et brancardage :",
    techniques: [
      "Aide à la marche",
      "Arrimage de la victime",
      "Brancardage à quatre secouristes",
      "Brancardage à trois secouristes",
      "Déplacement d'une victime à l'aide d'une chaise de transport",
      "Déplacement d'une victime non valide",
      "Installation d'une victime dans un vecteur de transport",
      "Relevage à l'aide d'un brancard cuillère",
      "Relevage à quatre secouristes",
      "Relevage à trois secouristes",
      "Relevage d'une victime en position particulière",
      "Transfert d'une victime à l'aide d'une alèse portoir",
    ],
  },
];

const LEVEL_LABELS: Record<PseLevel, string> = {
  PSE1: "PREMIERS SECOURS EN EQUIPE DE NIVEAU 1",
  PSE2: "PREMIERS SECOURS EN EQUIPE DE NIVEAU 2",
};

// ──────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────

const BOLD = "Helvetica-Bold";
const ITALIC = "Helvetica-Oblique";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 30,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 14,
    fontFamily: BOLD,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 24,
  },
  table: {
    border: "1 solid #000",
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
  },
  borderTop: {
    borderTop: "1 solid #000",
  },
  borderRight: {
    borderRight: "1 solid #000",
  },
  infoCell: {
    padding: 5,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  label: {
    fontSize: 10,
    fontFamily: BOLD,
    marginRight: 4,
  },
  value: {
    fontSize: 10,
  },
  // ── Pages d'évaluation ──
  evalPage: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
  },
  titleBar: {
    border: "1 solid #000",
    paddingVertical: 2,
    marginBottom: 8,
  },
  identityBar: {
    flexDirection: "row",
    border: "1 solid #000",
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  identityText: {
    fontSize: 9,
  },
  barTitle: {
    fontSize: 9,
    fontFamily: BOLD,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
  },
  headerLabel: {
    flex: 1,
    fontSize: 8,
    fontFamily: BOLD,
    textAlign: "center",
    paddingVertical: 2,
  },
  headerCheck: {
    fontSize: 8,
    fontFamily: BOLD,
    textAlign: "center",
    paddingVertical: 2,
    borderLeft: "1 solid #000",
  },
  categoryRow: {
    borderBottom: "1 solid #000",
  },
  categoryText: {
    fontSize: 8,
    fontFamily: BOLD,
    textAlign: "center",
    paddingVertical: 2,
  },
  techniqueRow: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
  },
  techniqueLabel: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    justifyContent: "center",
  },
  techniqueCheck: {
    borderLeft: "1 solid #000",
  },
  sideBox: {
    border: "1 solid #000",
    padding: 6,
    marginTop: 10,
  },
  footnote: {
    fontSize: 7.5,
    fontFamily: ITALIC,
  },
  checkbox: {
    width: 8,
    height: 8,
    border: "1 solid #000",
    marginRight: 4,
  },
  pse2Frame: {
    border: "1 solid #000",
    padding: 8,
    minHeight: 560,
  },
  summaryRow: {
    flexDirection: "row",
    border: "1 solid #000",
    backgroundColor: "#dbe5f1",
    marginTop: 8,
    marginHorizontal: 6,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: BOLD,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  summaryChoice: {
    width: 45,
    fontSize: 9,
    fontFamily: BOLD,
    textAlign: "center",
    paddingVertical: 2,
    borderLeft: "1 solid #000",
  },
  observations: {
    fontSize: 9,
    fontFamily: BOLD,
    marginTop: 4,
  },
});

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────

function getTrainingDates(
  startDate: Date | null,
  slots: Slot[]
): { start: string; end: string } {
  const times = slots.map((s) => new Date(s.date).getTime());
  if (times.length === 0) {
    const d = startDate ? dayjs(startDate).format("DD/MM/YYYY") : "";
    return { start: d, end: d };
  }
  return {
    start: dayjs(Math.min(...times)).format("DD/MM/YYYY"),
    end: dayjs(Math.max(...times)).format("DD/MM/YYYY"),
  };
}

function formatDateRange(start: string, end: string): string {
  return start === end ? start : `du ${start} au ${end}`;
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────────────────────────────────

interface TechniqueTableTheme {
  headerLabel: string;
  checkLabel: string;
  checkWidth: number;
  headerColor: string;
  categoryColor: string;
  categoryTextColor: string;
  fontSize: number;
  bold: boolean;
  rowMinHeight: number;
}

const PSE1_THEME: TechniqueTableTheme = {
  headerLabel: "Evaluation de la technicité",
  checkLabel: "V*",
  checkWidth: 34,
  headerColor: "#ffff00",
  categoryColor: "#2e75b6",
  categoryTextColor: "#ffffff",
  fontSize: 7.5,
  bold: false,
  rowMinHeight: 14,
};

const PSE2_THEME: TechniqueTableTheme = {
  headerLabel: "Évaluation de la technicité :",
  checkLabel: "Validé*",
  checkWidth: 70,
  headerColor: "#ffff99",
  categoryColor: "#9dd9f7",
  categoryTextColor: "#000000",
  fontSize: 8.5,
  bold: true,
  rowMinHeight: 20,
};

const TechniqueTable: React.FC<{
  sections: TechniqueSection[];
  theme: TechniqueTableTheme;
  style?: React.ComponentProps<typeof View>["style"];
}> = ({ sections, theme, style }) => (
  <View style={[{ border: "1 solid #000", borderBottom: 0 }, style ?? {}]}>
    <View style={[styles.headerRow, { backgroundColor: theme.headerColor }]}>
      <Text style={styles.headerLabel}>{theme.headerLabel}</Text>
      <Text style={[styles.headerCheck, { width: theme.checkWidth }]}>
        {theme.checkLabel}
      </Text>
    </View>
    {sections.map((section, si) => (
      <View key={section.title ?? si}>
        {section.title && (
          <View
            style={[
              styles.categoryRow,
              { backgroundColor: theme.categoryColor },
            ]}
          >
            <Text
              style={[styles.categoryText, { color: theme.categoryTextColor }]}
            >
              {section.title}
            </Text>
          </View>
        )}
        {section.techniques.map((technique) => (
          <View
            key={technique}
            style={[styles.techniqueRow, { minHeight: theme.rowMinHeight }]}
            wrap={false}
          >
            <View style={styles.techniqueLabel}>
              <Text
                style={{
                  fontSize: theme.fontSize,
                  fontFamily: theme.bold ? BOLD : "Helvetica",
                }}
              >
                {technique}
              </Text>
            </View>
            <View
              style={[styles.techniqueCheck, { width: theme.checkWidth }]}
            />
          </View>
        ))}
      </View>
    ))}
  </View>
);

const Checkbox: React.FC<{ label: string }> = ({ label }) => (
  <View style={[styles.row, { alignItems: "center", marginHorizontal: 12 }]}>
    <View style={styles.checkbox} />
    <Text style={{ fontSize: 9, fontFamily: BOLD }}>{label}</Text>
  </View>
);

interface InfoPageProps {
  level: PseLevel;
  datesStr: string;
  location: string;
  inscription: Inscription;
  equipePedagogique: string[];
}

/**
 * Page 1 : renseignements (commune au PSE 1 et au PSE 2)
 */
const InfoPage: React.FC<InfoPageProps> = ({
  level,
  datesStr,
  location,
  inscription,
  equipePedagogique,
}) => {
  const trainee = inscription.trainee;
  const dob = trainee?.dateOfBirth
    ? dayjs(trainee.dateOfBirth).format("DD/MM/YYYY")
    : "";
  const dobStr = [dob, trainee?.birthPlace].filter(Boolean).join(" à ");

  // Le modèle prévoit au moins 2 lignes pour l'équipe pédagogique
  const equipeRows = [...equipePedagogique];
  while (equipeRows.length < 2) equipeRows.push("");

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>FICHE DE SUIVI INDIVIDUEL D'EVALUATION</Text>
      <Text style={styles.subtitle}>{LEVEL_LABELS[level]}</Text>

      <View style={styles.table}>
        <View style={styles.row}>
          <View style={[styles.infoCell, { width: "40%" }, styles.borderRight]}>
            <Text style={styles.label}>Dates de formation :</Text>
          </View>
          <View style={[styles.infoCell, { flex: 1 }]}>
            <Text style={styles.value}>{datesStr}</Text>
          </View>
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <View style={[styles.infoCell, { width: "40%" }, styles.borderRight]}>
            <Text style={styles.label}>Lieu :</Text>
          </View>
          <View style={[styles.infoCell, { flex: 1 }]}>
            <Text style={styles.value}>{location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.row, { minHeight: 40 }]}>
          <View style={[styles.infoCell, { flex: 1 }, styles.borderRight]}>
            <Text style={styles.label}>Nom :</Text>
            <Text style={styles.value}>{trainee?.lastName ?? ""}</Text>
          </View>
          <View style={[styles.infoCell, { flex: 1 }]}>
            <Text style={styles.label}>Prénom :</Text>
            <Text style={styles.value}>{trainee?.firstName ?? ""}</Text>
          </View>
        </View>
        <View style={[styles.infoCell, styles.borderTop, { minHeight: 40 }]}>
          <Text style={styles.label}>Date et lieu de naissance :</Text>
          <Text style={styles.value}>{dobStr}</Text>
        </View>
        <View style={[styles.infoCell, styles.borderTop, { minHeight: 80 }]}>
          <Text style={styles.label}>Adresse :</Text>
          <Text style={styles.value}>{trainee?.address ?? ""}</Text>
        </View>
        <View style={[styles.infoCell, styles.borderTop, { minHeight: 34 }]}>
          <Text style={styles.label}>Tél :</Text>
          <Text style={styles.value}>{trainee?.phone ?? ""}</Text>
        </View>
        <View style={[styles.infoCell, styles.borderTop, { minHeight: 40 }]}>
          <Text style={styles.label}>Mail :</Text>
          <Text style={styles.value}>{trainee?.email ?? ""}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.row, { minHeight: 40 }]}>
          <View style={[styles.infoCell, { width: "50%" }, styles.borderRight]}>
            <Text style={styles.label}>Responsable pédagogique :</Text>
          </View>
          <View style={[styles.infoCell, { flex: 1 }]} />
        </View>
        <View style={[styles.row, styles.borderTop]}>
          <View style={[styles.infoCell, { width: "50%" }, styles.borderRight]}>
            <Text style={styles.label}>Equipe pédagogique :</Text>
          </View>
          <View style={{ flex: 1 }}>
            {equipeRows.map((name, i) => (
              <View
                key={i}
                style={[
                  styles.infoCell,
                  { minHeight: 40 },
                  i > 0 ? styles.borderTop : {},
                ]}
              >
                <Text style={styles.value}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Page>
  );
};

interface EvaluationPageProps {
  lastName: string;
  firstName: string;
  start: string;
  end: string;
}

/**
 * Page 2 PSE 1 : grille sur 2 colonnes, synthèse dans la colonne de droite
 */
const Pse1EvaluationPage: React.FC<EvaluationPageProps> = ({
  lastName,
  firstName,
  start,
  end,
}) => (
  <Page size="A4" style={styles.evalPage}>
    <View style={styles.titleBar}>
      <Text style={styles.barTitle}>
        Evaluation des techniques et procédures PSE1
      </Text>
    </View>
    <View style={styles.identityBar}>
      <Text style={[styles.identityText, { flex: 1 }]}>Nom : {lastName}</Text>
      <Text style={[styles.identityText, { flex: 1 }]}>
        Prénom : {firstName}
      </Text>
      <Text style={[styles.identityText, { flex: 1.2 }]}>
        date : {formatDateRange(start, end)}
      </Text>
    </View>

    <View style={[styles.row, { gap: 24 }]}>
      <TechniqueTable
        sections={PSE1_LEFT}
        theme={PSE1_THEME}
        style={{ flex: 1 }}
      />
      <View style={{ flex: 1 }}>
        <TechniqueTable
          sections={PSE1_RIGHT}
          theme={{ ...PSE1_THEME, categoryColor: "#5b9bd5" }}
        />
        <View style={[styles.sideBox, { marginTop: 0, borderTop: 0, flex: 1 }]}>
          <Text style={[styles.footnote, { marginTop: 24 }]}>
            *Mettre une croix lorsque l'apprenant a réalisé correctement la
            technique lors de la phase d'apprentissage ou la mise en situation
            (cas concret)
          </Text>
        </View>
        <View
          style={[styles.sideBox, { marginTop: 0, borderTop: 0, flex: 1.6 }]}
        >
          <Text style={{ fontSize: 9, fontFamily: BOLD, marginTop: 30 }}>
            Synthèse de l'évaluation des techniques et procédures :
          </Text>
          <Text style={{ fontSize: 9, marginTop: 12 }}>
            Chaque technique a été réalisée correctement au moins 1 fois :
          </Text>
          <View
            style={[styles.row, { justifyContent: "center", marginTop: 14 }]}
          >
            <Checkbox label="OUI" />
            <Checkbox label="NON" />
          </View>
          <Text style={{ fontSize: 9, marginTop: 50 }}>Observations :</Text>
        </View>
      </View>
    </View>
  </Page>
);

/**
 * Page 2 PSE 2 : deux tableaux sur une colonne
 */
const Pse2EvaluationPage: React.FC<EvaluationPageProps> = ({
  lastName,
  firstName,
  start,
  end,
}) => (
  <Page size="A4" style={styles.evalPage}>
    <View style={styles.identityBar}>
      <Text style={[styles.identityText, { flex: 1 }]}>Nom : {lastName}</Text>
      <Text style={[styles.identityText, { flex: 1 }]}>
        Prénom : {firstName}
      </Text>
      <Text style={[styles.identityText, { flex: 1.4 }]}>
        Formation du {start} au {end}
      </Text>
    </View>

    <View style={styles.pse2Frame}>
      <Text style={[styles.barTitle, { fontSize: 10, marginBottom: 8 }]}>
        EVALUATION DES TECHNIQUES ET PROCEDURES PSE2
      </Text>
      {PSE2_TABLES.map((section) => (
        <TechniqueTable
          key={section.title}
          sections={[section]}
          theme={PSE2_THEME}
          style={{ width: "93%", marginBottom: 12 }}
        />
      ))}
    </View>

    <Text style={[styles.footnote, { marginTop: 3 }]}>
      *Mettre une croix lorsque le participant a réalisé correctement la
      technique lors de l'apprentissage ou la mise en situation (cas concret).
    </Text>

    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>
        Chaque technique a été réalisée correctement au moins 1 fois
      </Text>
      <Text style={styles.summaryChoice}>OUI</Text>
      <Text style={styles.summaryChoice}>NON</Text>
    </View>
    <Text style={styles.observations}>Observations :</Text>
  </Page>
);

export interface FisePsePagesProps {
  level: PseLevel;
  session: {
    location: string;
    startDate: Date | null;
    slots: Slot[];
  };
  inscription: Inscription;
  equipePedagogique: string[];
}

/**
 * Fiche de suivi individuel d'évaluation PSE 1 / PSE 2 (2 pages par participant)
 */
export const FisePsePages: React.FC<FisePsePagesProps> = ({
  level,
  session,
  inscription,
  equipePedagogique,
}) => {
  const { start, end } = getTrainingDates(session.startDate, session.slots);
  const evaluationProps: EvaluationPageProps = {
    lastName: inscription.trainee?.lastName ?? "",
    firstName: inscription.trainee?.firstName ?? "",
    start,
    end,
  };

  return (
    <>
      <InfoPage
        level={level}
        datesStr={formatDateRange(start, end)}
        location={session.location}
        inscription={inscription}
        equipePedagogique={equipePedagogique}
      />
      {level === "PSE1" ? (
        <Pse1EvaluationPage {...evaluationProps} />
      ) : (
        <Pse2EvaluationPage {...evaluationProps} />
      )}
    </>
  );
};
