import { describe, expect, it } from "vitest";
import { cinemaLanguageLabel, formatMoney, savedPlanState, type SavedPlanSummary } from "../../src/components/screens/MissingProductScreens";

describe("MissingProductScreens model helpers", () => {
  it("never converts an unknown cinema price into zero or free", () => {
    expect(formatMoney({ state: "unknown", currency: "KZT" })).toBe("Цена не указана");
    expect(formatMoney({ state: "free", currency: "KZT" })).toContain("подтверждено источником");
  });

  it("keeps unknown subtitles distinct from an explicitly empty list", () => {
    expect(cinemaLanguageLabel({ audioLanguage: "kk", subtitleLanguages: null })).toContain("Субтитры не указаны");
    expect(cinemaLanguageLabel({ audioLanguage: "kk", subtitleLanguages: [] })).toContain("Без заявленных субтитров");
  });

  it("labels a stale plan without inventing a check time", () => {
    const plan: SavedPlanSummary = { id: "plan-1", title: "План", dateLabel: null, totalMinutes: null, stale: true, checkedAtLabel: null, dataMode: "demo" };
    expect(savedPlanState(plan)).toBe("Данные устарели · время проверки не указано");
  });
});
