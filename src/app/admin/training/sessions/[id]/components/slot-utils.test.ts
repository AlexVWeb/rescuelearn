import dayjs from "dayjs";
import { getNextSlotSuggestion, isDateWithinSession } from "./slot-utils";
import { Slot } from "../../../types";

describe("slot-utils", () => {
  const sessionStart = dayjs("2024-04-01").toDate();
  const sessionEnd = dayjs("2024-04-03").toDate();

  describe("isDateWithinSession", () => {
    it("should return true if date is within session range", () => {
      expect(isDateWithinSession("2024-04-01", sessionStart, sessionEnd)).toBe(
        true
      );
      expect(isDateWithinSession("2024-04-02", sessionStart, sessionEnd)).toBe(
        true
      );
      expect(isDateWithinSession("2024-04-03", sessionStart, sessionEnd)).toBe(
        true
      );
    });

    it("should return false if date is outside session range", () => {
      expect(isDateWithinSession("2024-03-31", sessionStart, sessionEnd)).toBe(
        false
      );
      expect(isDateWithinSession("2024-04-04", sessionStart, sessionEnd)).toBe(
        false
      );
    });

    it("should return true if session dates are null", () => {
      expect(isDateWithinSession("2024-04-01", null, null)).toBe(true);
    });
  });

  describe("getNextSlotSuggestion", () => {
    it("should suggest Jour 1 - Matin if no slots exist", () => {
      const suggestion = getNextSlotSuggestion([], sessionStart, sessionEnd);
      expect(suggestion).toEqual({
        label: "Jour 1 - Matin",
        date: "2024-04-01",
        startTime: "09:00",
        endTime: "12:30",
      });
    });

    it("should suggest Après-midi if Matin exists on the same day", () => {
      const slots: Slot[] = [
        {
          id: "1",
          label: "Jour 1 - Matin",
          date: dayjs("2024-04-01").toDate(),
          startTime: "09:00",
          endTime: "12:30",
          trainingSessionId: "session1",
        },
      ];
      const suggestion = getNextSlotSuggestion(slots, sessionStart, sessionEnd);
      expect(suggestion).toEqual({
        label: "Jour 1 - Après-midi",
        date: "2024-04-01",
        startTime: "13:30",
        endTime: "17:00",
      });
    });

    it("should suggest next day Matin if both Matin and Après-midi exist", () => {
      const slots: Slot[] = [
        {
          id: "1",
          label: "Jour 1 - Matin",
          date: dayjs("2024-04-01").toDate(),
          startTime: "09:00",
          endTime: "12:30",
          trainingSessionId: "session1",
        },
        {
          id: "2",
          label: "Jour 1 - Après-midi",
          date: dayjs("2024-04-01").toDate(),
          startTime: "13:30",
          endTime: "17:00",
          trainingSessionId: "session1",
        },
      ];
      const suggestion = getNextSlotSuggestion(slots, sessionStart, sessionEnd);
      expect(suggestion).toEqual({
        label: "Jour 2 - Matin",
        date: "2024-04-02",
        startTime: "09:00",
        endTime: "12:30",
      });
    });

    it("should return null if the next suggested day is after sessionEnd", () => {
      const sessionEndShort = dayjs("2024-04-01").toDate();
      const slots: Slot[] = [
        {
          id: "1",
          label: "Jour 1 - Matin",
          date: dayjs("2024-04-01").toDate(),
          startTime: "09:00",
          endTime: "12:30",
          trainingSessionId: "session1",
        },
        {
          id: "2",
          label: "Jour 1 - Après-midi",
          date: dayjs("2024-04-01").toDate(),
          startTime: "13:30",
          endTime: "17:00",
          trainingSessionId: "session1",
        },
      ];
      const suggestion = getNextSlotSuggestion(
        slots,
        sessionStart,
        sessionEndShort
      );
      expect(suggestion).toBeNull();
    });

    it("should handle potential timezone shifts during suggestion", () => {
      // Create a slot that might be shifted (e.g., 23:00 the day before in UTC)
      // This happens when a date is 2026-03-16 00:00:00 local time (UTC+1)
      const problematicDate = new Date("2026-03-16T00:00:00Z");
      // If we are in UTC+1, this is March 16th 01:00.
      // If we are in UTC, this is March 16th 00:00.

      const slots: Slot[] = [
        {
          id: "1",
          label: "Jour 1 - Matin",
          date: problematicDate,
          startTime: "09:00",
          endTime: "12:30",
          trainingSessionId: "session1",
        },
      ];

      const suggestion = getNextSlotSuggestion(
        slots,
        dayjs("2026-03-16").toDate(),
        dayjs("2026-03-20").toDate()
      );

      // The suggestion should be for the same day (March 16)
      expect(suggestion?.date).toBe("2026-03-16");
      expect(suggestion?.label).toContain("Après-midi");
    });
  });
});
