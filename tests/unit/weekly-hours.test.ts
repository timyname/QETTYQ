import { describe, expect, it } from "vitest";
import { parseWeeklyHours, weeklyOpeningStatus } from "../../src/server/ingestion/weekly-hours";
const at = (value: string) => Date.parse(`2026-10-${value}+05:00`);
describe("reported OSM weekly hours, not event dates", () => {
  it("checks complete visit on Saturday and closes before the end", () => {
    expect(weeklyOpeningStatus("Mo-Sa 10:00-20:00", at("24T18:00:00"), at("24T19:00:00"))).toBe("open");
    expect(weeklyOpeningStatus("Mo-Sa 10:00-20:00", at("24T19:30:00"), at("24T20:30:00"))).toBe("closed");
    expect(weeklyOpeningStatus("Mo-Sa 10:00-20:00", at("25T12:00:00"), at("25T13:00:00"))).toBe("closed");
  });
  it("handles overnight hours and multiple intervals without filling gaps", () => {
    expect(weeklyOpeningStatus("Fr 20:00-02:00", at("23T23:30:00"), at("24T01:30:00"))).toBe("open");
    expect(weeklyOpeningStatus("Fr 20:00-24:00", at("23T23:30:00"), at("24T00:00:00"))).toBe("open");
    expect(weeklyOpeningStatus("Sa 10:00-12:00,14:00-18:00", at("24T11:00:00"), at("24T15:00:00"))).toBe("closed");
  });
  it("does not invent holiday/seasonal/date exceptions or stale hours", () => {
    for (const value of [null, "PH off", "Mo-Su 10:00-20:00; PH off", "sunrise-sunset", "Mo-Su 25:00-26:00", "2026 Oct 01-31"]) expect(parseWeeklyHours(value)).toBeNull();
    expect(weeklyOpeningStatus("24/7", at("24T12:00:00"), at("24T13:00:00"), "2026-10-01T00:00:00Z")).toBe("unknown");
    expect(weeklyOpeningStatus("24/7", at("24T12:00:00"), at("24T13:00:00"), "invalid")).toBe("unknown");
    expect(parseWeeklyHours("Tu off; Mo 20:00-02:00")).toBeNull();
  });
});
