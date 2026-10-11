import { describe, it, expect } from "vitest";
import {
  MAX_CHECKPOINT_CREDIT_SEC,
  VIDEO_TOLERANCE_SEC,
  nextVideoWatch,
  parseYoutubeId,
} from "./video";

const now = new Date("2026-10-07T12:00:00Z");
const ago = (sec: number) => new Date(now.getTime() - sec * 1000);

describe("parseYoutubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["  dQw4w9WgXcQ  ", "dQw4w9WgXcQ"],
  ])("extracts the id from %s", (input, expected) => {
    expect(parseYoutubeId(input)).toBe(expected);
  });

  it.each([
    "",
    "https://vimeo.com/123456789",
    "https://evil.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "javascript:alert(1)",
    "dQw4w9WgXc<",
  ])("rejects %s", (input) => {
    expect(parseYoutubeId(input)).toBeNull();
  });
});

describe("nextVideoWatch", () => {
  const duration = 300;

  it("credits real playback time", () => {
    const next = nextVideoWatch(
      { watchedSec: 30, lastCheckpointAt: ago(15) },
      45,
      duration,
      now
    );
    expect(next).toEqual({ watchedSec: 45, completed: false, rejected: false });
  });

  it("rejects a seek ahead and only credits elapsed time", () => {
    const next = nextVideoWatch(
      { watchedSec: 30, lastCheckpointAt: ago(15) },
      200,
      duration,
      now
    );
    expect(next).toEqual({
      watchedSec: 30 + 15 + VIDEO_TOLERANCE_SEC,
      completed: false,
      rejected: true,
    });
  });

  it("rejects faster playback (x2)", () => {
    const next = nextVideoWatch(
      { watchedSec: 30, lastCheckpointAt: ago(15) },
      60,
      duration,
      now
    );
    expect(next.rejected).toBe(true);
    expect(next.watchedSec).toBe(30 + 15 + VIDEO_TOLERANCE_SEC);
  });

  it("caps the credit after a long pause", () => {
    const next = nextVideoWatch(
      { watchedSec: 30, lastCheckpointAt: ago(600) },
      250,
      duration,
      now
    );
    expect(next.rejected).toBe(true);
    expect(next.watchedSec).toBe(
      30 + MAX_CHECKPOINT_CREDIT_SEC + VIDEO_TOLERANCE_SEC
    );
  });

  it("keeps progress when the player rewinds", () => {
    const next = nextVideoWatch(
      { watchedSec: 120, lastCheckpointAt: ago(15) },
      40,
      duration,
      now
    );
    expect(next).toEqual({
      watchedSec: 120,
      completed: false,
      rejected: false,
    });
  });

  it("completes near the end of the video", () => {
    const next = nextVideoWatch(
      { watchedSec: 290, lastCheckpointAt: ago(10) },
      duration,
      duration,
      now
    );
    expect(next).toEqual({
      watchedSec: duration,
      completed: true,
      rejected: false,
    });
  });

  it("never exceeds the video duration", () => {
    const next = nextVideoWatch(
      { watchedSec: 295, lastCheckpointAt: ago(20) },
      duration + 50,
      duration,
      now
    );
    expect(next.watchedSec).toBe(duration);
    expect(next.completed).toBe(true);
  });

  it("gives no credit for a clock going backwards", () => {
    const next = nextVideoWatch(
      { watchedSec: 30, lastCheckpointAt: new Date(now.getTime() + 60_000) },
      40,
      duration,
      now
    );
    expect(next.watchedSec).toBe(30 + VIDEO_TOLERANCE_SEC);
  });
});
