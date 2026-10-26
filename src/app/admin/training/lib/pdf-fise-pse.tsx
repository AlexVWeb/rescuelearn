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

/**
 * Colonne de gauche : un tableau par groupe (le premier porte l'en-tête),
 * comme dans le référentiel
 */
const PSE1_LEFT: TechniqueSection[][] = [
  [
    {
      title: "Attitude et comportement :",
      techniques: [
        "Évaluation de l'impact psychologique",
        "Stabiliser l'état psycho-physiologique d'une victime",
        "L'écoute active",
        "La respiration contrôlée",
        "La focalisation / défocalisation attentionnelle",
      ],
    },
    {
      title: "Bilans :",
      techniques: [
        "Retournement à deux secouristes",
        "Retournement d'urgence à un secouriste",
        "Gestes complémentaires d'examen",
        "Interrogatoire de la victime",
        "Mesure de la glycémie capillaire",
        "Mesure de la pression artérielle",
        "Mesure de la saturation pulsée en oxygène",
        "Mesure de la température",
        "Recherche d'une détresse vitale",
        "Repérage en cas de nombreuses victimes",
      ],
    },
  ],
  [
    {
      title: "Protection et sécurité :",
      techniques: ["Dégagement d'urgence"],
    },
  ],
  [
    {
      title: "Hygiène et asepsie :",
      techniques: [
        "Équipement en moyens de protection contre les agents infectieux",
        "Friction des mains",
        "Lavage des mains",
        "Mise en place de gants stériles",
        "Nettoyage et désinfection d'un véhicule ou d'un local",
        "Nettoyage et désinfection du matériel",
        "Retrait de gants à usage unique",
        "Utilisation des détergents et désinfectants",
        "Utilisation des emballages à élimination de déchets",
      ],
    },
  ],
  [
    {
      title: "Malaises et affection spécifiques :",
      techniques: [
        "Positions d'attente et de transport",
        "Aide à la prise de médicaments",
        "Manœuvres physiques",
      ],
    },
  ],
];

const PSE1_RIGHT: TechniqueSection[] = [
  {
    title: "Urgences vitales :",
    techniques: [
      "Administration d'oxygène par insufflation",
      "Aspiration de mucosités",
      "Compression manuelle",
      "Compressions thoraciques",
      "Désobstruction par la méthode des claques dans le dos",
      "Désobstruction par la méthode des compressions abdominales",
      "Désobstruction par la méthode des compressions thoraciques",
      "Garrot",
      "Libération des voies aériennes chez une victime assise",
      "Libération des voies aériennes chez une victime non traumatisée",
      "Libération des voies aériennes chez une victime traumatisée",
      "Mise en place d'une canule oropharyngée",
      "Pansement compressif",
      "Pansement imbibé de substance hémostatique",
      "Utilisation d'un défibrillateur automatisé externe",
      "Ventilation artificielle par une méthode orale",
      "Ventilation artificielle par un insufflateur manuel",
      "Position latérale de sécurité à deux secouristes",
      "Position latérale de sécurité à un secouriste",
      "Administration d'oxygène par inhalation",
      "Utilisation d'une bouteille d'oxygène",
    ],
  },
  {
    title: "Traumatismes :",
    techniques: [
      "Immobilisation d'un membre au moyen d'une attelle à dépression",
      "Immobilisation d'un membre au moyen d'une attelle modulable",
      "Immobilisation d'un membre supérieur au moyen d'écharpes",
      "Maintien de la tête en position neutre",
      "Pose d'un collier cervical (allongé et assis)",
      "Retrait d'un casque de protection",
      "Application de froid",
      "Emballage au moyen d'un pansement stérile",
      "Maintien d'un pansement",
      "Pansement",
      "Utilisation d'un lot membre arraché ou sectionné",
    ],
  },
  {
    title: "Relevage et brancardage :",
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
  footnote: {
    fontSize: 7.5,
    fontFamily: ITALIC,
  },
  pse1Frame: {
    border: "1 solid #000",
    padding: 6,
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
  headerLabel: "Évaluation de la technicité :",
  checkLabel: "Validé*",
  checkWidth: 40,
  headerColor: "#ffff00",
  categoryColor: "#00b0f0",
  categoryTextColor: "#000000",
  fontSize: 6.6,
  bold: true,
  rowMinHeight: 15.5,
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
  /** Faux : tableau de suite, sans la ligne jaune d'en-tête */
  showHeader?: boolean;
}> = ({ sections, theme, style, showHeader = true }) => (
  <View style={[{ border: "1 solid #000", borderBottom: 0 }, style ?? {}]}>
    {showHeader && (
      <View style={[styles.headerRow, { backgroundColor: theme.headerColor }]}>
        <Text style={styles.headerLabel}>{theme.headerLabel}</Text>
        <Text style={[styles.headerCheck, { width: theme.checkWidth }]}>
          {theme.checkLabel}
        </Text>
      </View>
    )}
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

interface EvaluationPageProps {
  lastName: string;
  firstName: string;
  start: string;
  end: string;
}

/** Bandeau d'identité du participant, rappelé au-dessus de la grille */
const IdentityBar: React.FC<
  EvaluationPageProps & { style?: React.ComponentProps<typeof View>["style"] }
> = ({ lastName, firstName, start, end, style }) => (
  <View style={[styles.identityBar, style ?? {}]}>
    <Text style={[styles.identityText, { flex: 1 }]}>Nom : {lastName}</Text>
    <Text style={[styles.identityText, { flex: 1 }]}>Prénom : {firstName}</Text>
    <Text style={[styles.identityText, { flex: 1.4 }]}>
      Formation du {start} au {end}
    </Text>
  </View>
);

interface InfoPageProps {
  level: PseLevel;
  datesStr: string;
  location: string;
  inscription: Inscription;
  equipePedagogique: string[];
  responsablePedagogique?: string;
  /** PSE 2 : le bandeau d'identité clôt la page 1 (cf. référentiel) */
  identity?: EvaluationPageProps;
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
  responsablePedagogique,
  identity,
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
          <Text style={styles.label}>
            {level === "PSE2" ? "Tél. :" : "Tél :"}
          </Text>
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
          <View style={[styles.infoCell, { flex: 1 }]}>
            <Text style={styles.value}>{responsablePedagogique ?? ""}</Text>
          </View>
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

      {identity && <IdentityBar {...identity} style={{ marginTop: 30 }} />}
    </Page>
  );
};

/**
 * Page 2 PSE 1 : grille sur 2 colonnes dans un cadre, synthèse en pied de page
 * (même pied que le PSE 2, conforme au référentiel)
 */
const Pse1EvaluationPage: React.FC<EvaluationPageProps> = ({
  lastName,
  firstName,
  start,
  end,
}) => (
  <Page size="A4" style={styles.evalPage}>
    <IdentityBar
      lastName={lastName}
      firstName={firstName}
      start={start}
      end={end}
    />

    <View style={styles.pse1Frame}>
      <Text style={[styles.barTitle, { marginBottom: 6 }]}>
        Evaluation des techniques et procédures PSE 1
      </Text>
      {/* Chaque colonne garde sa hauteur : pas de cadre étiré sous la plus courte */}
      <View style={[styles.row, { gap: 24, alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          {PSE1_LEFT.map((group, i) => (
            <TechniqueTable
              key={group[0].title}
              sections={group}
              theme={PSE1_THEME}
              showHeader={i === 0}
              style={i > 0 ? { marginTop: 10 } : undefined}
            />
          ))}
        </View>
        <TechniqueTable
          sections={PSE1_RIGHT}
          theme={PSE1_THEME}
          style={{ flex: 1 }}
        />
      </View>
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

/**
 * Page 2 PSE 2 : deux tableaux sur une colonne (identité en bas de page 1)
 */
const Pse2EvaluationPage: React.FC = () => (
  <Page size="A4" style={styles.evalPage}>
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
  responsablePedagogique?: string;
}

/**
 * Fiche de suivi individuel d'évaluation PSE 1 / PSE 2 (2 pages par participant)
 */
export const FisePsePages: React.FC<FisePsePagesProps> = ({
  level,
  session,
  inscription,
  equipePedagogique,
  responsablePedagogique,
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
        responsablePedagogique={responsablePedagogique}
        identity={level === "PSE2" ? evaluationProps : undefined}
      />
      {level === "PSE1" ? (
        <Pse1EvaluationPage {...evaluationProps} />
      ) : (
        <Pse2EvaluationPage />
      )}
    </>
  );
};
