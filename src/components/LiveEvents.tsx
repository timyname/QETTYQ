'use client';

import Image from 'next/image';
import { Bookmark, CalendarDays, ExternalLink, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { LiveAstanaEvent, EventMediaPlan } from '@/server/ingestion/sxodim-live';
import s from './PilotApp.module.css';

export type LiveFeed = {
  items: LiveAstanaEvent[];
  dataMode: 'live' | 'snapshot' | 'unavailable';
  freshness: 'fresh' | 'stale' | 'unavailable';
  fetchedAt: string | null;
  expiresAt?: string | null;
  warnings?: string[];
};

export function eventDate(value: string) {
  const instant = new Date(value);
  return Number.isFinite(+instant) ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' }).format(instant) : 'Дата не подтверждена';
}
export function eventPrice(event: LiveAstanaEvent) {
  if (event.priceFromKzt === null) return 'Стоимость уточняйте';
  if (event.priceFromKzt === 0) return 'Бесплатно · по данным афиши';
  return `${event.price.kind === 'from' ? 'от ' : ''}${event.priceFromKzt.toLocaleString('ru-RU')} ₸ · условия уточняйте`;
}
export function eventImage(event: LiveAstanaEvent) {
  const media = (event as LiveAstanaEvent & { media?: EventMediaPlan }).media;
  if (media?.src && media.src.startsWith('/assets/') && !media.src.includes('..') && !media.src.includes('?')) return media.src;
  if (media?.kind === 'none') return '/assets/ideas/15-walk-architecture.jpg';
  const value = `${event.category ?? ''} ${event.name}`.toLowerCase();
  const image = /концерт|музык|рок|music/.test(value) ? '02-rock-live-music.jpg' : /театр|спектак|балет|theat/.test(value) ? '03-ballet-theatre.jpg' : /мастер|workshop/.test(value) ? '14-workshop-creativity.jpg' : '01-culture-history.jpg';
  return `/assets/ideas/${image}`;
}

function eventImageLabel(event: LiveAstanaEvent) {
  const media = (event as LiveAstanaEvent & { media?: EventMediaPlan }).media;
  return media?.kind === 'none' ? 'Иллюстрация Астаны, не афиша события' : media?.notice ?? (media?.kind === 'organizer_poster' ? 'Афиша организатора' : 'Иллюстрация категории, не фото события');
}

function eventImageFit(event: LiveAstanaEvent) { return (event as LiveAstanaEvent & { media?: EventMediaPlan }).media?.kind === 'organizer_poster' ? 'contain' as const : 'cover' as const; }

export function EventPreview({ event, onOpen }: { event: LiveAstanaEvent; onOpen: () => void }) {
  return <div><button className={s.mini} onClick={onOpen}><div className={s.miniImage}><Image src={eventImage(event)} fill sizes="64px" alt="" /></div><span><b>{event.name}</b><small>{eventDate(event.startsAt)}</small><small>{eventPrice(event)}</small></span><ExternalLink size={16} /></button><a className={s.feedMeta} href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a></div>;
}

export function LiveEvents({ feed, loading, onOpen, saved, onSave }: { feed: LiveFeed | null; loading: boolean; onOpen: (event: LiveAstanaEvent) => void; saved: string[]; onSave: (id: string) => void }) {
  const [period, setPeriod] = useState('upcoming');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
  const events = (feed?.items ?? []).filter(event => period !== 'today' || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date(event.startsAt)) === today);
  return <section className={s.liveSection} aria-label="Афиша Астаны"><div className={s.titleRow}><h2>Афиша Астаны</h2><span className={s.liveBadge}>{loading ? 'Обновляем' : feed?.freshness === 'fresh' ? 'Актуально' : 'Сохранённые данные'}</span></div><div className={s.chips}><button aria-pressed={period === 'upcoming'} onClick={() => setPeriod('upcoming')}>Ближайшие даты</button><button aria-pressed={period === 'today'} onClick={() => setPeriod('today')}>Сегодня</button></div>
    {loading && !feed && <p className={s.muted} role="status">Загружаем подтверждённые даты…</p>}
    {!loading && !events.length && <p className={s.muted}>{feed?.freshness === 'unavailable' || !feed ? 'Афиша временно недоступна. Места на карте остаются доступны.' : period === 'today' ? 'На сегодня подтверждённых событий в подключённой подборке нет. Посмотри ближайшие даты.' : 'В этой подборке пока нет будущих событий.'}</p>}
    {events.length > 0 && <div className={`${s.rail} ${s.eventRail}`}>{events.map(event => <article className={s.feedCard} key={event.id}><div className={s.picture}><Image src={eventImage(event)} fill sizes="430px" alt={eventImageLabel(event)} style={{ objectFit: eventImageFit(event) }} /><small>{eventImageLabel(event)}</small></div><button className={`${s.round} ${s.save}`} aria-label={saved.includes(event.id) ? 'Убрать событие из сохранённых' : 'Сохранить событие'} aria-pressed={saved.includes(event.id)} onClick={() => onSave(event.id)}><Bookmark size={20} fill={saved.includes(event.id) ? 'currentColor' : 'none'} /></button><div className={s.feedCardBody}><small><CalendarDays size={13} /> {eventDate(event.startsAt)}</small><h2>{event.name}</h2><p>{eventPrice(event)}</p><a href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a><button className={s.primary} onClick={() => onOpen(event)}>О событии <ExternalLink size={17} /></button></div></article>)}</div>}
    {feed?.fetchedAt && <p className={s.feedMeta}>Проверено {eventDate(feed.fetchedAt)} · обновление по запросу, кэш до часа.{feed.freshness === 'stale' ? ' Сейчас источник недоступен: это предыдущая загрузка.' : ''} Подборка не охватывает все события города.</p>}
    {events.length > 0 && <p className={s.feedMeta}>Листай события вбок. Даты могут быть позже выбранного окна свободного времени.</p>}
  </section>;
}

export function EventDetail({ event, onSave, saved, onBack }: { event: LiveAstanaEvent; onSave: () => void; saved: boolean; onBack: () => void }) {
  const language = { ru: 'Русский', kk: 'Қазақша', en: 'English', und: 'Язык не указан' }[event.contentLanguage];
  const destination = event.lat !== null && event.lon !== null ? `${event.lat},${event.lon}` : null;
  return <main><button className={`${s.back} ${s.detailBack}`} onClick={onBack}>← Назад</button><div className={`${s.picture} ${s.detailPhoto}`}><Image src={eventImage(event)} fill sizes="430px" alt={eventImageLabel(event)} style={{ objectFit: eventImageFit(event) }} /><small>{eventImageLabel(event)}</small></div><section className={s.pad}><small className={s.eyebrow}>СОБЫТИЕ · АСТАНА</small><h1>{event.name}</h1><div className={s.chips}><span><CalendarDays size={15} /> {eventDate(event.startsAt)}</span><span>{language}</span></div><p><MapPin size={15} /> {event.venueName ?? 'Площадка уточняется'}{event.address ? ` · ${event.address}` : ''}</p><section className={s.panel}><h2>{eventPrice(event)}</h2><p>Наличие мест узнавайте у организатора. Цена может относиться к разным категориям билетов; проверяйте её перед оплатой.</p><p>{event.endsAt ? `Окончание: ${eventDate(event.endsAt)}.` : 'Продолжительность и время окончания не указаны.'}</p>{!destination && <p>Координаты не предоставлены источником. Точку на карте и время пути не подставляем наугад.</p>}</section><a className={s.primary} href={event.bookingUrl ?? event.contactUrl} target="_blank" rel="noreferrer">Подробности и запись <ExternalLink size={17} /></a><button className={s.secondary} aria-pressed={saved} onClick={onSave}><Bookmark size={18} />{saved ? 'Событие сохранено' : 'Сохранить событие'}</button>{destination && <a className={s.secondary} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`}>Построить внешний маршрут</a>}<footer className={s.credit}><a href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a><p>Получено {eventDate(event.fetchedAt)}. Не подтверждение брони.</p></footer></section></main>;
}
