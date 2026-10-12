import { describe, it, expect } from "vitest";
import {
  HEART_REGEN_MS,
  computeProgressionStats,
  MAX_HEARTS,
  displayedStreak,
  lessonScore,
  nextHeartAt,
  nextStreak,
  regenerateHearts,
} from "./player-stats";

const now = new Date("2026-10-06T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("regenerateHearts", () => {
  it("keeps full hearts and clears the cycle date", () => {
    expect(
      regenerateHearts({ hearts: MAX_HEARTS, heartsUpdatedAt: null }, now)
    ).toEqual({ hearts: MAX_HEARTS, heartsUpdatedAt: null, changed: false });
  });

  it("starts a cycle for legacy users without a cycle date", () => {
    const res = regenerateHearts({ hearts: 2, heartsUpdatedAt: null }, now);
    expect(res).toEqual({ hearts: 2, heartsUpdatedAt: now, changed: true });
  });

  it("does nothing before a full regeneration period", () => {
    const start = ago(HEART_REGEN_MS - 1000);
    const res = regenerateHearts({ hearts: 2, heartsUpdatedAt: start }, now);
    expect(res).toEqual({ hearts: 2, heartsUpdatedAt: start, changed: false });
  });

  it("regains one heart per period and keeps the remainder", () => {
    const start = ago(2 * HEART_REGEN_MS + 1000);
    const res = regenerateHearts({ hearts: 1, heartsUpdatedAt: start }, now);
    expect(res.hearts).toBe(3);
    expect(res.heartsUpdatedAt).toEqual(
      new Date(start.getTime() + 2 * HEART_REGEN_MS)
    );
  });

  it("caps at the maximum and clears the cycle date", () => {
    const res = regenerateHearts(
      { hearts: 0, heartsUpdatedAt: ago(30 * HEART_REGEN_MS) },
      now
    );
    expect(res).toEqual({
      hearts: MAX_HEARTS,
      heartsUpdatedAt: null,
      changed: true,
    });
  });
});

describe("nextHeartAt", () => {
  it("returns null when hearts are full", () => {
    expect(nextHeartAt({ hearts: MAX_HEARTS, heartsUpdatedAt: null })).toBe(
      null
    );
  });

  it("returns the end of the current cycle", () => {
    expect(nextHeartAt({ hearts: 0, heartsUpdatedAt: now })).toEqual(
      new Date(now.getTime() + HEART_REGEN_MS)
    );
  });
});

describe("displayedStreak", () => {
  const day = 24 * 60 * 60 * 1000;

  it("returns 0 without activity", () => {
    expect(displayedStreak(4, null, now)).toBe(0);
  });

  it("keeps the streak when last active today or yesterday", () => {
    expect(displayedStreak(4, ago(0), now)).toBe(4);
    expect(displayedStreak(4, ago(day), now)).toBe(4);
  });

  it("drops the streak after a missed day", () => {
    expect(displayedStreak(4, ago(2 * day), now)).toBe(0);
  });
});

describe("nextStreak", () => {
  const day = 24 * 60 * 60 * 1000;

  it("starts at 1 without activity", () => {
    expect(nextStreak(0, null, now)).toBe(1);
  });

  it("keeps the streak when already active today", () => {
    expect(nextStreak(4, ago(0), now)).toBe(4);
  });

  it("increments when last active yesterday", () => {
    expect(nextStreak(4, ago(day), now)).toBe(5);
  });

  it("restarts at 1 after a missed day", () => {
    expect(nextStreak(4, ago(2 * day), now)).toBe(1);
  });
});

describe("computeProgressionStats", () => {
  const nodes = [
    { id: "n1", title: "Alerter" },
    { id: "n2", title: "Hémorragies" },
    { id: "n3", title: "Inconscience" },
  ];

  it("returns empty stats when nothing is completed", () => {
    expect(computeProgressionStats(nodes, [])).toEqual({
      completedNodes: 0,
      totalNodes: 3,
      averageScore: null,
      lessons: [],
    });
  });

  it("aggregates scores and lists the most recent lessons first", () => {
    const res = computeProgressionStats(nodes, [
      { nodeId: "n1", score: 100, completedAt: ago(2000) },
      { nodeId: "n2", score: 50, completedAt: ago(1000) },
    ]);
    expect(res.completedNodes).toBe(2);
    expect(res.averageScore).toBe(75);
    expect(res.lessons.map((l) => l.nodeId)).toEqual(["n2", "n1"]);
    expect(res.lessons[0]).toEqual({
      nodeId: "n2",
      title: "Hémorragies",
      score: 50,
    });
  });

  it("ignores progress on nodes outside the tree and null scores in the average", () => {
    const res = computeProgressionStats(nodes, [
      { nodeId: "other", score: 0, completedAt: ago(500) },
      { nodeId: "n1", score: null, completedAt: ago(2000) },
      { nodeId: "n3", score: 80, completedAt: ago(1000) },
    ]);
    expect(res.completedNodes).toBe(2);
    expect(res.averageScore).toBe(80);
    expect(res.lessons).toHaveLength(2);
  });

  it("limits the number of listed lessons", () => {
    const res = computeProgressionStats(
      nodes,
      nodes.map((n, i) => ({ nodeId: n.id, score: 90, completedAt: ago(i) })),
      2
    );
    expect(res.completedNodes).toBe(3);
    expect(res.lessons).toHaveLength(2);
  });
});

describe("lessonScore", () => {
  it("only counts quiz questions", () => {
    const exercises = [
      { type: "MICRO_COURSE" },
      { type: "QUIZ_QUESTION" },
      { type: "FLASHCARD" },
      { type: "QUIZ_QUESTION" },
    ];
    expect(lessonScore(exercises, 2)).toBe(100);
    expect(lessonScore(exercises, 1)).toBe(50);
  });

  it("gives full score to a lesson without quiz", () => {
    expect(lessonScore([{ type: "MICRO_COURSE" }], 0)).toBe(100);
  });
});
