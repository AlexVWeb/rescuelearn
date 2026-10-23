import { describe, it, expect } from "vitest";
import {
  getMaxPerGroup,
  requiredGroupCount,
  defaultGroupCount,
  groupName,
  isCountedInscription,
  checkGroups,
  balancedSizes,
  buildGroups,
} from "./group-rules";

describe("getMaxPerGroup", () => {
  it("applique les ratios nationaux", () => {
    expect(getMaxPerGroup("PSC")).toBe(10);
    expect(getMaxPerGroup("PSE1")).toBe(12);
    expect(getMaxPerGroup("PSE2")).toBe(12);
  });
  it("retourne null pour les types sans règle", () => {
    expect(getMaxPerGroup("SST")).toBeNull();
  });
});

describe("requiredGroupCount", () => {
  it("arrondit au supérieur", () => {
    expect(requiredGroupCount("PSE1", 24)).toBe(2);
    expect(requiredGroupCount("PSE1", 25)).toBe(3);
    expect(requiredGroupCount("PSC", 11)).toBe(2);
  });
  it("0 apprenant → 0 groupe", () => {
    expect(requiredGroupCount("PSC", 0)).toBe(0);
  });
  it("type sans règle → 1 groupe", () => {
    expect(requiredGroupCount("SST", 30)).toBe(1);
  });
});

describe("defaultGroupCount", () => {
  it("prend le max entre formateurs et groupes requis", () => {
    expect(defaultGroupCount("PSE1", 24, 3)).toBe(3);
    expect(defaultGroupCount("PSE1", 30, 2)).toBe(3);
  });
  it("au moins 1", () => {
    expect(defaultGroupCount("SST", 0, 0)).toBe(1);
  });
});

describe("groupName", () => {
  it("nomme A, B, … puis numérote", () => {
    expect(groupName(0)).toBe("Groupe A");
    expect(groupName(25)).toBe("Groupe Z");
    expect(groupName(26)).toBe("Groupe 27");
  });
});

describe("isCountedInscription", () => {
  it("exclut les éliminés", () => {
    expect(isCountedInscription("inscrit")).toBe(true);
    expect(isCountedInscription("éliminé")).toBe(false);
  });
});

describe("checkGroups", () => {
  const group = (
    id: string,
    traineeCount: number,
    formateurId: string | null
  ) => ({
    id,
    name: `G-${id}`,
    formateurId,
    traineeCount,
  });

  it("aucune alerte si conforme", () => {
    expect(
      checkGroups({
        type: "PSE1",
        groups: [group("a", 12, "f1"), group("b", 10, "f2")],
        formateurCount: 2,
        unassignedCount: 0,
      })
    ).toEqual([]);
  });

  it("signale un dépassement de ratio", () => {
    const warnings = checkGroups({
      type: "PSC",
      groups: [group("a", 11, "f1")],
      formateurCount: 1,
      unassignedCount: 0,
    });
    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "over_capacity", groupId: "a" })
    );
  });

  it("signale un groupe sans formateur", () => {
    const warnings = checkGroups({
      type: "PSC",
      groups: [group("a", 5, null)],
      formateurCount: 1,
      unassignedCount: 0,
    });
    expect(warnings.map((w) => w.code)).toContain("no_formateur");
  });

  it("signale un formateur référent sur plusieurs groupes", () => {
    const warnings = checkGroups({
      type: "PSC",
      groups: [group("a", 5, "f1"), group("b", 5, "f1")],
      formateurCount: 2,
      unassignedCount: 0,
    });
    expect(warnings.map((w) => w.code)).toContain("duplicate_formateur");
  });

  it("signale un manque de formateurs au regard du ratio", () => {
    const warnings = checkGroups({
      type: "PSE1",
      groups: [group("a", 13, "f1")],
      formateurCount: 1,
      unassignedCount: 0,
    });
    expect(warnings.map((w) => w.code)).toContain("not_enough_formateurs");
  });

  it("signale les apprenants non affectés quand des groupes existent", () => {
    const warnings = checkGroups({
      type: "PSE1",
      groups: [group("a", 5, "f1")],
      formateurCount: 1,
      unassignedCount: 3,
    });
    expect(warnings.map((w) => w.code)).toContain("unassigned");
  });

  it("type sans ratio : pas d'alerte de capacité", () => {
    const warnings = checkGroups({
      type: "SST",
      groups: [group("a", 40, "f1")],
      formateurCount: 1,
      unassignedCount: 0,
    });
    expect(warnings).toEqual([]);
  });
});

describe("balancedSizes", () => {
  it("répartit avec un écart max de 1", () => {
    expect(balancedSizes(25, 3)).toEqual([9, 8, 8]);
    expect(balancedSizes(2, 3)).toEqual([1, 1, 0]);
  });
});

describe("buildGroups", () => {
  const trainees = [
    { inscriptionId: "i1", lastName: "Martin", firstName: "Paul", age: 40 },
    { inscriptionId: "i2", lastName: "Bernard", firstName: "Lea", age: 18 },
    { inscriptionId: "i3", lastName: "Dubois", firstName: "Ana", age: 30 },
    { inscriptionId: "i4", lastName: "Adam", firstName: "Zoé", age: 22 },
    { inscriptionId: "i5", lastName: "Petit", firstName: "Jo", age: null },
  ];

  it("crée le nombre demandé, nommé et avec référents dans l'ordre", () => {
    const groups = buildGroups(trainees, ["f1"], {
      count: 2,
      strategy: "alphabetical",
    });
    expect(groups.map((g) => g.name)).toEqual(["Groupe A", "Groupe B"]);
    expect(groups.map((g) => g.formateurId)).toEqual(["f1", null]);
  });

  it("alphabétique : blocs contigus équilibrés", () => {
    const groups = buildGroups(trainees, [], {
      count: 2,
      strategy: "alphabetical",
    });
    expect(groups[0].inscriptionIds).toEqual(["i4", "i2", "i3"]);
    expect(groups[1].inscriptionIds).toEqual(["i1", "i5"]);
  });

  it("aléatoire : affecte chaque apprenant une seule fois, tailles équilibrées", () => {
    const groups = buildGroups(trainees, [], {
      count: 2,
      strategy: "random",
      random: () => 0.42,
    });
    const all = groups.flatMap((g) => g.inscriptionIds).sort();
    expect(all).toEqual(["i1", "i2", "i3", "i4", "i5"]);
    expect(groups.map((g) => g.inscriptionIds.length)).toEqual([3, 2]);
  });

  it("mixAges : serpentin par âge, âges inconnus en dernier", () => {
    const groups = buildGroups(trainees, [], {
      count: 2,
      strategy: "mixAges",
    });
    // tri : i2(18) i4(22) i3(30) i1(40) i5(null) → A,B,B,A,A
    expect(groups[0].inscriptionIds).toEqual(["i2", "i1", "i5"]);
    expect(groups[1].inscriptionIds).toEqual(["i4", "i3"]);
  });

  it("count < 1 est ramené à 1", () => {
    const groups = buildGroups(trainees, [], { count: 0, strategy: "random" });
    expect(groups).toHaveLength(1);
  });
});
