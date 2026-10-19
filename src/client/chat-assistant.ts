import type { Goal } from "@/domain/types";
import type { LocalChatMessage, LocalPreferenceProfile } from "./local-memory";

export type ChatContextPatch = Partial<Pick<LocalPreferenceProfile, "goal" | "minutes" | "budget">>;

export type ChatAssistantInput = {
  text: string;
  profile: LocalPreferenceProfile;
  history: LocalChatMessage[];
};

export type ChatAssistantResult = {
  mode: "deterministic";
  reply: string;
  patch: ChatContextPatch;
  suggestions: string[];
  warnings: string[];
};

export interface ChatAssistantProvider {
  respond(input: ChatAssistantInput): Promise<ChatAssistantResult>;
}

function detectGoal(text: string): Goal | undefined {
  if (/(кофе|поесть|еда|ресторан|перекус|кафе|тамақ|асхана|coffee|food|restaurant)/u.test(text)) return "food";
  if (/(гулять|прогул|парк|набереж|воздух|серуен|саябақ|walk|park)/u.test(text)) return "walk";
  if (/(музей|театр|выстав|концерт|спектак|кино|museum|theatre|concert|көрме)/u.test(text)) return "activity";
  if (/(новое|необыч|сюрприз|жаңа|new|surprise)/u.test(text)) return "new";
  return undefined;
}

function detectMinutes(text: string) {
  const hours = text.match(/(?:на\s*)?(\d+(?:[.,]\d+)?)\s*(?:час|часа|часов|сағат|hour|hours|h)(?:\s|$)/u);
  if (hours) return Math.min(360, Math.max(30, Math.round(Number(hours[1].replace(",", ".")) * 60)));
  const minutes = text.match(/(?:на\s*)?(\d{2,3})\s*(?:мин|минут|минуты|минутқа|minutes|min)(?:\s|$)/u);
  if (minutes) return Math.min(360, Math.max(30, Number(minutes[1])));
  return undefined;
}

function detectBudget(text: string) {
  if (/(бесплатно|бесплатный|тегін|free)/u.test(text)) return 0;
  const amount = text.match(/(?:до|бюджет|budget|дейін)?\s*(\d{1,3}(?:[\s.,]\d{3})*|\d+)\s*(?:₸|тг|тенге|kzt)(?:\s|$)/u);
  if (!amount) return undefined;
  const value = Number(amount[1].replace(/[\s.,]/g, ""));
  return Number.isFinite(value) ? Math.min(1_000_000, Math.max(0, value)) : undefined;
}

function summary(profile: LocalPreferenceProfile, patch: ChatContextPatch) {
  const merged = { ...profile, ...patch };
  const goalLabel: Record<Goal, string> = {
    food: "поесть",
    walk: "погулять",
    activity: "культурный досуг",
    new: "попробовать новое",
  };
  return `${goalLabel[merged.goal]}, ${merged.minutes} мин, до ${merged.budget.toLocaleString("ru-RU")} ₸`;
}

export class DeterministicChatAssistant implements ChatAssistantProvider {
  async respond(input: ChatAssistantInput): Promise<ChatAssistantResult> {
    const text = input.text.trim().slice(0, 500).toLocaleLowerCase("ru-RU");
    const patch: ChatContextPatch = {};
    const goal = detectGoal(text);
    const minutes = detectMinutes(text);
    const budget = detectBudget(text);
    if (goal) patch.goal = goal;
    if (minutes !== undefined) patch.minutes = minutes;
    if (budget !== undefined) patch.budget = budget;

    const changed = Object.keys(patch).length > 0;
    return {
      mode: "deterministic",
      patch,
      reply: changed
        ? `Понял контекст: ${summary(input.profile, patch)}. Дальше ограничения проверит код, а после свайпов я покажу только варианты из локального каталога.`
        : "Я не хочу додумывать условия. Напишите цель, время или бюджет — например: «тихо погулять 90 минут до 3000 ₸».",
      suggestions: changed
        ? ["Начать 15 свайпов", "Изменить время", "Показать карту событий"]
        : ["Погулять 90 минут", "Кофе до 3000 ₸", "Выставка на 2 часа"],
      warnings: ["Без внешнего AI: ответ собран локальными правилами и не содержит новых фактов о местах или событиях."],
    };
  }
}
