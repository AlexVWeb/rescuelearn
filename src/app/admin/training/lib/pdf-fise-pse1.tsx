import React from "react";
import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { Slot, Inscription } from "../types";

// ──────────────────────────────────────────────────────────────────────────
// TECHNIQUES (Annexe 1 du référentiel interne SFCB – PSE 1)
// ──────────────────────────────────────────────────────────────────────────

interface TechniqueCategory {
  title: string;
  techniques: string[];
}

const LEFT_COLUMN: TechniqueCategory[][] = [
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

const RIGHT_COLUMN: TechniqueCategory[][] = [
  [
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
  ],
];

// ──────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────

const YELLOW = "#ffff00";
const BLUE = "#00b0f0";
const CHECK_COL_WIDTH = 50;

const styles = StyleSheet.create({
  page: {
    paddingVertical: 30,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
    marginRight: 4,
  },
  value: {
    fontSize: 10,
  },
  // ── Page 2 ──
  evalPage: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    fontFamily: "Helvetica",
  },
  identityBar: {
    flexDirection: "row",
    border: "1 solid #000",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  identityText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  evalFrame: {
    border: "1 solid #000",
    padding: 4,
  },
  evalTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  columns: {
    flexDirection: "row",
    gap: 8,
  },
  column: {
    flex: 1,
  },
  block: {
    border: "1 solid #000",
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: YELLOW,
    borderBottom: "1 solid #000",
  },
  headerLabel: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 2,
  },
  headerCheck: {
    width: CHECK_COL_WIDTH,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 2,
    borderLeft: "1 solid #000",
  },
  categoryRow: {
    backgroundColor: BLUE,
    borderBottom: "1 solid #000",
  },
  categoryText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 2,
  },
  techniqueRow: {
    flexDirection: "row",
    minHeight: 17,
  },
  techniqueLabel: {
    flex: 1,
    fontSize: 7,
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: "center",
  },
  techniqueCheck: {
    width: CHECK_COL_WIDTH,
    borderLeft: "1 solid #000",
  },
  footnote: {
    fontSize: 7,
    fontFamily: "Helvetica-Oblique",
    marginTop: 3,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    border: "1 solid #000",
    backgroundColor: "#dbe5f1",
    marginHorizontal: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  summaryChoice: {
    width: CHECK_COL_WIDTH,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 2,
    borderLeft: "1 solid #000",
  },
  observations: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
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

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────────────────────────────────

const TechniqueBlock: React.FC<{
  categories: TechniqueCategory[];
  withHeader: boolean;
}> = ({ categories, withHeader }) => (
  <View style={styles.block}>
    {withHeader && (
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>Évaluation de la technicité :</Text>
        <Text style={styles.headerCheck}>Validé*</Text>
      </View>
    )}
    {categories.map((category, ci) => (
      <View key={category.title}>
        <View
          style={[
            styles.categoryRow,
            ci > 0 ? { borderTop: "1 solid #000" } : {},
          ]}
        >
          <Text style={styles.categoryText}>{category.title}</Text>
        </View>
        {category.techniques.map((technique, ti) => (
          <View
            key={technique}
            style={[styles.techniqueRow, ti > 0 ? styles.borderTop : {}]}
            wrap={false}
          >
            <View style={styles.techniqueLabel}>
              <Text>{technique}</Text>
            </View>
            <View style={styles.techniqueCheck} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

export interface FisePse1PagesProps {
  session: {
    location: string;
    startDate: Date | null;
    slots: Slot[];
  };
  inscription: Inscription;
  equipePedagogique: string[];
}

/**
 * Fiche de suivi individuel d'évaluation PSE 1 (2 pages par participant)
 */
export const FisePse1Pages: React.FC<FisePse1PagesProps> = ({
  session,
  inscription,
  equipePedagogique,
}) => {
  const trainee = inscription.trainee;
  const { start, end } = getTrainingDates(session.startDate, session.slots);
  const datesStr = start === end ? start : `du ${start} au ${end}`;

  const dob = trainee?.dateOfBirth
    ? dayjs(trainee.dateOfBirth).format("DD/MM/YYYY")
    : "";
  const dobStr = [dob, trainee?.birthPlace].filter(Boolean).join(" à ");

  // Le modèle prévoit au moins 2 lignes pour l'équipe pédagogique
  const equipeRows = [...equipePedagogique];
  while (equipeRows.length < 2) equipeRows.push("");

  return (
    <>
      {/* ── PAGE 1 : RENSEIGNEMENTS ─────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FICHE DE SUIVI INDIVIDUEL D'EVALUATION</Text>
        <Text style={styles.subtitle}>
          PREMIERS SECOURS EN EQUIPE DE NIVEAU 1
        </Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <View
              style={[styles.infoCell, { width: "40%" }, styles.borderRight]}
            >
              <Text style={styles.label}>Dates de formation :</Text>
            </View>
            <View style={[styles.infoCell, { flex: 1 }]}>
              <Text style={styles.value}>{datesStr}</Text>
            </View>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <View
              style={[styles.infoCell, { width: "40%" }, styles.borderRight]}
            >
              <Text style={styles.label}>Lieu :</Text>
            </View>
            <View style={[styles.infoCell, { flex: 1 }]}>
              <Text style={styles.value}>{session.location}</Text>
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
            <View
              style={[styles.infoCell, { width: "50%" }, styles.borderRight]}
            >
              <Text style={styles.label}>Responsable pédagogique :</Text>
            </View>
            <View style={[styles.infoCell, { flex: 1 }]} />
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <View
              style={[styles.infoCell, { width: "50%" }, styles.borderRight]}
            >
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

      {/* ── PAGE 2 : ÉVALUATION DES TECHNIQUES ──────────────────────────────── */}
      <Page size="A4" style={styles.evalPage}>
        <View style={styles.identityBar}>
          <Text style={[styles.identityText, { flex: 1 }]}>
            Nom : {trainee?.lastName ?? ""}
          </Text>
          <Text style={[styles.identityText, { flex: 1 }]}>
            Prénom : {trainee?.firstName ?? ""}
          </Text>
          <Text style={[styles.identityText, { flex: 1.4 }]}>
            Formation du {start} au {end}
          </Text>
        </View>

        <View style={styles.evalFrame}>
          <Text style={styles.evalTitle}>
            Evaluation des techniques et procédures PSE 1
          </Text>
          <View style={styles.columns}>
            {[LEFT_COLUMN, RIGHT_COLUMN].map((blocks, col) => (
              <View key={col} style={styles.column}>
                {blocks.map((categories, bi) => (
                  <TechniqueBlock
                    key={bi}
                    categories={categories}
                    withHeader={bi === 0}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footnote}>
          *Mettre une croix lorsque le participant a réalisé correctement la
          technique lors de l'apprentissage ou la mise en situation (cas
          concret).
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
    </>
  );
};
