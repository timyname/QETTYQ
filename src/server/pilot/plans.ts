import { distanceKm } from "../../domain/recommend";
import type { Place } from "../../domain/types";
import type { PilotContext } from "./contracts";
import { publicPlace } from "./catalog";

export function calculatePlan(places: Place[], context: PilotContext) {
  const stops = places.map(publicPlace);
  const points = [...(context.origin ? [context.origin] : []), ...places,
    ...(context.returnToOrigin && context.origin ? [context.origin] : context.destination ? [context.destination] : [])];
  const legs = points.slice(1).map((point, index) => {
    const km = distanceKm(points[index], point);
    return { fromIndex: index, toIndex: index + 1, distanceKm: km, estimatedMinutes: Math.ceil(km / 4.5 * 60), routeQuality: "estimated" as const };
  });
  const visitMinutes = places.reduce((sum, place) => sum + place.durationMinutes, 0);
  const bufferMinutes = Math.max(10, Math.ceil(context.minutes * 0.15));
  const travelMinutes = context.origin ? legs.reduce((sum, leg) => sum + leg.estimatedMinutes, 0) : null;
  const totalMinutes = travelMinutes === null ? null : travelMinutes + visitMinutes + bufferMinutes;
  const knownCostMin = places.reduce((sum, place) => sum + (place.price?.min ?? 0), 0);
  const multiplier = context.budgetBasis === "group" ? context.partySize : 1;
  const budgetMin = places.every((place) => place.price !== null) ? knownCostMin * multiplier : null;
  const budgetMax = places.every((place) => place.price !== null) ? places.reduce((sum, place) => sum + place.price!.max, 0) * multiplier : null;
  const exceedsTime = totalMinutes !== null && totalMinutes > context.minutes;
  const exceedsBudget = context.budget !== null && knownCostMin * multiplier > context.budget;
  return {
    placeIds: places.map((place) => place.id), stops, legs,
    routeQuality: context.origin ? "estimated" as const : "unavailable" as const,
    travelMinutes, visitMinutes, bufferMinutes, totalMinutes,
    remainingMinutes: totalMinutes === null ? null : context.minutes - totalMinutes,
    distanceKm: context.origin ? legs.reduce((sum, leg) => sum + leg.distanceKm, 0) : null,
    budget: { min: budgetMin, max: budgetMax, currency: "KZT" as const, basis: context.budgetBasis, partySize: context.partySize },
    feasibility: exceedsTime || exceedsBudget ? "infeasible" as const : "uncertain" as const,
    warnings: [
      "Это сохранённый план, не бронь и не билет.",
      "Пешеходное время оценено по прямому расстоянию при 4,5 км/ч. Дорожная геометрия недоступна — линию навигации рисовать нельзя.",
      "Длительность посещений — проектная оценка. Часы работы и наличие мест не подтверждены.",
      ...(context.origin ? [] : ["Выберите точку старта: полное время и расстояние пока неизвестны."]),
      ...(budgetMin === null ? ["Одна или несколько цен неизвестны. Общий бюджет не подтверждён."] : []),
      ...(exceedsTime ? ["Приблизительное время превышает выбранное окно."] : []),
      ...(exceedsBudget ? ["Известная минимальная стоимость превышает бюджет."] : []),
    ],
  };
}

export type StoredPlan = ReturnType<typeof calculatePlan> & {
  id: string; createdAt: string; expiresAt: string; fingerprint: string;
};

export function publicPlan(plan: StoredPlan) {
  const { fingerprint, ...result } = plan;
  void fingerprint;
  return result;
}
