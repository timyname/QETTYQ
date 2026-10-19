"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3,
  LocateFixed, MapPin, MessageCircle, Navigation, RotateCcw,
  Search, Send, SlidersHorizontal, Sparkles, Ticket, UserRound, WalletCards,
} from "lucide-react";

type Screen = "welcome" | "context" | "swipe" | "map" | "event" | "assistant" | "memory" | "plan";
type ChatMessage = { role: "user" | "assistant"; text: string };
type MemoryState = {
  liked: string[];
  minutes: number;
  budget: number;
  filter: string;
  planSaved: boolean;
  messages: ChatMessage[];
};

const STORAGE_KEY = "qettyq.site.memory.v1";
const DEFAULT_MEMORY: MemoryState = {
  liked: ["culture", "coffee", "theatre"], minutes: 120, budget: 5000,
  filter: "Сегодня", planSaved: false, messages: [],
};
const filters = ["Сегодня", "Бесплатно", "Культура", "Еда"];
const nav: Array<{ id: Screen; n: string; label: string }> = [
  { id: "welcome", n: "01", label: "Знакомство" },
  { id: "context", n: "02", label: "Контекст" },
  { id: "swipe", n: "03", label: "15 свайпов" },
  { id: "map", n: "04", label: "Карта" },
  { id: "assistant", n: "05", label: "Помощник" },
  { id: "memory", n: "06", label: "Память" },
  { id: "plan", n: "07", label: "План" },
  { id: "event", n: "08", label: "Событие" },
];
const vibes = [
  ["Современное искусство", "culture"], ["Кофе с видом", "coffee"],
  ["Театр вечером", "theatre"], ["Тихая прогулка", "walk"],
  ["Новая кухня", "food"], ["Архитектура", "city"],
  ["Живая музыка", "music"], ["С детьми", "family"],
  ["Книжное место", "books"], ["Активный вечер", "sport"],
  ["История города", "history"], ["Мастер-класс", "craft"],
  ["Прогулка у воды", "water"], ["Необычный вид", "view"], ["Сюрприз", "surprise"],
] as const;

function readMemory(): MemoryState {
  if (typeof window === "undefined") return DEFAULT_MEMORY;
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<MemoryState> | null;
    if (!value) return DEFAULT_MEMORY;
    return {
      liked: Array.isArray(value.liked) ? value.liked.filter((x): x is string => typeof x === "string").slice(0, 15) : DEFAULT_MEMORY.liked,
      minutes: typeof value.minutes === "number" ? Math.min(240, Math.max(30, value.minutes)) : 120,
      budget: typeof value.budget === "number" ? Math.min(100000, Math.max(0, value.budget)) : 5000,
      filter: filters.includes(value.filter ?? "") ? value.filter! : "Сегодня",
      planSaved: value.planSaved === true,
      messages: Array.isArray(value.messages) ? value.messages.filter((m): m is ChatMessage =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string").slice(-16) : [],
    };
  } catch { return DEFAULT_MEMORY; }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [memory, setMemory] = useState<MemoryState>(DEFAULT_MEMORY);
  const [ready, setReady] = useState(false);
  const skipPersist = useRef(false);

  useEffect(() => { queueMicrotask(() => { setMemory(readMemory()); setReady(true); }); }, []);
  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) { skipPersist.current = false; return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  }, [memory, ready]);

  const update = (patch: Partial<MemoryState>) => setMemory((current) => ({ ...current, ...patch }));
  const clearMemory = () => {
    skipPersist.current = true;
    localStorage.removeItem(STORAGE_KEY);
    setMemory({ ...DEFAULT_MEMORY, liked: [], messages: [] });
  };

  return <main className="productShell">
    <aside className="rail">
      <div className="brand">QETTYQ<span>•</span></div>
      <p>Astana pilot · interactive local prototype</p>
      <nav aria-label="Экраны прототипа">{nav.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}><i>{item.n}</i><span>{item.label}</span><ChevronRight size={15}/></button>)}</nav>
      <div className="privacyNote"><Sparkles size={17}/><span>Предпочтения остаются в этом браузере. Внешний AI не вызывается.</span></div>
    </aside>
    <section className="stage" aria-label="Интерактивный прототип QETTYQ">
      <div className="appCanvas">
        {screen === "welcome" && <Welcome go={setScreen}/>}
        {screen === "context" && <Context memory={memory} update={update} go={setScreen}/>}
        {screen === "swipe" && <Swipe liked={memory.liked} update={update} go={setScreen}/>}
        {screen === "map" && <MapScreen filter={memory.filter} update={update} go={setScreen}/>}
        {screen === "event" && <EventScreen memory={memory} update={update} go={setScreen}/>}
        {screen === "assistant" && <Assistant memory={memory} update={update} go={setScreen}/>}
        {screen === "memory" && <MemoryScreen memory={memory} clearMemory={clearMemory} go={setScreen}/>}
        {screen === "plan" && <PlanScreen memory={memory} go={setScreen}/>}
        <BottomNav screen={screen} go={setScreen}/>
      </div>
    </section>
    <aside className="annotation"><span className="prototype"><i/> LOCAL PROTOTYPE</span><h1>{nav.find((item) => item.id === screen)?.label}</h1><p>Адаптивный mobile-first сценарий без имитации корпуса телефона. Демо-факты отмечены явно.</p><div className="spec"><span>Memory</span><b>localStorage</b><span>Assistant</span><b>deterministic fallback</b><span>Data</span><b>demo / unverified</b></div></aside>
  </main>;
}

function Top({ title, back }: { title?: string; back?: () => void }) { return <header className="mobileTop">{back ? <button aria-label="Назад" onClick={back}><ArrowLeft size={19}/></button> : <b>QETTYQ<span>•</span></b>}<strong>{title}</strong><span className="lang">RU</span></header>; }
function DataBadge() { return <span className="dataBadge">DEMO · НЕ ПРОВЕРЕНО</span>; }

function Welcome({ go }: { go: (s: Screen) => void }) { return <div className="mobilePage welcome"><Top/><div className="cityArt"><div className="cityLine"><i/><i/><i/><i/><i/></div><span>ASTANA · PILOT</span></div><div className="welcomeCopy"><small>ТВОЁ СВОБОДНОЕ ВРЕМЯ</small><h2>Не ищи.<br/><em>Выбирай.</em></h2><p>Сохрани контекст и предпочтения, чтобы собрать понятный план на вечер.</p></div><button className="composer" onClick={() => go("assistant")}><MessageCircle size={19}/><span>Что хочется сегодня?</span><ArrowRight size={18}/></button><div className="actions"><button className="primary" onClick={() => go("context")}>Настроить подборку <ArrowRight size={18}/></button><button className="ghost" onClick={() => go("map")}><MapPin size={17}/> Смотреть демо-карту</button></div></div>; }

function Context({ memory, update, go }: { memory: MemoryState; update: (p: Partial<MemoryState>) => void; go: (s: Screen) => void }) { return <div className="mobilePage"><Top title="Контекст" back={() => go("welcome")}/><div className="eyebrow">ШАГ 1 ИЗ 2</div><h2>Сколько у тебя времени?</h2><p className="lead">Контекст хранится только в этом браузере.</p><section className="surface"><Clock3/><strong>{memory.minutes} минут</strong><input aria-label="Свободное время" type="range" min="30" max="240" step="30" value={memory.minutes} onChange={(e) => update({ minutes: Number(e.target.value) })}/></section><section className="surface inputRow"><WalletCards/><label><span>Бюджет, ₸</span><input inputMode="numeric" min="0" max="100000" type="number" value={memory.budget} onChange={(e) => update({ budget: Number(e.target.value) || 0 })}/></label></section><section className="surface inputRow"><LocateFixed/><div><span>Старт</span><b>Уточняется по разрешению геолокации</b></div></section><button className="primary" onClick={() => go("swipe")}>Продолжить <ArrowRight size={18}/></button></div>; }

function Swipe({ liked, update, go }: { liked: string[]; update: (p: Partial<MemoryState>) => void; go: (s: Screen) => void }) {
  const toggle = (id: string) => update({ liked: liked.includes(id) ? liked.filter((x) => x !== id) : [...liked, id].slice(0, 15) });
  return <div className="mobilePage vibePage"><Top title="Твой вайб" back={() => go("context")}/><div className="eyebrow">15 ВЫБОРОВ · ДОСУГ, НЕ ЛЮДИ</div><h2>Что тебе по душе?</h2><div className="vibeGrid">{vibes.map(([title, id], index) => <button key={id} className={liked.includes(id) ? "selected" : ""} onClick={() => toggle(id)}><i>{String(index + 1).padStart(2, "0")}</i><span>{title}</span>{liked.includes(id) && <b><Check size={12}/></b>}</button>)}</div><div className="stickyAction"><span><strong>{liked.length}</strong> выбрано</span><button onClick={() => go("map")}>Собрать <ArrowRight size={17}/></button></div></div>;
}

function LiveGoogleMap({ go }: { go: (s: Screen) => void }) {
  const [key, setKey] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/maps-config").then((response) => response.json()).then((value) => {
      if (!active) return;
      if (value.key) setKey(value.key); else setFailed(true);
    }).catch(() => active && setFailed(true));
    return () => { active = false; };
  }, []);
  return <div className="liveMap" aria-label="Интерактивная Google-карта Астаны">
    {key ? <iframe title="Интерактивная Google-карта Астаны" src={`https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=51.1282,71.4304&zoom=13&maptype=roadmap`} loading="eager" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/> : <div className="mapFallback">{failed ? "Карта временно недоступна" : "Подключаем Google Maps…"}</div>}
    <button className="eventPin pinA" onClick={() => go("event")}><b>DEMO</b> 🎭</button>
    <button className="eventPin pinB" onClick={() => go("event")}><b>DEMO</b> ◈</button>
    <span className="mapLabel">GOOGLE MAPS · СОБЫТИЯ DEMO</span>
  </div>;
}

function MapScreen({ filter, update, go }: { filter: string; update: (p: Partial<MemoryState>) => void; go: (s: Screen) => void }) { return <div className="mobilePage mapPage"><LiveGoogleMap go={go}/><div className="mapHeader"><div className="mapSearch"><Search size={18}/><span>События и места</span><SlidersHorizontal size={18}/></div><div className="filterRow">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => update({ filter: item })}>{item}</button>)}</div></div><button className="locate" aria-label="Определить геопозицию" onClick={() => navigator.geolocation?.getCurrentPosition(() => undefined)}><LocateFixed size={19}/></button><button className="nearbyCard" onClick={() => go("event")}><div className="poster">A</div><div><DataBadge/><b>Сценическое событие</b><span><MapPin size={13}/> Время, цена и доступность уточняются</span></div><ChevronRight size={18}/></button></div>; }

function EventScreen({ memory, update, go }: { memory: MemoryState; update: (p: Partial<MemoryState>) => void; go: (s: Screen) => void }) { return <div className="mobilePage eventPage"><Top title="Карточка" back={() => go("map")}/><div className="eventHero"><DataBadge/><span>A</span></div><h2>Сценическое событие</h2><p className="lead">Демонстрационная карточка интерфейса. Расписание, цена, язык и доступность не подтверждены.</p><div className="facts"><div><CalendarDays/><span><small>Когда</small><b>Неизвестно</b></span></div><div><MapPin/><span><small>Где</small><b>Астана · площадка не подтверждена</b></span></div><div><WalletCards/><span><small>Цена</small><b>Неизвестно</b></span></div></div><a className="sourceLink" href="https://visitastana.kz/" target="_blank" rel="noreferrer">Открыть официальный туристический портал <ArrowRight size={16}/></a><button className="primary" onClick={() => { update({ planSaved: true }); go("plan"); }}>{memory.planSaved ? "Уже в плане" : "Добавить в демо-план"} <Ticket size={17}/></button></div>; }

function deterministicReply(text: string, memory: MemoryState) {
  const lower = text.toLowerCase();
  const goal = lower.includes("гуля") ? "прогулка" : lower.includes("театр") ? "театр" : lower.includes("коф") ? "кофе" : "спокойный досуг";
  return `Понял: ${goal}, около ${memory.minutes} минут, бюджет до ${memory.budget.toLocaleString("ru-RU")} ₸. Это локальный разбор без внешнего AI; конкретные live-варианты пока не загружены.`;
}
function Assistant({ memory, update, go }: { memory: MemoryState; update: (p: Partial<MemoryState>) => void; go: (s: Screen) => void }) {
  const [draft, setDraft] = useState("");
  const messages = useMemo(() => memory.messages.length ? memory.messages : [{ role: "assistant" as const, text: "Опиши настроение, время или бюджет. Я сохраню контекст локально и не буду придумывать факты о событиях." }], [memory.messages]);
  const submit = (e: FormEvent) => { e.preventDefault(); const text = draft.trim(); if (!text) return; update({ messages: [...memory.messages, { role: "user", text }, { role: "assistant", text: deterministicReply(text, memory) }].slice(-16) }); setDraft(""); };
  return <div className="mobilePage assistantPage"><Top title="Помощник" back={() => go("welcome")}/><div className="assistantStatus"><Sparkles size={15}/> Локальный fallback · без сетевого AI</div><div className="messages">{messages.map((m, i) => <div key={`${m.role}-${i}`} className={`message ${m.role}`}>{m.text}</div>)}</div><form className="chatForm" onSubmit={submit}><input aria-label="Сообщение помощнику" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Например: прогулка на час"/><button aria-label="Отправить"><Send size={18}/></button></form></div>;
}

function MemoryScreen({ memory, clearMemory, go }: { memory: MemoryState; clearMemory: () => void; go: (s: Screen) => void }) { return <div className="mobilePage"><Top title="Память и профиль" back={() => go("welcome")}/><div className="profileHero"><UserRound/><div><b>Гостевой профиль</b><span>Только этот браузер</span></div></div><div className="memoryGrid"><section><span>Время</span><b>{memory.minutes} мин</b></section><section><span>Бюджет</span><b>{memory.budget.toLocaleString("ru-RU")} ₸</b></section><section><span>Интересы</span><b>{memory.liked.length}</b></section><section><span>Реплики</span><b>{memory.messages.length}</b></section></div><section className="surface"><h3>Сохранённые интересы</h3><p>{memory.liked.length ? memory.liked.join(" · ") : "Пока ничего"}</p></section><section className="privacyPanel"><b>Не сохраняем</b><p>Точную геолокацию, контакты, платёжные данные и внешние идентификаторы.</p></section><button className="danger" onClick={clearMemory}><RotateCcw size={17}/> Очистить локальную память</button></div>; }

function PlanScreen({ memory, go }: { memory: MemoryState; go: (s: Screen) => void }) { return <div className="mobilePage"><Top title="План и маршрут" back={() => go("map")}/><div className="eyebrow">МАРШРУТ НЕ РАССЧИТАН</div><h2>{memory.planSaved ? "План на вечер" : "План пока пуст"}</h2>{memory.planSaved ? <><button className="planCard" onClick={() => go("event")}><DataBadge/><b>Сценическое событие</b><span>Время, площадка и цена неизвестны</span><ChevronRight/></button><div className="routeBox"><Navigation/><div><b>Передача в карты</b><span>QETTYQ не показывает ETA без расчёта маршрута.</span></div></div><a className="primary linkButton" href="https://www.google.com/maps/search/?api=1&query=Astana" target="_blank" rel="noreferrer">Открыть поиск в Google Maps <ArrowRight size={17}/></a></> : <div className="emptyState"><Ticket/><p>Добавь демо-событие с карты, чтобы проверить сценарий.</p><button className="primary" onClick={() => go("map")}>Перейти на карту</button></div>}</div>; }

function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) { return <nav className="bottomNav" aria-label="Основная навигация"><button className={screen === "map" ? "active" : ""} onClick={() => go("map")}><MapPin/><span>Карта</span></button><button className={screen === "plan" ? "active" : ""} onClick={() => go("plan")}><Ticket/><span>План</span></button><button className={screen === "assistant" ? "active" : ""} onClick={() => go("assistant")}><MessageCircle/><span>Помощник</span></button><button className={screen === "memory" ? "active" : ""} onClick={() => go("memory")}><UserRound/><span>Профиль</span></button></nav>; }
