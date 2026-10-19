"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Heart, MapPin, MessageCircle, Navigation, RotateCcw, WalletCards } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Goal, Recommendation } from "@/domain/types";
import { CityMap } from "@/components/CityMap";
import { LocalChatAssistant } from "@/components/LocalChatAssistant";
import type { ChatContextPatch } from "@/client/chat-assistant";
import type { LocalPreferenceProfile } from "@/client/local-memory";
import { cityEvents, type Locale } from "@/data/events";

const localeCopy = {
  ru: { heroA: "2 минуты на выбор.", heroB: "Дальше — готовый план.", lead: "Ответь на 15 коротких карточек. QETTYQ учтёт время, бюджет и настроение, затем покажет 1–3 места, куда ты успеваешь.", map: "Открыть карту событий", free: "Свободное время", city: "Что происходит в городе", search: "Например: выставка или концерт", route: "Маршрут в Google Maps", verify: "Проверить событие", lang: "Язык" },
  kk: { heroA: "Таңдауға 2 минут.", heroB: "Содан кейін дайын жоспар.", lead: "15 қысқа карточкаға жауап беріңіз. QETTYQ уақытты, бюджетті және көңіл күйді ескеріп, 1–3 орынды ұсынады.", map: "Оқиғалар картасын ашу", free: "Бос уақыт", city: "Қалада не болып жатыр", search: "Мысалы: көрме немесе концерт", route: "Google Maps-та маршрут", verify: "Оқиғаны тексеру", lang: "Тіл" },
  en: { heroA: "2 minutes to choose.", heroB: "Then your plan is ready.", lead: "Answer 15 quick cards. QETTYQ uses your time, budget and mood to suggest 1–3 places you can actually reach.", map: "Open event map", free: "Free time", city: "What is happening in the city", search: "For example: exhibition or concert", route: "Route in Google Maps", verify: "Verify event", lang: "Language" },
} as const;

const goals: Array<{ id: Goal; icon: string; title: string; text: string; tags: string[] }> = [
  { id: "food", icon: "🥟", title: "Поесть", text: "Найти место, куда успею", tags: ["cafe", "restaurant", "fast_food"] },
  { id: "walk", icon: "🌿", title: "Погулять", text: "Маршрут без лишней суеты", tags: ["park", "garden", "viewpoint"] },
  { id: "activity", icon: "🎭", title: "Заняться чем-то", text: "Культура, творчество, спорт", tags: ["museum", "theatre", "arts_centre"] },
  { id: "new", icon: "✦", title: "Попробовать новое", text: "Выбраться из привычного", tags: ["culture", "library", "museum"] },
];

const interestCards = [
  { title: "Современное искусство", tag: "arts_centre", tone: "violet", mark: "Искусство", symbol: "◫" },
  { title: "Тихий парк", tag: "garden", tone: "green", mark: "Прогулка", symbol: "↟" },
  { title: "Кофе с видом", tag: "cafe", tone: "orange", mark: "Кофе", symbol: "◒" },
  { title: "История города", tag: "museum", tone: "blue", mark: "Музей", symbol: "⌂" },
  { title: "Театр вечером", tag: "theatre", tone: "coral", mark: "Сцена", symbol: "✦" },
  { title: "Архитектура Астаны", tag: "architecture", tone: "violet", mark: "Город", symbol: "◇" },
  { title: "Книжное место", tag: "library", tone: "blue", mark: "Тишина", symbol: "▤" },
  { title: "Прогулка у воды", tag: "park", tone: "green", mark: "Воздух", symbol: "≈" },
  { title: "Локальная кухня", tag: "restaurant", tone: "orange", mark: "Еда", symbol: "○" },
  { title: "Новая выставка", tag: "museum", tone: "violet", mark: "Выставка", symbol: "□" },
  { title: "Камерная музыка", tag: "theatre", tone: "coral", mark: "Музыка", symbol: "♪" },
  { title: "Необычный ракурс", tag: "viewpoint", tone: "blue", mark: "Вид", symbol: "△" },
  { title: "С детьми", tag: "playground", tone: "green", mark: "Семья", symbol: "☺" },
  { title: "Быстро перекусить", tag: "fast_food", tone: "orange", mark: "Быстро", symbol: "◐" },
  { title: "Новое без плана", tag: "culture", tone: "violet", mark: "Сюрприз", symbol: "✦" },
];

const SWIPE_COUNT = interestCards.length;

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<"start" | "limits" | "discover" | "results" | "plan" | "explore">("start");
  const [goal, setGoal] = useState<Goal>("new");
  const [minutes, setMinutes] = useState(120);
  const [budget, setBudget] = useState(5000);
  const [cardIndex, setCardIndex] = useState(0);
  const [likedTags, setLikedTags] = useState<string[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Recommendation | null>(null);
  const [generationMode, setGenerationMode] = useState<"llm" | "deterministic">("deterministic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentText, setIntentText] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [activeEventId, setActiveEventId] = useState(cityEvents[0].id);
  const [locale, setLocale] = useState<Locale>("ru");
  const copy = localeCopy[locale];

  const localProfile = useMemo<LocalPreferenceProfile>(() => ({ locale, goal, minutes, budget, likedTags }), [budget, goal, likedTags, locale, minutes]);
  const restoreLocalProfile = useCallback((profile: LocalPreferenceProfile) => {
    setLocale(profile.locale);
    setGoal(profile.goal);
    setMinutes(profile.minutes);
    setBudget(profile.budget);
    setLikedTags(profile.likedTags);
  }, []);
  const applyChatPatch = useCallback((patch: ChatContextPatch) => {
    if (patch.goal) setGoal(patch.goal);
    if (patch.minutes !== undefined) setMinutes(patch.minutes);
    if (patch.budget !== undefined) setBudget(patch.budget);
  }, []);

  const current = interestCards[cardIndex % interestCards.length];
  const progress = useMemo(() => Math.min(100, (cardIndex / SWIPE_COUNT) * 100), [cardIndex]);
  const visibleEvents = useMemo(() => {
    const query = eventQuery.trim().toLocaleLowerCase("ru-RU");
    if (!query) return cityEvents;
    return cityEvents.filter((event) => `${event.title[locale]} ${event.venue[locale]} ${event.category[locale]}`.toLocaleLowerCase("ru-RU").includes(query));
  }, [eventQuery, locale]);
  const activeEvent = cityEvents.find((event) => event.id === activeEventId) ?? cityEvents[0];

  async function finishDiscovery(tags = likedTags) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, minutes, budget, likedTags: tags, origin: { lat: 51.1282, lon: 71.4304 } }),
      });
      if (!response.ok) throw new Error("Не удалось получить варианты");
      const payload = await response.json();
      setResults(payload.items);
      setGenerationMode(payload.generationMode === "llm" ? "llm" : "deterministic");
      setStage("results");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  function react(like: boolean) {
    const nextTags = like && !likedTags.includes(current.tag) ? [...likedTags, current.tag] : likedTags;
    if (nextTags !== likedTags) setLikedTags(nextTags);
    if (cardIndex >= SWIPE_COUNT - 1) void finishDiscovery(nextTags);
    else setCardIndex((value) => value + 1);
  }

  function continueFromIntent() {
    const value = intentText.toLocaleLowerCase("ru-RU");
    if (/кофе|поесть|еда|ресторан|перекус/.test(value)) setGoal("food");
    else if (/гулять|прогул|парк|воздух/.test(value)) setGoal("walk");
    else if (/музей|театр|выстав|концерт|занят/.test(value)) setGoal("activity");
    else setGoal("new");
    setStage("limits");
  }

  return (
    <main className="shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <header className="topbar">
        <button className="wordmark" onClick={() => setStage("start")} aria-label="QETTYQ — на главную">
          QETTYQ<span>•</span>
        </button>
        <div className="top-actions"><div className="locale-switch" aria-label="Язык интерфейса">{(["ru", "kk", "en"] as Locale[]).map((code) => <button key={code} className={locale === code ? "active" : ""} onClick={() => setLocale(code)}>{code === "kk" ? "ҚАЗ" : code.toUpperCase()}</button>)}</div><div className="city"><MapPin size={15} /> Астана <small>пилот</small></div></div>
      </header>

      <>
        {stage === "start" && (
          <motion.section className="screen start start-workbench" key="start" initial={false} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}>
            <div className="start-copy">
              <div className="eyebrow">Первый запуск в Астане</div>
              <h1>{copy.heroA}<br /><em>{copy.heroB}</em></h1>
              <p className="lead">{copy.lead}</p>
              <div className="promise-row" aria-label="Как работает подборка">
                <span><b>15</b> свайпов</span>
                <span><b>80</b> мест в пилоте</span>
                <span><b>1–3</b> варианта</span>
              </div>
              <div className="prompt-composer">
                <label htmlFor="intent">Что хочется сегодня?</label>
                <div>
                  <MessageCircle size={19} />
                  <input id="intent" value={intentText} onChange={(event) => setIntentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") continueFromIntent(); }} placeholder="Например: тихо погулять и выпить кофе" />
                  <button onClick={continueFromIntent} aria-label="Продолжить"><ArrowRight size={18} /></button>
                </div>
              </div>
              <div className="quick-intents">
                {goals.map((item) => (
                  <button key={item.id} onClick={() => { setGoal(item.id); setStage("limits"); }}>{item.icon} {item.title}</button>
                ))}
              </div>
            </div>
            <LocalChatAssistant
              profile={localProfile}
              onRestore={restoreLocalProfile}
              onPatch={applyChatPatch}
              onStart={() => setStage("limits")}
              onOpenMap={() => setStage("explore")}
            />
          </motion.section>
        )}

        {stage === "explore" && (
          <motion.section className="screen city-explorer" key="explore" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="explorer-head">
              <button className="back" onClick={() => setStage("start")}><ArrowLeft size={18} /> Первый экран</button>
              <span><i /> Астана · snapshot 19.10.2026</span>
            </div>
            <div className="explorer-grid">
              <aside className="event-rail">
                <div className="event-rail-title"><span>{copy.free}</span><h1>{copy.city}</h1><p>Выберите событие на карте или опишите план помощнику.</p></div>
                <div className="mini-chat"><MessageCircle size={18} /><input aria-label={copy.search} value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} placeholder={copy.search} /><button aria-label="Найти"><ArrowRight size={17} /></button></div>
                <div className="event-list">
                  {visibleEvents.map((event, index) => (
                    <button className={event.id === activeEventId ? "event-item active" : "event-item"} key={event.id} onClick={() => setActiveEventId(event.id)}>
                      <i>{index + 1}</i><span><small>{event.category[locale]} · {event.dateLabel[locale]} · {copy.lang}: {event.contentLanguage.toUpperCase()}</small><b>{event.title[locale]}</b><em>{event.venue[locale]} · {event.priceFrom === null ? "цена не указана" : `от ${event.priceFrom.toLocaleString("ru-RU")} ₸`}</em></span>
                    </button>
                  ))}
                  {!visibleEvents.length && <p className="no-events">В snapshot нет такого события. Измените запрос или откройте источник афиши.</p>}
                </div>
              </aside>
              <div className="map-workspace">
                <CityMap points={(visibleEvents.length ? visibleEvents : cityEvents).map((event) => ({ id: event.id, lat: event.lat, lon: event.lon, title: event.title[locale], dateLabel: event.dateLabel[locale], category: event.category[locale] }))} activeId={activeEventId} onSelect={setActiveEventId} />
                <article className="map-event-card">
                  <div><span>{activeEvent.category[locale]} · {copy.lang}: {activeEvent.contentLanguage.toUpperCase()}</span><h2>{activeEvent.title[locale]}</h2><p><CalendarDays size={15} /> {activeEvent.dateLabel[locale]} · {activeEvent.venue[locale]}</p></div>
                  <div className="map-actions">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${activeEvent.lat},${activeEvent.lon}&travelmode=walking`} target="_blank" rel="noreferrer"><Navigation size={16} /> {copy.route}</a>
                    <a href={activeEvent.sourceUrl} target="_blank" rel="noreferrer">{copy.verify} <ArrowRight size={15} /></a>
                  </div>
                </article>
                <p className="map-disclosure">Карта: OpenStreetMap fallback без ключа. Кнопка маршрута открывает Google Maps. Для встроенного Google Maps нужен отдельный browser key.</p>
              </div>
            </div>
          </motion.section>
        )}

        {stage === "limits" && (
          <motion.section className="screen limits" key="limits" initial={reduceMotion ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}>
            <button className="back" onClick={() => setStage("start")}><ArrowLeft size={18} /> Назад</button>
            <div className="step-label">Контекст, шаг 1 из 2</div>
            <h2>Сколько времени<br />и какой бюджет?</h2>
            <div className="control-panel">
              <label><span><Clock3 size={18} /> Свободное время</span><strong>{minutes} мин</strong></label>
              <input type="range" min="30" max="180" step="30" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
              <div className="ticks"><span>30</span><span>60</span><span>90</span><span>120</span><span>150</span><span>180</span></div>
            </div>
            <div className="control-panel budget-panel">
              <label htmlFor="budget"><span><WalletCards size={18} /> Бюджет на человека</span><strong>{budget.toLocaleString("ru-RU")} ₸</strong></label>
              <input id="budget" className="number-input" type="number" min="0" step="500" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
              <p>Ноль означает: показывать только подтверждённо бесплатные варианты.</p>
            </div>
            <div className="location-note"><MapPin size={18} /><div><b>Стартуем у Байтерека</b><small>Демо-точка · можно изменить позже</small></div></div>
            <button className="primary" onClick={() => setStage("discover")}>Перейти к 15 свайпам <ArrowRight size={18} /></button>
          </motion.section>
        )}

        {stage === "discover" && (
          <motion.section className="screen discover" key="discover" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }}>
            <div className="discover-head"><button className="back" onClick={() => setStage("limits")}><ArrowLeft size={18} /></button><div className="progress"><i style={{ width: `${progress}%` }} /></div><span>{Math.min(cardIndex + 1, SWIPE_COUNT)}/{SWIPE_COUNT}</span></div>
            <div className="context-chip"><Clock3 size={15} /> {minutes} мин <i /> до {budget.toLocaleString("ru-RU")} ₸ <button onClick={() => setStage("limits")}>Изменить</button></div>
            <p className="deck-kicker">Свайп вправо, если откликается</p>
            <AnimatePresence mode="popLayout">
              <motion.article className={`swipe-card ${current.tone}`} key={current.tag} initial={reduceMotion ? false : { opacity: 0, scale: .94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: 160, rotate: 8 }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}>
                <div className="card-grid" />
                <span className="card-mark">{current.mark}</span>
                <div className="card-symbol">{current.symbol}</div>
                <div><small>Это интерес, не обещание события</small><h2>{current.title}</h2><p>После свайпов найдём реальные места и покажем источник каждого варианта.</p></div>
              </motion.article>
            </AnimatePresence>
            {error && <p className="error">{error}</p>}
            <div className="swipe-actions">
              <button onClick={() => react(false)} aria-label="Не сейчас"><ArrowLeft size={22} /><span>Не сейчас</span></button>
              <button className="like" onClick={() => react(true)} disabled={loading} aria-label="Интересно"><Heart size={23} fill="currentColor" /><span>{loading ? "Ищем…" : "Интересно"}</span></button>
            </div>
          </motion.section>
        )}

        {stage === "results" && (
          <motion.section className="screen results" key="results" initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="result-header"><div><span className="step-label">Подборка по текущему контексту</span><h2>Подходящие<br />варианты</h2></div><button className="round" onClick={() => { setCardIndex(0); setLikedTags([]); setStage("discover"); }} aria-label="Начать заново"><RotateCcw size={19} /></button></div>
            <p className="result-note">{generationMode === "llm" ? "Помощник объяснил выбор по данным найденных мест. Названия и ссылки взяты из OpenStreetMap." : "Подборка рассчитана локально по времени, расстоянию и выбранным интересам."}</p>
            <div className="result-list">
              {results.length ? results.map((item, index) => (
                <article className="result-card" key={item.id}>
                  <div className="result-index">0{index + 1}</div>
                  <div className="result-body">
                    <div className="result-top"><span>{item.category}</span><span className={item.feasibility}>{item.feasibility === "feasible" ? "Подходит" : "Нужно уточнить"}</span></div>
                    <h3>{item.name}</h3>
                    <p>{item.reason}</p>
                    <div className="metrics"><span><MapPin size={15} /> {item.distanceKm.toFixed(1)} км</span><span><Clock3 size={15} /> ≈ {item.totalMinutes} мин</span></div>
                    <div className="unknown">{item.unknowns[0]}</div>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">Источник: {item.sourceName} <ArrowRight size={15} /></a>
                    <button className="choose-plan" onClick={() => { setSelectedPlan(item); setStage("plan"); }}>Выбрать этот план <ArrowRight size={15} /></button>
                  </div>
                </article>
              )) : <div className="empty"><h3>Подходящих вариантов пока нет</h3><p>Увеличь время или измени интересы — ограничения не были ослаблены автоматически.</p><button className="primary" onClick={() => setStage("limits")}>Изменить условия</button></div>}
            </div>
          </motion.section>
        )}

        {stage === "plan" && selectedPlan && (
          <motion.section className="screen plan" key="plan" initial={reduceMotion ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
            <button className="back" onClick={() => setStage("results")}><ArrowLeft size={18} /> К вариантам</button>
            <span className="step-label">Маршрут рассчитан приблизительно</span>
            <h2>{selectedPlan.name}</h2>
            <p className="plan-lead">План не является бронью. Перед выходом проверь условия у первоисточника.</p>
            <div className="timeline">
              <div><i>1</i><span><b>Старт · Байтерек</b><small>Демо-точка</small></span></div>
              <div className="timeline-path"><span>≈ {selectedPlan.travelMinutes} мин пешком</span></div>
              <div><i>2</i><span><b>{selectedPlan.name}</b><small>Оценка визита: {selectedPlan.durationMinutes} мин</small></span></div>
              <div className="timeline-path"><span>+ 10 мин запаса</span></div>
              <div><i>3</i><span><b>Итого ≈ {selectedPlan.totalMinutes} мин</b><small>{selectedPlan.distanceKm.toFixed(1)} км по прямой до места</small></span></div>
            </div>
            <div className="plan-warning"><b>Почему «≈»?</b><p>Routing-provider пока не подключён. Время оценено по прямому расстоянию и скорости 4.5 км/ч; это не точный пеший маршрут.</p></div>
            <a className="primary plan-source" href={selectedPlan.sourceUrl} target="_blank" rel="noreferrer">Открыть источник <ArrowRight size={18} /></a>
          </motion.section>
        )}
      </>
      <footer><span>QETTYQ / ASTANA</span><nav><Link href="/about">О продукте</Link><Link href="/sources">Источники</Link><Link href="/privacy">Приватность</Link></nav></footer>
    </main>
  );
}
