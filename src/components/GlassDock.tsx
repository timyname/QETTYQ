'use client';

import { Localize } from '../client/i18n';

import { useRef, useState, type PointerEvent } from 'react';
import { House, Map, Search, UserRound } from 'lucide-react';
import s from './PilotApp.module.css';

const tabs = [{ id: 'feed', label: 'Для тебя', Icon: House }, { id: 'chat', label: 'Поиск', Icon: Search }, { id: 'map', label: 'Карта', Icon: Map }, { id: 'profile', label: 'Профиль', Icon: UserRound }] as const;
type Tab = typeof tabs[number]['id'];
export function GlassDock({ active, onNavigate }: { active: string; onNavigate: (tab: Tab) => void }) {
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ x: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const nav = useRef<HTMLElement>(null);
  const selected = Math.max(0, tabs.findIndex(tab => tab.id === active));
  function position(clientX: number) { const rect = nav.current!.getBoundingClientRect(); return Math.max(0, Math.min(3, (clientX - rect.left - 8) / ((rect.width - 16) / 4) - .5)); }
  function finish(event: PointerEvent<HTMLElement>, cancel = false) {
    const current = gesture.current;
    if (!current) return;
    gesture.current = null;
    if (!cancel && current.moved) { suppressClick.current = true; event.preventDefault(); onNavigate(tabs[Math.round(position(event.clientX))].id); }
    setDrag(null);
  }
  return <Localize><nav ref={nav} className={s.dock} aria-label="Основная навигация" data-dragging={drag !== null}
    onPointerDown={event => { if (event.button !== 0) return; suppressClick.current = false; gesture.current = { x: event.clientX, moved: false }; }}
    onPointerMove={event => { const current = gesture.current; if (!current) return; if (Math.abs(event.clientX - current.x) > 7) { current.moved = true; event.currentTarget.setPointerCapture(event.pointerId); setDrag(position(event.clientX)); } }}
    onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}>
    <span className={s.dockHighlight} aria-hidden="true" style={{ transform: `translateX(${(drag ?? selected) * 100}%)` }} />
    {tabs.map(({ id, label, Icon }) => <button key={id} aria-current={active === id ? 'page' : undefined} onClick={event => { if (suppressClick.current && event.detail > 0) { suppressClick.current = false; return; } suppressClick.current = false; onNavigate(id); }}><Icon size={22} /><span>{label}</span></button>)}
  </nav></Localize>;
}
