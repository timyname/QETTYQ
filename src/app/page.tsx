"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Clock3, Heart, MapPin, RotateCcw, Sparkles, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import type { Goal, Recommendation } from "@/domain/types";

const goals: Array<{ id: Goal; icon: string; title: string; text: string; tags: string[] }> = [
  { id: "food", icon: "🥟", title: "Поесть", text: "Найти место, куда успею", tags: ["cafe", "restaurant", "fast_food"] },
  { id: "walk", icon: "🌿", title: "Погулять", text: "Маршрут без лишней суеты", tags: ["park", "garden", "viewpoint"] },
  { id: "activity", icon: "🎭", title: "Заняться чем-то", text: "Культура, творчество, спорт", tags: ["museum", "theatre", "arts_centre"] },
  { id: "new", icon: "✦", title: "Попробовать новое", text: "Выбраться из привычного", tags: ["culture", "library", "museum"] },
];

const interestCards = [
  { title: "Современное искусство", tag: "arts_centre", tone: "violet", mark: "ART / 01" },
  { title: "Тихие городские сады", tag: "garden", tone: "green", mark: "AIR / 02" },
  { title: "Кофе и короткая пауза", tag: "cafe", tone: "orange", mark: "TASTE / 03" },
  { title: "История города", tag: "museum", tone: "blue", mark: "CITY / 04" },
  { title: "Сцена и живой звук", tag: "theatre", tone: "coral", mark: "LIVE / 05" },
];

export default function Home() {
  const [stage, setStage] = useState<"start" | "limits" | "discover" | "results">("start");
  const [goal, setGoal] = useState<Goal>("new");
  const [minutes, setMinutes] = useState(120);
  const [budget, setBudget] = useState(5000);
  const [cardIndex, setCardIndex] = useState(0);
  const [likedTags, setLikedTags] = useState<string[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = interestCards[cardIndex % interestCards.length];
  const progress = useMemo(() => Math.min(100, (cardIndex / 4) * 100), [cardIndex]);

  async function finishDiscovery() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, minutes, budget, likedTags, origin: { lat: 51.1282, lon: 71.4304 } }),
      });
      if (!response.ok) throw new Error("Не удалось получить варианты");
      const payload = await response.json();
      setResults(payload.items);
      setStage("results");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  function react(like: boolean) {
    if (like && !likedTags.includes(current.tag)) setLikedTags((value) => [...value, current.tag]);
    if (cardIndex >= 3) void finishDiscovery();
    else setCardIndex((value) => value + 1);
  }

  return (
    <main className="shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <header className="topbar">
        <button className="wordmark" onClick={() => setStage("start")} aria-label="QETTYQ — на главную">
          QETTYQ<span>•</span>
        </button>
        <button className="city"><MapPin size={15} /> Астана</button>
      </header>

      <AnimatePresence mode="wait">
        {stage === "start" && (
          <motion.section className="screen start" key="start" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="eyebrow"><span>01</span> ГОРОДСКОЙ ВЫБОР БЕЗ БЕСКОНЕЧНЫХ СПИСКОВ</div>
            <h1>Как проведём<br /><em>свободное время?</em></h1>
            <p className="lead">Соберём время, бюджет и настроение — покажем только те места, куда действительно можно успеть.</p>
            <div className="goal-grid">
              {goals.map((item) => (
                <button key={item.id} className={`goal-card ${goal === item.id ? "active" : ""}`} onClick={() => { setGoal(item.id); setStage("limits"); }}>
                  <span className="goal-icon">{item.icon}</span>
                  <span><b>{item.title}</b><small>{item.text}</small></span>
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
            <button className="demo-link" onClick={() => { setGoal("new"); setStage("limits"); }}><Sparkles size={16} /> Посмотреть пример</button>
          </motion.section>
        )}

        {stage === "limits" && (
          <motion.section className="screen limits" key="limits" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <button className="back" onClick={() => setStage("start")}><ArrowLeft size={18} /> Назад</button>
            <div className="step-label">КОНТЕКСТ · 1 ИЗ 2</div>
            <h2>Сколько у нас<br />пространства для выбора?</h2>
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
            <button className="primary" onClick={() => setStage("discover")}>Выбрать настроение <ArrowRight size={18} /></button>
          </motion.section>
        )}

        {stage === "discover" && (
          <motion.section className="screen discover" key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="discover-head"><button className="back" onClick={() => setStage("limits")}><ArrowLeft size={18} /></button><div className="progress"><i style={{ width: `${progress}%` }} /></div><span>{Math.min(cardIndex + 1, 4)}/4</span></div>
            <div className="context-chip"><Clock3 size={15} /> {minutes} мин <i /> до {budget.toLocaleString("ru-RU")} ₸ <button onClick={() => setStage("limits")}>Изменить</button></div>
            <p className="deck-kicker">ОТМЕТЬ, ЧТО ОТКЛИКАЕТСЯ</p>
            <AnimatePresence mode="popLayout">
              <motion.article className={`swipe-card ${current.tone}`} key={current.tag} initial={{ opacity: 0, scale: .94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, x: 160, rotate: 8 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                <div className="card-grid" />
                <span className="card-mark">{current.mark}</span>
                <div className="card-symbol">{current.tag === "garden" ? "↟" : current.tag === "cafe" ? "◒" : "✦"}</div>
                <div><small>ИДЕЯ, НЕ ПОДТВЕРЖДЁННОЕ СОБЫТИЕ</small><h2>{current.title}</h2><p>Найдём реальное место с источником после твоего выбора.</p></div>
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
          <motion.section className="screen results" key="results" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="result-header"><div><span className="step-label">ПЛАН · SNAPSHOT</span><h2>Вот что<br />подходит сейчас</h2></div><button className="round" onClick={() => { setCardIndex(0); setLikedTags([]); setStage("discover"); }} aria-label="Начать заново"><RotateCcw size={19} /></button></div>
            <p className="result-note">AI-объяснение недоступно — показан детерминированный поиск по данным OpenStreetMap.</p>
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
                  </div>
                </article>
              )) : <div className="empty"><h3>Подходящих вариантов пока нет</h3><p>Увеличь время или измени интересы — ограничения не были ослаблены автоматически.</p><button className="primary" onClick={() => setStage("limits")}>Изменить условия</button></div>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <footer><span>QETTYQ / ASTANA</span><span>Данные с источниками · Без скрытого профиля</span></footer>
    </main>
  );
}
