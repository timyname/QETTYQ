import places from "../../../data/places.json";
import { recommend } from "../../domain/recommend";
import type { Place } from "../../domain/types";
import type { PilotContext } from "./contracts";
import { weeklyOpeningStatus } from "../ingestion/weekly-hours";

export const pilotPlaces = places as Place[];
export const catalogCredit = { text: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright", license: "ODbL" };

export function publicPlace(place: Place) {
  return {
    id: place.id, name: place.name, category: place.category,
    lat: place.lat, lon: place.lon, address: place.address,
    tags: [...place.tags], price: place.price, durationMinutes: place.durationMinutes,
    durationState: "estimated" as const,
    openingHours: place.openingHours ?? null,
    openingStatus: weeklyOpeningStatus(place.openingHours, Date.now(), Date.now() + place.durationMinutes * 60_000, place.retrievedAt),
    sourceUrl: place.sourceUrl, retrievedAt: place.retrievedAt,
    cuisines: place.cuisines ?? [],
    coordinateQuality: place.coordinateQuality ?? "observed",
  };
}

export function catalogMeta() {
  return {
    requestId: crypto.randomUUID(), dataMode: "snapshot" as const,
    generatedAt: new Date().toISOString(), attribution: catalogCredit,
    warnings: ["Каталог мест — датированный снимок OpenStreetMap. Это не расписание мероприятий.", "Длительность посещения — оценка; опубликованные часы могут иметь исключения, цену и наличие мест нужно уточнить."],
  };
}

export type SearchedPlace = ReturnType<typeof publicPlace> & {
  distanceKm: number | null; travelMinutes: number | null; totalMinutes: number | null;
  feasibility: "feasible" | "uncertain" | "infeasible"; routeQuality: "estimated" | "unavailable";
  reason: string; unknowns: string[];
};
export function searchPilotPlaces(context: PilotContext, text = "", pool: readonly Place[] = pilotPlaces): SearchedPlace[] {
  const normalized = text.toLocaleLowerCase("ru-RU");
  const categoryWords = /музей|museum|мұражай/u.test(normalized) ? ["museum"]
    : /театр|theat|спектак/u.test(normalized) ? ["theatre"]
      : /кофе|coffee|кафе/u.test(normalized) ? ["cafe"]
        : /парк|park|саябақ/u.test(normalized) ? ["park", "garden"] : [];
  const categoryCandidates = categoryWords.length
    ? pool.filter((place) => place.tags.some((tag) => categoryWords.includes(tag)))
    : [...pool];
  const candidates = context.goal === "new" && context.likedTags.length > 0
    ? categoryCandidates.filter((place) => place.tags.some((tag) => context.likedTags.includes(tag)))
    : categoryCandidates;
  if (context.origin) {
    return recommend(candidates, { ...context, origin: context.origin }).slice(0, 3).map((item) => ({
      ...publicPlace(item), distanceKm: item.distanceKm, travelMinutes: item.travelMinutes,
      totalMinutes: item.totalMinutes, feasibility: item.feasibility, reason: item.reason,
      routeQuality: "estimated" as const, unknowns: item.unknowns,
    }));
  }
  const wanted = context.goal === "food" ? ["food", "cafe", "restaurant", "fast_food"]
    : context.goal === "walk" ? ["park", "garden", "viewpoint"]
      : ["culture", "museum", "theatre", "arts_centre", "library"];
  return candidates.filter((place) => place.tags.some((tag) => wanted.includes(tag)))
    .filter((place) => {
      const multiplier = context.budgetBasis === "group" ? context.partySize : 1;
      if (context.budget === null) return true;
      if (!place.price) return !context.strictBudget;
      return (context.strictBudget ? place.price.max : place.price.min) * multiplier <= context.budget;
    })
    .sort((a, b) => b.tags.filter((tag) => context.likedTags.includes(tag)).length - a.tags.filter((tag) => context.likedTags.includes(tag)).length)
    .slice(0, 3).map((place) => ({
      ...publicPlace(place), distanceKm: null, travelMinutes: null, totalMinutes: null,
      feasibility: "uncertain" as const, routeQuality: "unavailable" as const,
      reason: "Совпадает с выбранной категорией. Для оценки пути укажите точку старта.",
      unknowns: ["Точка старта не указана — расстояние и время пути не рассчитаны", ...(place.price ? [] : ["Стоимость не указана"]), "Расписание и наличие мест не подтверждены"],
    }));
}
