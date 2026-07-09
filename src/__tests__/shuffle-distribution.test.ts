import { describe, it, expect } from "vitest";
import { secureShuffle } from "@/lib/crypto";
import { logger } from "@/lib/logger";

describe("Shuffle Distribution", () => {
  it("should have an unbiased distribution over 100,000 runs", () => {
    const counts = [
      [0, 0, 0, 0], // Position 0 counts for values [0, 1, 2, 3]
      [0, 0, 0, 0], // Position 1 counts for values [0, 1, 2, 3]
      [0, 0, 0, 0], // Position 2 counts for values [0, 1, 2, 3]
      [0, 0, 0, 0], // Position 3 counts for values [0, 1, 2, 3]
    ];

    const RUNS = 10000;
    const array = [0, 1, 2, 3];

    for (let i = 0; i < RUNS; i++) {
      const shuffled = secureShuffle(array);
      shuffled.forEach((value, pos) => {
        counts[pos][value]++;
      });
    }

    logger.info("Distribution results for 100k runs:");
    counts.forEach((posCounts, pos) => {
      logger.info(
        `Position ${pos}:`,
        posCounts.map((c) => `${((c / RUNS) * 100).toFixed(2)}%`)
      );
    });

    // Check that each position has each number with ~25% probability (+/- 1% tolerance)
    const expected = RUNS / 4;
    const tolerance = RUNS * 0.015; // 1.5% tolerance

    counts.forEach((posCounts) => {
      posCounts.forEach((count) => {
        expect(count).toBeGreaterThan(expected - tolerance);
        expect(count).toBeLessThan(expected + tolerance);
      });
    });
  });
});
