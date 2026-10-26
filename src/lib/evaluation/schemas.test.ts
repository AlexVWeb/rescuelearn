import { describe, it, expect } from "vitest";
import { getCurrentQuestionnaire } from "./questionnaires";
import {
  parseStoredAnswers,
  readAnswersFromForm,
  readConsent,
  REQUIRED_MESSAGE,
  stripHtml,
  validateAnswers,
} from "./schemas";

const hot = getCurrentQuestionnaire("chaud");
const cold = getCurrentQuestionnaire("froid");

const completeHot = {
  satisfaction_globale: 4,
  organisation: 3,
  rythme: "adapte",
  explications: 4,
  mises_en_situation: 3,
  objectifs_atteints: 4,
  capacite_intervenir: 3,
  attentes: true,
  nps: 9,
};

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("validateAnswers", () => {
  it("accepte une réponse complète", () => {
    const result = validateAnswers(hot, completeHot, "submit");
    expect(result).toEqual({ success: true, answers: completeHot });
  });

  it("exige les questions obligatoires à la soumission", () => {
    const { nps: _nps, ...incomplete } = completeHot;
    const result = validateAnswers(hot, incomplete, "submit");
    expect(result).toEqual({
      success: false,
      fieldErrors: { nps: REQUIRED_MESSAGE },
    });
  });

  it("accepte un brouillon partiel", () => {
    expect(validateAnswers(hot, { nps: 3 }, "draft")).toEqual({
      success: true,
      answers: { nps: 3 },
    });
  });

  it("refuse une note hors échelle", () => {
    const result = validateAnswers(
      hot,
      { ...completeHot, organisation: 5 },
      "submit"
    );
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.fieldErrors.organisation).toMatch(/1 à 4/);
  });

  it("refuse un NPS non entier ou hors bornes", () => {
    expect(validateAnswers(hot, { nps: 11 }, "draft").success).toBe(false);
    expect(validateAnswers(hot, { nps: 7.5 }, "draft").success).toBe(false);
    expect(validateAnswers(hot, { nps: -1 }, "draft").success).toBe(false);
  });

  it("refuse un choix qui n'existe pas", () => {
    expect(validateAnswers(hot, { rythme: "ultra" }, "draft").success).toBe(
      false
    );
  });

  it("refuse les doublons et les valeurs inconnues d'un choix multiple", () => {
    expect(
      validateAnswers(cold, { gestes_utilises: ["pls", "pls"] }, "draft")
        .success
    ).toBe(false);
    expect(
      validateAnswers(cold, { gestes_utilises: ["voler"] }, "draft").success
    ).toBe(false);
    expect(
      validateAnswers(cold, { gestes_utilises: ["pls", "rcp"] }, "draft")
    ).toEqual({ success: true, answers: { gestes_utilises: ["pls", "rcp"] } });
  });

  it("refuse une clé inconnue (schéma strict)", () => {
    const result = validateAnswers(
      hot,
      { ...completeHot, traineeId: "x" },
      "submit"
    );
    expect(result).toEqual({
      success: false,
      fieldErrors: { _form: expect.any(String) },
    });
  });

  it("refuse un payload qui n'est pas un objet", () => {
    expect(validateAnswers(hot, "nps=10", "draft").success).toBe(false);
    expect(validateAnswers(hot, null, "draft").success).toBe(false);
    expect(validateAnswers(hot, [], "draft").success).toBe(false);
  });

  it("retire les balises HTML du texte libre", () => {
    const result = validateAnswers(
      hot,
      { suggestions: "<script>alert(1)</script>Plus de pratique <b>svp</b>" },
      "draft"
    );
    expect(result).toEqual({
      success: true,
      answers: { suggestions: "alert(1)Plus de pratique svp" },
    });
  });

  it("limite le texte libre à 2000 caractères", () => {
    expect(
      validateAnswers(hot, { suggestions: "a".repeat(2000) }, "draft").success
    ).toBe(true);
    expect(
      validateAnswers(hot, { suggestions: "a".repeat(2001) }, "draft").success
    ).toBe(false);
  });

  it("ignore un texte vide après nettoyage", () => {
    expect(validateAnswers(hot, { suggestions: "<p></p>" }, "draft")).toEqual({
      success: true,
      answers: {},
    });
  });

  it("refuse un type inattendu", () => {
    expect(validateAnswers(hot, { attentes: "oui" }, "draft").success).toBe(
      false
    );
    expect(validateAnswers(hot, { suggestions: 42 }, "draft").success).toBe(
      false
    );
  });
});

describe("readAnswersFromForm", () => {
  it("convertit les champs natifs dans les types attendus", () => {
    const raw = readAnswersFromForm(
      cold,
      form([
        ["situation_reelle", "oui"],
        ["gestes_utilises", "pls"],
        ["gestes_utilises", "rcp"],
        ["utilite", "3"],
        ["souhait_recyclage", "non"],
        ["nps", "10"],
        ["commentaire", "  "],
        ["$ACTION_ID_abc", ""],
        ["inconnu", "x"],
      ])
    );
    expect(raw).toEqual({
      situation_reelle: true,
      gestes_utilises: ["pls", "rcp"],
      utilite: 3,
      souhait_recyclage: false,
      nps: 10,
    });
  });

  it("conserve une valeur mal formée pour que la validation la refuse", () => {
    const raw = readAnswersFromForm(
      hot,
      form([
        ["nps", "dix"],
        ["attentes", "peut-être"],
      ])
    );
    expect(raw).toEqual({ nps: "dix", attentes: "peut-être" });
    expect(validateAnswers(hot, raw, "draft").success).toBe(false);
  });
});

describe("readConsent", () => {
  it("vrai seulement si la case est cochée", () => {
    expect(readConsent(form([["consent", "on"]]))).toBe(true);
    expect(readConsent(form([]))).toBe(false);
    expect(readConsent(form([["consent", "true"]]))).toBe(false);
  });
});

describe("parseStoredAnswers", () => {
  it("relit des réponses valides et ignore un JSON corrompu", () => {
    expect(parseStoredAnswers(hot, { nps: 8 })).toEqual({ nps: 8 });
    expect(parseStoredAnswers(hot, { nps: "x" })).toEqual({});
  });
});

describe("stripHtml", () => {
  it("retire les balises, même non fermées", () => {
    expect(stripHtml("a <img src=x onerror=alert(1)")).toBe("a");
    expect(stripHtml(" <i>ok</i> ")).toBe("ok");
  });
});
