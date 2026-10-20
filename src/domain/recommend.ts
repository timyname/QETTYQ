import type { Goal, Place, Recommendation } from "./types";

type Context = {
  goal: Goal;
  minutes: number;
  budget: number | null;
  origin: { lat: number; lon: number };
  likedTags: string[];
  destination?: { lat: number; lon: number } | null;
  returnToOrigin?: boolean;
  partySize?: number;
  budgetBasis?: "person" | "group";
  strictBudget?: boolean;
};

const toRad = (value: number) => (value * Math.PI) / 180;

export function distanceKm(a: Context["origin"], b: Context["origin"]) {
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(x));
}

export function recommend(places: Place[], context: Context): Recommendation[] {
  const wanted = context.goal === "food" ? ["food", "cafe", "restaurant", "fast_food"] :
    context.goal === "walk" ? ["park", "garden", "viewpoint"] :
    ["culture", "museum", "theatre", "arts_centre", "library"];

  return places
    .map((place) => {
      const distance = distanceKm(context.origin, place);
      const travelMinutes = Math.ceil((distance / 4.5) * 60);
      const destination = context.returnToOrigin ? context.origin : context.destination;
      const onwardMinutes = destination ? Math.ceil((distanceKm(place, destination) / 4.5) * 60) : 0;
      const totalMinutes = travelMinutes + onwardMinutes + place.durationMinutes + Math.max(10, Math.ceil(context.minutes * 0.15));
      const priceKnown = Boolean(place.price);
      const priceMultiplier = context.budgetBasis === "group" ? context.partySize ?? 1 : 1;
      const overBudget = Boolean(place.price && context.budget !== null && place.price.min * priceMultiplier > context.budget);
      const overTime = totalMinutes > context.minutes;
      const goalMatch = place.tags.some((tag) => wanted.includes(tag));
      const interestMatch = place.tags.filter((tag) => context.likedTags.includes(tag)).length;
      const feasibility: Recommendation["feasibility"] = overBudget || overTime
        ? "infeasible"
        : "uncertain";
      const unknowns = [];
      if (!priceKnown) unknowns.push("Стоимость не указана в источнике");
      unknowns.push("Пеший путь оценён по прямому расстоянию");
      unknowns.push("Длительность посещения — оценка, часы работы и наличие мест не подтверждены");
      if (place.price && context.budget !== null && place.price.max * priceMultiplier > context.budget) {
        unknowns.push("Верхняя граница цены превышает выбранный бюджет");
      }
      return {
        ...place,
        distanceKm: distance,
        travelMinutes,
        totalMinutes,
        feasibility,
        reason: interestMatch
          ? "Совпадает с отмеченными интересами; время и условия посещения нужно уточнить."
          : "Совпадает с выбранной категорией; расчёт времени приблизительный.",
        unknowns,
        _score: (goalMatch ? 4 : 0) + interestMatch * 2 - distance - 2,
        _goalMatch: goalMatch,
      };
    })
    .filter((item) => item.feasibility !== "infeasible" && item._goalMatch && !(context.strictBudget && context.budget !== null && (!item.price || item.price.max * (context.budgetBasis === "group" ? context.partySize ?? 1 : 1) > context.budget)))
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)
    .map(({ _score, _goalMatch, ...item }) => {
      void _score;
      void _goalMatch;
      return item;
    });
}
