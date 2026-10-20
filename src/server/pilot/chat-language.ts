import type { LiveAstanaEvent } from "../ingestion/sxodim-live";
export function localizedSearchReply(language: "ru" | "kk" | "en", result: { reply: string; items: unknown[]; events: LiveAstanaEvent[] }) {
  if (language === "ru") {
    if (/^Нашёл\s+\d/u.test(result.reply)) return result.items.length
      ? result.reply.replace(/^Нашёл\s+\d+\s+мест(?:о|а)?/u, `Нашёл ${result.items.length} ${result.items.length === 1 ? "место" : "места"}`)
      : "В подтверждённых источниках не нашёл подходящих вариантов. Условия автоматически не меняю; конкретное меню и доступность нужно уточнить.";
    return result.reply;
  }
  if (result.events.length) return language === "en"
    ? `Found ${result.events.length} events in the connected listings. Check the date, final price, availability and travel time with the organiser.`
    : `Қосылған афишадан ${result.events.length} іс-шара табылды. Күнін, нақты бағасын, орын бар-жоғын және жол уақытын ұйымдастырушыдан нақтылаңыз.`;
  if (result.items.length) return language === "en"
    ? `Found ${result.items.length} places in the sourced catalogue. Opening hours, menu and prices may need confirmation. A category match is not proof that a particular dish is available.`
    : `Дереккөзі көрсетілген каталогтан ${result.items.length} орын табылды. Жұмыс уақытын, мәзірін және бағасын нақтылау қажет болуы мүмкін. Санаттың сәйкес келуі нақты тағамның бар екенін растамайды.`;
  return language === "en"
    ? "No confirmed matches for this request and its constraints. I will not invent places, events or prices. Tell me what you would like to try, or change a condition."
    : "Бұл сұрау мен шарттарға сәйкес расталған нұсқа табылмады. Орын, іс-шара немесе баға ойдан қосылмайды. Не істегіңіз келетінін айтыңыз немесе шартты өзгертіңіз.";
}

export function localizedClarification(language: "ru" | "kk" | "en") {
  return language === "en" ? "What would you like to try? Tell me about your mood, interests, available time and budget."
    : language === "kk" ? "Нені байқап көргіңіз келеді? Көңіл күйіңізді, қызығушылықтарыңызды, бос уақытыңыз бен бюджетіңізді айтыңыз."
    : "Что хочется попробовать? Расскажите про настроение, интересы, свободное время и бюджет.";
}
