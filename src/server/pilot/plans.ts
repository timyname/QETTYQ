import { distanceKm } from "../../domain/recommend";
import type { Place } from "../../domain/types";
import type { PilotContext } from "./contracts";
import { publicPlace } from "./catalog";

export type PlanStop = Omit<ReturnType<typeof publicPlace>, 'durationMinutes' | 'durationState'> & {
  durationMinutes: number | null; durationState: 'estimated' | 'observed' | 'unknown';
  eventStartsAt?: string; eventEndsAt?: string | null;
};
export function calculatePlan(places: Place[], context: PilotContext) {
  return calculateMixedPlan(places.map(publicPlace), context) as ReturnType<typeof calculateMixedPlan> & { visitMinutes: number };
}
export function calculateMixedPlan(stops: PlanStop[], context: PilotContext) {
  const points = [...(context.origin ? [context.origin] : []), ...stops,
    ...(context.returnToOrigin && context.origin ? [context.origin] : context.destination ? [context.destination] : [])];
  const legs = points.slice(1).map((point, index) => {
    const km = distanceKm(points[index], point);
    return { fromIndex: index, toIndex: index + 1, distanceKm: km, estimatedMinutes: Math.ceil(km / 4.5 * 60), routeQuality: "estimated" as const };
  });
  const visitMinutes = stops.every(stop => stop.durationMinutes !== null) ? stops.reduce((sum, stop) => sum + stop.durationMinutes!, 0) : null;
  const bufferMinutes = Math.max(10, Math.ceil(context.minutes * 0.15));
  const travelMinutes = context.origin ? legs.reduce((sum, leg) => sum + leg.estimatedMinutes, 0) : null;
  const totalMinutes = travelMinutes === null || visitMinutes === null ? null : travelMinutes + visitMinutes + bufferMinutes;
  const knownCostMin = stops.reduce((sum, place) => sum + (place.price?.min ?? 0), 0);
  const multiplier = context.budgetBasis === "group" ? context.partySize : 1;
  const budgetMin = stops.every((place) => place.price !== null) ? knownCostMin * multiplier : null;
  const budgetMax = stops.every((place) => place.price !== null) ? stops.reduce((sum, place) => sum + place.price!.max, 0) * multiplier : null;
  const exceedsTime = totalMinutes !== null && totalMinutes > context.minutes;
  const exceedsBudget = context.budget !== null && knownCostMin * multiplier > context.budget;
  return {
    placeIds: stops.map((place) => place.id), stops, legs,
    routeQuality: context.origin ? "estimated" as const : "unavailable" as const,
    travelMinutes, visitMinutes, bufferMinutes, totalMinutes,
    remainingMinutes: totalMinutes === null ? null : context.minutes - totalMinutes,
    distanceKm: context.origin ? legs.reduce((sum, leg) => sum + leg.distanceKm, 0) : null,
    budget: { min: budgetMin, max: budgetMax, currency: "KZT" as const, basis: context.budgetBasis, partySize: context.partySize },
    feasibility: exceedsTime || exceedsBudget ? "infeasible" as const : "uncertain" as const,
    constraintViolations: { time: exceedsTime, budget: exceedsBudget },
    warnings: [
      "Это сохранённый план, не бронь и не билет.",
      "Пешеходное время оценено по прямому расстоянию при 4,5 км/ч. Дорожная геометрия недоступна — линию навигации рисовать нельзя.",
      "Длительность посещений — проектная оценка. Часы работы и наличие мест не подтверждены.",
      ...(visitMinutes === null ? ["Длительность события неизвестна: полное время плана не подтверждено."] : []),
      ...(stops.some(stop => stop.eventStartsAt) ? ["Время начала события фиксировано; проверь прибытие и возможное ожидание."] : []),
      ...(context.origin ? [] : ["Выберите точку старта: полное время и расстояние пока неизвестны."]),
      ...(budgetMin === null ? ["Одна или несколько цен неизвестны. Общий бюджет не подтверждён."] : []),
      ...(exceedsTime ? ["Приблизительное время превышает выбранное окно."] : []),
      ...(exceedsBudget ? ["Известная минимальная стоимость превышает бюджет."] : []),
    ],
  };
}

export type StoredPlan = ReturnType<typeof calculateMixedPlan> & {
  id: string; createdAt: string; expiresAt: string; fingerprint: string;
};

export function publicPlan(plan: StoredPlan) {
  const { fingerprint, ...result } = plan;
  void fingerprint;
  return result;
}
