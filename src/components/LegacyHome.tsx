"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, Bookmark, CalendarDays, Check, ChevronDown, Clock3, Heart, MapPin, MessageCircle, Navigation, RotateCcw, Settings, WalletCards } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Goal, Recommendation } from "@/domain/types";
import { CityMap } from "@/components/CityMap";
import { LocalChatAssistant } from "@/components/LocalChatAssistant";
import type { ChatContextPatch } from "@/client/chat-assistant";
import type { LocalPreferenceProfile } from "@/client/local-memory";
import { cityEvents, type Locale } from "@/data/events";
import { AppShell } from "@/components/ui/AppShell";
import type { DockTarget } from "@/components/ui/BottomDock";
import { QButton } from "@/components/ui/QButton";
import { QOverlay } from "@/components/ui/QOverlay";

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
  { id: "culture-history", title: "Культура и история", tag: "museum", image: "/assets/ideas/01-culture-history.jpg", alt: "Иллюстрация интереса: культура и история" },
  { id: "rock-live-music", title: "Рок и живая музыка", tag: "theatre", image: "/assets/ideas/02-rock-live-music.jpg", alt: "Иллюстрация интереса: рок и живая музыка" },
  { id: "ballet-theatre", title: "Балет и театр", tag: "theatre", image: "/assets/ideas/03-ballet-theatre.jpg", alt: "Иллюстрация интереса: балет и театр" },
  { id: "bachata-social-dance", title: "Бачата и танцы", tag: "arts_centre", image: "/assets/ideas/04-bachata-social-dance.jpg", alt: "Иллюстрация интереса: бачата и социальные танцы" },
  { id: "drums-hand-music", title: "Барабаны и ритм", tag: "arts_centre", image: "/assets/ideas/05-drums-hand-music.jpg", alt: "Иллюстрация интереса: барабаны и музыка руками" },
  { id: "armwrestling-strength", title: "Армрестлинг и сила", tag: "sports_centre", image: "/assets/ideas/06-armwrestling-strength.jpg", alt: "Иллюстрация интереса: армрестлинг и силовой спорт" },
  { id: "active-leisure", title: "Активный отдых", tag: "park", image: "/assets/ideas/07-active-leisure.jpg", alt: "Иллюстрация интереса: активный отдых" },
  { id: "banya-country-retreat", title: "Баня и загородный отдых", tag: "spa", image: "/assets/ideas/08-banya-country-retreat.jpg", alt: "Иллюстрация интереса: баня и загородный отдых" },
  { id: "shashlik-friends", title: "Шашлык и компания", tag: "restaurant", image: "/assets/ideas/09-shashlik-friends.jpg", alt: "Иллюстрация интереса: шашлык и компания" },
  { id: "fine-dining", title: "Fine dining", tag: "restaurant", image: "/assets/ideas/10-fine-dining.jpg", alt: "Иллюстрация интереса: гастрономический вечер" },
  { id: "coffee-quiet-evening", title: "Кофе и спокойный вечер", tag: "cafe", image: "/assets/ideas/11-coffee-quiet-evening.jpg", alt: "Иллюстрация интереса: кофе и спокойный вечер" },
  { id: "exhibition-contemporary-art", title: "Выставка и современное искусство", tag: "arts_centre", image: "/assets/ideas/12-exhibition-contemporary-art.jpg", alt: "Иллюстрация интереса: выставка и современное искусство" },
  { id: "cinema", title: "Кино", tag: "cinema", image: "/assets/ideas/13-cinema.jpg", alt: "Иллюстрация интереса: кино" },
  { id: "workshop-creativity", title: "Мастер-класс и творчество", tag: "arts_centre", image: "/assets/ideas/14-workshop-creativity.jpg", alt: "Иллюстрация интереса: мастер-класс и творчество" },
  { id: "walk-architecture", title: "Прогулка и архитектура", tag: "architecture", image: "/assets/ideas/15-walk-architecture.jpg", alt: "Иллюстрация интереса: прогулка и архитектура" },
] as const;

const SWIPE_COUNT = interestCards.length;

function candidateMedia(item: Recommendation) {
  const category = item.category.toLocaleLowerCase("ru-RU");
  if (category.includes("theatre") || category.includes("театр")) return { src: "/assets/ideas/03-ballet-theatre.jpg", label: "театр" };
  if (category.includes("cafe") || category.includes("кафе")) return { src: "/assets/ideas/11-coffee-quiet-evening.jpg", label: "кафе" };
  if (category.includes("restaurant") || category.includes("ресторан")) return { src: "/assets/ideas/09-shashlik-friends.jpg", label: "ресторан" };
  if (category.includes("cinema") || category.includes("кино")) return { src: "/assets/ideas/13-cinema.jpg", label: "кино" };
  if (category.includes("park") || category.includes("парк")) return { src: "/assets/ideas/07-active-leisure.jpg", label: "активный отдых" };
  return { src: "/assets/ideas/01-culture-history.jpg", label: "культура и город" };
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<"start" | "limits" | "discover" | "results" | "detail" | "plan" | "explore" | "search" | "profile">("start");
  const [goal, setGoal] = useState<Goal>("new");
  const [minutes, setMinutes] = useState(120);
  const [budget, setBudget] = useState(5000);
  const [cardIndex, setCardIndex] = useState(0);
  const [likedTags, setLikedTags] = useState<string[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentText, setIntentText] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [activeEventId, setActiveEventId] = useState(cityEvents[0].id);
  const [locale, setLocale] = useState<Locale>("ru");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [saveAnnouncement, setSaveAnnouncement] = useState("");
  const dragX = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-180, 180], [-6, 6]);
  const likeOpacity = useTransform(dragX, [18, 118], [0, 1]);
  const skipOpacity = useTransform(dragX, [-118, -18], [1, 0]);
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
      const payload = await response.json() as { items: Recommendation[] };
      setResults(payload.items);
      setStage("results");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  function react(like: boolean) {
    dragX.set(0);
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

  const dockTarget: DockTarget | undefined = stage === "results" || stage === "detail"
    ? "discover"
    : stage === "explore"
      ? "map"
      : stage === "search" || stage === "profile"
        ? stage
        : undefined;

  function navigateDock(target: DockTarget) {
    if (target === "discover") setStage(results.length ? "results" : "start");
    if (target === "map") setStage("explore");
    if (target === "search") setStage("search");
    if (target === "profile") setStage("profile");
  }

  function toggleSaved(item: Recommendation) {
    const isSaved = savedIds.includes(item.id);
    setSavedIds((ids) => isSaved ? ids.filter((id) => id !== item.id) : [...ids, item.id]);
    setSaveAnnouncement(isSaved ? `${item.name} удалено из сохранённых` : `${item.name} сохранено`);
  }

  function openDetails(item: Recommendation) {
    setSelectedPlan(item);
    setStage("detail");
  }

  return (
    <AppShell dock={dockTarget} onNavigate={navigateDock}>
      <header className={`topbar${stage === "results" ? " topbar--feed" : ""}`}>
        <button className="wordmark" onClick={() => { if (stage === "results") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); else setStage("start"); }} aria-label="QETTYQ — в начало ленты">
          QETTYQ<span>•</span>
        </button>
        <div className="top-actions"><button type="button" className="city" aria-haspopup="dialog" onClick={() => setCityOpen(true)}><MapPin size={17} /> Астана <ChevronDown size={15} aria-hidden="true" /></button><QButton variant="icon" size={44} aria-label="Настройки" leadingIcon={<Settings size={20} />} onClick={() => setSettingsOpen(true)} /></div>
      </header>

      <QOverlay open={cityOpen} title="Город" onClose={() => setCityOpen(false)}>
        <div className="city-choice" aria-current="true"><MapPin size={20} /><div><b>Астана</b><span>Пилот QETTYQ работает только в этом городе</span></div><Check size={20} /></div>
      </QOverlay>

      <QOverlay open={settingsOpen} title="Настройки" onClose={() => setSettingsOpen(false)}>
        <section className="settings-section" aria-labelledby="language-heading">
          <h3 id="language-heading">Язык интерфейса</h3>
          <div className="locale-switch locale-switch--settings" aria-label="Язык интерфейса">{(["ru", "kk", "en"] as Locale[]).map((code) => <button key={code} className={locale === code ? "active" : ""} aria-pressed={locale === code} onClick={() => setLocale(code)}>{code === "kk" ? "ҚАЗ" : code.toUpperCase()}</button>)}</div>
        </section>
        <section className="settings-section" aria-labelledby="data-heading">
          <h3 id="data-heading">Данные и память</h3>
          <p>Предпочтения и диалог сохраняются только в этом браузере. Точная геолокация не сохраняется.</p>
          <div className="trust-links"><Link href="/sources">Источники данных</Link><Link href="/privacy">Память и приватность</Link></div>
        </section>
      </QOverlay>

      <>
        {stage === "start" && (
          <motion.section className="screen start start-workbench" key="start" initial={false} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}>
            <div className="start-copy">
              <div className="eyebrow">Пилот в Астане</div>
              <h1>Как проведём<br />свободное время?</h1>
              <h2 className="start-subtitle">{copy.heroA} {copy.heroB}</h2>
              <p className="lead">{copy.lead}</p>
              <div className="promise-row" aria-label="Как работает подборка">
                <span><b>15</b> свайпов</span>
                <span><b>3</b> видимых ограничения</span>
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
              <div className="home-actions">
                <QButton onClick={() => setStage("limits")} trailingIcon={<ArrowRight size={18} />}>Настроить подборку</QButton>
                <QButton variant="text" size={48} onClick={() => setStage("explore")}>Показать на карте</QButton>
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
            <QButton onClick={() => setStage("discover")} trailingIcon={<ArrowRight size={18} />}>Перейти к 15 свайпам</QButton>
          </motion.section>
        )}

        {stage === "discover" && (
          <motion.section className="screen discover" key="discover" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }}>
            <div className="discover-head"><button className="back" onClick={() => setStage("limits")} aria-label="Назад к условиям"><ArrowLeft size={18} /></button><div className="progress" role="progressbar" aria-label="Выбор интересов" aria-valuemin={0} aria-valuemax={SWIPE_COUNT} aria-valuenow={cardIndex}><i style={{ width: `${progress}%` }} /></div><span>{Math.min(cardIndex + 1, SWIPE_COUNT)}/{SWIPE_COUNT}</span></div>
            <div className="context-chip"><Clock3 size={15} /> {minutes} мин <i /> до {budget.toLocaleString("ru-RU")} ₸ <button onClick={() => setStage("limits")}>Изменить</button></div>
            <div className="deck-kicker"><b>Выбери, что тебе по душе</b><span>Мы запомним ответы и соберём ленту событий по твоему вайбу.</span></div>
            <AnimatePresence mode="popLayout">
              <motion.article
                className="swipe-card"
                key={current.id}
                aria-label={`${current.title}. Свайп вправо — интересно, влево — не сейчас.`}
                drag={reduceMotion ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                style={{ x: dragX, rotate: reduceMotion ? 0 : cardRotate }}
                initial={reduceMotion ? false : { opacity: 0, scale: .97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: .96 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) >= 96 || Math.abs(info.velocity.x) >= 520) react(info.offset.x > 0);
                }}
              >
                <Image className="swipe-card-image" src={current.image} alt={current.alt} fill sizes="(max-width: 799px) 82vw, 342px" priority={cardIndex < 2} />
                <div className="swipe-card-shade" />
                <motion.span className="swipe-verdict is-skip" style={{ opacity: skipOpacity }}>Не сейчас</motion.span>
                <motion.span className="swipe-verdict is-like" style={{ opacity: likeOpacity }}>Интересно</motion.span>
                <div className="swipe-card-copy"><small>Идея · не реальное событие</small><h2>{current.title}</h2></div>
              </motion.article>
            </AnimatePresence>
            {error && <div className="error" role="alert"><span>{error}</span><small>Повторите последний выбор.</small></div>}
            <div className="swipe-actions">
              <QButton variant="secondary" size={56} onClick={() => react(false)} aria-label="Не сейчас" leadingIcon={<ArrowLeft size={22} />}>Не сейчас</QButton>
              <QButton size={56} onClick={() => react(true)} loading={loading} loadingLabel="Ищем варианты…" aria-label="Интересно" leadingIcon={<Heart size={22} fill="currentColor" />}>Интересно</QButton>
            </div>
          </motion.section>
        )}

        {stage === "results" && (
          <motion.section className="screen results feed-screen" key="results" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="context-rail" role="list" aria-label="Текущие условия">
              <span role="listitem"><Clock3 size={15} /> {minutes} мин</span>
              <span role="listitem"><WalletCards size={15} /> {budget === 0 ? "Только бесплатно" : `до ${budget.toLocaleString("ru-RU")} ₸`}</span>
              <span role="listitem"><MapPin size={15} /> Байтерек</span>
              <button type="button" onClick={() => setStage("limits")}>Изменить условия</button>
            </div>
            <div className="feed-heading"><h1 id="feed-title">Для тебя</h1><button className="round" onClick={() => { setCardIndex(0); setLikedTags([]); setStage("discover"); }} aria-label="Настроить интересы заново"><RotateCcw size={19} /></button></div>
            <div className="sr-only" aria-live="polite">{saveAnnouncement}</div>
            {results.length ? (() => {
              const hero = results[0];
              const media = candidateMedia(hero);
              const saved = savedIds.includes(hero.id);
              return (
                <>
                  <article className="feed-hero" aria-labelledby={`candidate-${hero.id}`} onClick={() => openDetails(hero)}>
                    <div className="feed-hero__media">
                      <Image src={media.src} alt={`Иллюстрация категории: ${media.label}`} fill sizes="(max-width: 520px) calc(100vw - 44px), 386px" />
                      <span className="feed-media-label">Иллюстрация категории</span>
                      <QButton className="feed-save" variant="icon" size={44} aria-label={saved ? "Убрать из сохранённых" : "Сохранить"} aria-pressed={saved} visualState={saved ? "success" : "default"} onClick={(event) => { event.stopPropagation(); toggleSaved(hero); }} leadingIcon={saved ? <Check size={20} /> : <Bookmark size={20} />} />
                    </div>
                    <div className="feed-hero__content">
                      <h2 id={`candidate-${hero.id}`}>{hero.name}</h2>
                      <p className="feed-category">{hero.category} · Астана</p>
                      <div className="feed-facts" aria-label="Основные факты">
                        <span><Navigation size={16} /> ≈ {hero.travelMinutes} мин до места</span>
                        <span><Clock3 size={16} /> {hero.durationMinutes} мин на посещение</span>
                        <span><WalletCards size={16} /> {hero.price ? `от ${hero.price.min.toLocaleString("ru-RU")} ₸` : "Цена не указана"}</span>
                      </div>
                      <div className="feed-reason"><b>Почему подходит</b><p>{hero.reason}</p></div>
                      {hero.unknowns.length > 0 && <p className="feed-warning">{hero.unknowns[0]}</p>}
                      <div className="feed-footer-row">
                        <a className="feed-source" href={hero.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Источник: {hero.sourceName} <ArrowRight size={15} /></a>
                        <div className="feed-actions"><QButton size={48} onClick={(event) => { event.stopPropagation(); openDetails(hero); }} trailingIcon={<ArrowRight size={16} />}>Подробнее</QButton></div>
                      </div>
                    </div>
                  </article>
                  {results.length > 1 && <section className="feed-more" aria-labelledby="more-title"><h2 id="more-title">Ещё по вашему настроению</h2><div className="feed-more__rail">{results.slice(1).map((item) => { const itemMedia = candidateMedia(item); return <article className="feed-compact" key={item.id}><button type="button" onClick={() => openDetails(item)} aria-label={`Подробнее: ${item.name}`}><span className="feed-compact__media"><Image src={itemMedia.src} alt={`Иллюстрация категории: ${itemMedia.label}`} fill sizes="238px" /><i>Иллюстрация категории</i></span><span className="feed-compact__body"><b>{item.name}</b><small><Navigation size={14} /> ≈ {item.travelMinutes} мин</small><small><WalletCards size={14} /> {item.price ? `от ${item.price.min.toLocaleString("ru-RU")} ₸` : "Цена не указана"}</small></span></button></article>; })}</div></section>}
                </>
              );
            })() : <div className="empty"><h3>По этим условиям вариантов не нашли</h3><p>Ограничения не были ослаблены автоматически.</p><QButton onClick={() => setStage("limits")}>Изменить условия</QButton></div>}
          </motion.section>
        )}

        {stage === "detail" && selectedPlan && (
          <motion.section className="screen detail-screen" key="detail" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <button className="back" onClick={() => setStage("results")}><ArrowLeft size={18} /> Для тебя</button>
            <span className="step-label">{selectedPlan.category} · Астана</span>
            <h1>{selectedPlan.name}</h1>
            <p className="plan-lead">{selectedPlan.reason}</p>
            <div className="profile-list"><div><span>До места</span><b>≈ {selectedPlan.travelMinutes} мин</b></div><div><span>Посещение</span><b>{selectedPlan.durationMinutes} мин</b></div><div><span>Цена</span><b>{selectedPlan.price ? `от ${selectedPlan.price.min.toLocaleString("ru-RU")} ₸` : "Не указана"}</b></div></div>
            {selectedPlan.unknowns.length > 0 && <p className="feed-warning">{selectedPlan.unknowns[0]}</p>}
            <a className="feed-source" href={selectedPlan.sourceUrl} target="_blank" rel="noreferrer">Источник: {selectedPlan.sourceName} <ArrowRight size={15} /></a>
            <QButton onClick={() => setStage("plan")} trailingIcon={<Navigation size={18} />}>Построить маршрут</QButton>
          </motion.section>
        )}

        {stage === "search" && (
          <motion.section className="screen dock-screen assistant-screen" key="search" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="dock-screen__intro"><span className="step-label">Поиск и помощник</span><h1>Что ищем?</h1><p>Найди событие по словам или опиши свободное время, бюджет и настроение. В текущем режиме помощник распознаёт условия локально и не выдумывает события.</p></div>
            <LocalChatAssistant profile={localProfile} onRestore={restoreLocalProfile} onPatch={applyChatPatch} onStart={() => setStage("limits")} onOpenMap={() => setStage("explore")} />
          </motion.section>
        )}

        {stage === "profile" && (
          <motion.section className="screen dock-screen" key="profile" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="dock-screen__intro"><span className="step-label">Профиль</span><h1>Твои настройки</h1><p>Предпочтения сохраняются только в этом браузере. Оценки личности и скрытого профиля нет.</p></div>
            <div className="profile-list">
              <div><span>Свободное время</span><b>{minutes} минут</b></div>
              <div><span>Бюджет</span><b>до {budget.toLocaleString("ru-RU")} ₸</b></div>
              <div><span>Отмечено интересов</span><b>{likedTags.length}</b></div>
              <div><span>Язык интерфейса</span><b>{locale.toUpperCase()}</b></div>
            </div>
            <section className="profile-plans" aria-labelledby="profile-plans-heading">
              <div><h2 id="profile-plans-heading">Сохранённое и планы</h2><span>{savedIds.length} сохранено</span></div>
              {selectedPlan ? <article className="saved-plan"><MapPin size={24} /><div><b>{selectedPlan.name}</b><span>≈ {selectedPlan.totalMinutes} мин · {selectedPlan.distanceKm.toFixed(1)} км по прямой</span></div><QButton size={48} onClick={() => setStage("plan")}>Открыть</QButton></article> : <p>Готового маршрута пока нет. Выбери вариант в персональной ленте.</p>}
            </section>
            <div className="trust-links"><Link href="/sources">Источники данных</Link><Link href="/privacy">Память и приватность</Link></div>
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
    </AppShell>
  );
}
