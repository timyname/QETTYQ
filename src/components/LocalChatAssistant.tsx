"use client";

import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeterministicChatAssistant, type ChatContextPatch } from "@/client/chat-assistant";
import {
  appendLocalMessage,
  clearLocalMemory,
  createDefaultLocalMemory,
  loadLocalMemory,
  saveLocalMemory,
  type LocalMemory,
  type LocalPreferenceProfile,
} from "@/client/local-memory";

const provider = new DeterministicChatAssistant();

type Props = {
  profile: LocalPreferenceProfile;
  onRestore: (profile: LocalPreferenceProfile) => void;
  onPatch: (patch: ChatContextPatch) => void;
  onStart: () => void;
  onOpenMap: () => void;
};

function messageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function LocalChatAssistant({ profile, onRestore, onPatch, onStart, onOpenMap }: Props) {
  const [memory, setMemory] = useState<LocalMemory>(() => createDefaultLocalMemory());
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const restored = useRef(false);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    const loaded = loadLocalMemory(window.localStorage);
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setMemory(loaded);
      if (!restored.current) {
        restored.current = true;
        onRestore(loaded.profile);
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [onRestore]);

  useEffect(() => {
    if (!ready) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    saveLocalMemory(window.localStorage, { ...memory, profile });
  }, [memory, profile, ready]);

  async function send(text = draft) {
    const clean = text.trim().slice(0, 500);
    if (!clean || busy) return;
    setBusy(true);
    setDraft("");
    const userMessage = { id: messageId(), role: "user" as const, mode: "user" as const, text: clean, createdAt: new Date().toISOString() };
    const withUser = appendLocalMessage(memory, userMessage);
    setMemory(withUser);
    try {
      const result = await provider.respond({ text: clean, profile, history: withUser.dialogue });
      onPatch(result.patch);
      const next = appendLocalMessage(withUser, {
        id: messageId(),
        role: "assistant",
        mode: result.mode,
        text: result.reply,
        createdAt: new Date().toISOString(),
      });
      setMemory(saveLocalMemory(window.localStorage, next));
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    skipNextPersist.current = true;
    clearLocalMemory(window.localStorage);
    const next = createDefaultLocalMemory();
    setMemory(next);
    onRestore(next.profile);
  }

  return (
    <aside className="assistant-window" aria-label="Локальный помощник QETTYQ">
      <div className="assistant-title">
        <span className="assistant-orb"><Sparkles size={17} /></span>
        <div><b>Помощник QETTYQ</b><small>Контекст хранится только в этом браузере</small></div>
        <i>local fallback</i>
      </div>
      <div className="assistant-dialogue" aria-live="polite">
        {!memory.dialogue.length && <p>Опишите план своими словами. Я извлеку только цель, время и бюджет — без внешнего AI и без выдуманных фактов.</p>}
        {memory.dialogue.map((message) => (
          <p className={message.role === "user" ? "user-message" : undefined} key={message.id}>{message.text}</p>
        ))}
      </div>
      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label htmlFor="assistant-message">Сообщение помощнику</label>
        <div><input id="assistant-message" value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)} placeholder="Погулять 90 минут до 3000 ₸" /><button type="submit" disabled={!draft.trim() || busy} aria-label="Отправить"><ArrowRight size={17} /></button></div>
      </form>
      <div className="assistant-memory-summary"><b>Запомнено на устройстве</b><span>{profile.minutes} мин · до {profile.budget.toLocaleString("ru-RU")} ₸ · {profile.likedTags.length} интересов</span></div>
      <div className="assistant-quick-actions">
        <button type="button" onClick={onStart}>Начать 15 свайпов</button>
        <button type="button" onClick={onOpenMap}>Карта событий</button>
        <button type="button" onClick={clear}><RotateCcw size={14} /> Очистить память</button>
      </div>
      <p className="event-note">Текст не отправляется провайдеру и не синхронизируется. Точная геолокация в localStorage не сохраняется.</p>
    </aside>
  );
}
