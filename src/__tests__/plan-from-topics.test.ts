import { describe, it, expect } from "vitest";
import {
  planNodesFromTopics,
  type PlannableTopic,
} from "@/lib/progression/plan-from-topics";

let seq = 0;
const topic = (
  chapter: string,
  title: string,
  overrides: Partial<PlannableTopic> = {}
): PlannableTopic => ({
  id: `t${++seq}`,
  chapter,
  title,
  order: seq,
  levels: ["PSE1"],
  questionCapacity: 6,
  ...overrides,
});

const ids = (plan: { topicIds: string[] }[]) => plan.map((n) => n.topicIds);

describe("planNodesFromTopics", () => {
  it("filtre par niveau et garde les sujets sans niveau", () => {
    const a = topic("Bilans", "A", { levels: ["PSE1"] });
    const b = topic("Bilans", "B", { levels: ["PSE2"] });
    const c = topic("Bilans", "C", { levels: ["PSE1", "PSE2"] });
    const d = topic("Bilans", "D", { levels: [] });

    expect(ids(planNodesFromTopics([a, b, c, d], "PSE2"))).toEqual([
      [b.id, c.id, d.id],
    ]);
    expect(ids(planNodesFromTopics([a, b, c, d], "PSE1"))).toEqual([
      [a.id, c.id, d.id],
    ]);
  });

  it("conserve l'ordre du référentiel", () => {
    const a = topic("Bilans", "A", { order: 30 });
    const b = topic("Bilans", "B", { order: 10 });
    const c = topic("Bilans", "C", { order: 20 });

    expect(ids(planNodesFromTopics([a, b, c], "PSE1"))).toEqual([
      [b.id, c.id, a.id],
    ]);
  });

  it("ne mélange jamais deux chapitres", () => {
    const a = topic("Bilans", "A");
    const b = topic("Hygiène", "B");
    const c = topic("Hygiène", "C");

    const plan = planNodesFromTopics([a, b, c], "PSE1");
    expect(ids(plan)).toEqual([[a.id], [b.id, c.id]]);
    expect(plan.map((n) => n.title)).toEqual(["A", "Hygiène"]);
  });

  it("ne met jamais plus de 3 sujets et équilibre les nœuds", () => {
    const run = (n: number) =>
      Array.from({ length: n }, (_, i) => topic("Urgences", `S${i}`));

    const sizes = (n: number) =>
      planNodesFromTopics(run(n), "PSE1").map((node) => node.topicIds.length);

    expect(sizes(3)).toEqual([3]);
    expect(sizes(4)).toEqual([2, 2]);
    expect(sizes(5)).toEqual([3, 2]);
    expect(sizes(7)).toEqual([3, 2, 2]);
  });

  it("isole un sujet riche (capacité >= 12)", () => {
    const a = topic("Urgences", "A");
    const rich = topic("Urgences", "DAE", { questionCapacity: 25 });
    const b = topic("Urgences", "B");
    const c = topic("Urgences", "C");

    const plan = planNodesFromTopics([a, rich, b, c], "PSE1");
    expect(ids(plan)).toEqual([[a.id], [rich.id], [b.id, c.id]]);
    expect(plan[1].title).toBe("DAE");
  });

  it("numérote les nœuds nommés d'après un même chapitre", () => {
    const run = Array.from({ length: 6 }, (_, i) =>
      topic("Traumatismes", `S${i}`)
    );

    expect(planNodesFromTopics(run, "PSE1").map((n) => n.title)).toEqual([
      "Traumatismes",
      "Traumatismes (2)",
    ]);
  });

  it("retourne un plan vide sans sujet du niveau", () => {
    expect(
      planNodesFromTopics([topic("Bilans", "A", { levels: ["PSE2"] })], "GQS")
    ).toEqual([]);
  });
});
