import { describe, it, expect } from "vitest";
import { resolvePlayerLevel } from "./player-view";

const tree = (level: string, nodeIds: string[]) => ({
  level,
  nodes: nodeIds.map((id) => ({ id })),
});

describe("resolvePlayerLevel", () => {
  const trees = [
    tree("GQS", ["g1", "g2"]),
    tree("PSC", ["p1"]),
    tree("PSE1", ["e1"]),
    tree("PSE2", []),
  ];

  it("stays on the onboarding level while its path is unfinished", () => {
    const res = resolvePlayerLevel("GQS", trees, new Set(["g1"]));
    expect(res?.tree.level).toBe("GQS");
    expect(res?.nextLevel).toBe("PSC");
  });

  it("climbs through every completed level", () => {
    const res = resolvePlayerLevel("GQS", trees, new Set(["g1", "g2", "p1"]));
    expect(res?.tree.level).toBe("PSE1");
    expect(res?.nextLevel).toBe("PSE2");
  });

  it("does not move into a level whose path has no lessons", () => {
    const res = resolvePlayerLevel("PSE1", trees, new Set(["e1"]));
    expect(res?.tree.level).toBe("PSE1");
    expect(res?.nextLevel).toBe("PSE2");
  });

  it("does not move into a level that does not exist yet", () => {
    const res = resolvePlayerLevel("GQS", [trees[0]], new Set(["g1", "g2"]));
    expect(res?.tree.level).toBe("GQS");
    expect(res?.nextLevel).toBe("PSC");
  });

  it("never climbs from an empty path", () => {
    const res = resolvePlayerLevel("PSE2", trees, new Set());
    expect(res?.tree.level).toBe("PSE2");
    expect(res?.nextLevel).toBeNull();
  });

  it("returns null when the onboarding level has no tree", () => {
    expect(resolvePlayerLevel("PSC", [trees[0]], new Set())).toBeNull();
  });

  it("keeps SST outside the chain", () => {
    const res = resolvePlayerLevel(
      "SST",
      [tree("SST", ["s1"]), ...trees],
      new Set(["s1"])
    );
    expect(res?.tree.level).toBe("SST");
    expect(res?.nextLevel).toBeNull();
  });
});
