import type { Goal, Place, Recommendation } from "./types";

type Context = {
  goal: Goal;
  minutes: number;
  budget: number | null;
  origin: { lat: number; lon: number };
  likedTags: string[];
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
      const totalMinutes = travelMinutes * 2 + place.durationMinutes + 10;
      const priceKnown = Boolean(place.price);
      const overBudget = Boolean(place.price && context.budget !== null && place.price.min > context.budget);
      const overTime = totalMinutes > context.minutes;
      const goalMatch = place.tags.some((tag) => wanted.includes(tag));
      const interestMatch = place.tags.filter((tag) => context.likedTags.includes(tag)).length;
      const feasibility: Recommendation["feasibility"] = overBudget || overTime
        ? "infeasible"
        : priceKnown || context.budget === null
          ? "feasible"
          : "uncertain";
      const unknowns = [];
      if (!priceKnown) unknowns.push("Стоимость не указана в источнике");
      unknowns.push("Пеший путь оценён по прямому расстоянию");
      return {
        ...place,
        distanceKm: distance,
        travelMinutes,
        totalMinutes,
        feasibility,
        reason: interestMatch
          ? "Совпадает с отмеченными интересами и находится в пределах выбранного радиуса."
          : "Подходит по категории и рассчитанному времени.",
        unknowns,
        _score: (goalMatch ? 4 : 0) + interestMatch * 2 - distance - (feasibility === "feasible" ? 0 : 2),
      };
    })
    .filter((item) => item.feasibility !== "infeasible")
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)
    .map(({ _score, ...item }) => {
      void _score;
      return item;
    });
}
