'use client';

import Image from 'next/image';
import { ArrowLeft, Bookmark, CalendarDays, ExternalLink, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import { ProgressRail } from './ProgressRail';
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
  return media?.kind === 'none' ? 'Иллюстрация Астаны, не афиша события' : media?.kind === 'organizer_poster' ? `Афиша организатора${media.credit ? ` · ${media.credit}` : ''}` : media?.notice ?? 'Иллюстрация категории, не фото события';
}

function eventImageFit(event: LiveAstanaEvent) { return (event as LiveAstanaEvent & { media?: EventMediaPlan }).media?.kind === 'organizer_poster' ? 'contain' as const : 'cover' as const; }

export function EventPreview({ event, onOpen }: { event: LiveAstanaEvent; onOpen: () => void }) {
  return <div><button className={s.mini} onClick={onOpen}><div className={s.miniImage}><Image src={eventImage(event)} fill sizes="64px" alt="" /></div><span><b>{event.name}</b><small>{eventDate(event.startsAt)}</small><small>{eventPrice(event)}</small></span><ExternalLink size={16} /></button><a className={s.feedMeta} href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a></div>;
}

export function LiveEvents({ feed, loading, onOpen, saved, onSave }: { feed: LiveFeed | null; loading: boolean; onOpen: (event: LiveAstanaEvent) => void; saved: string[]; onSave: (id: string) => void }) {
  const [period, setPeriod] = useState('upcoming');
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
  const events = (feed?.items ?? []).filter(event => period !== 'today' || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date(event.startsAt)) === today);
  function selectPeriod(value: string) { setPeriod(value); setActive(0); rail.current?.scrollTo({ left: 0 }); }
  return <section className={s.liveSection} aria-label="Афиша Астаны"><div className={s.titleRow}><h2>Афиша Астаны</h2><span className={s.liveBadge}>{loading ? 'Обновляем' : feed?.freshness === 'fresh' ? 'Актуально' : feed?.freshness === 'stale' ? 'Предыдущая загрузка' : 'Нет связи'}</span></div><p className={s.feedMeta}>Все подключённые события. Даты и стоимость могут не совпадать с твоими условиями.</p><div className={s.chips}><button aria-pressed={period === 'upcoming'} onClick={() => selectPeriod('upcoming')}>Ближайшие даты</button><button aria-pressed={period === 'today'} onClick={() => selectPeriod('today')}>Сегодня</button></div>
    {loading && !feed && <p className={s.muted} role="status">Загружаем подтверждённые даты…</p>}
    {!loading && !events.length && <p className={s.muted}>{feed?.freshness === 'unavailable' || !feed ? 'Афиша временно недоступна. Места на карте остаются доступны.' : period === 'today' ? 'На сегодня подтверждённых событий в подключённой подборке нет. Посмотри ближайшие даты.' : 'В этой подборке пока нет будущих событий.'}</p>}
    {events.length > 0 && <div className={s.carousel}><ProgressRail count={events.length} active={Math.min(active, events.length - 1)} label="События" onSelect={index => rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: 'smooth' })} /><div ref={rail} className={`${s.rail} ${s.eventRail}`} onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>{events.map(event => <article className={s.feedCard} key={event.id}><div className={s.picture}><Image src={eventImage(event)} fill sizes="430px" alt={eventImageLabel(event)} style={{ objectFit: eventImageFit(event) }} /><small>{eventImageLabel(event)}</small></div><button className={`${s.round} ${s.save}`} aria-label={saved.includes(event.id) ? 'Убрать событие из сохранённых' : 'Сохранить событие'} aria-pressed={saved.includes(event.id)} onClick={() => onSave(event.id)}><Bookmark size={20} fill={saved.includes(event.id) ? 'currentColor' : 'none'} /></button><div className={s.feedCardBody}><small><CalendarDays size={13} /> {eventDate(event.startsAt)}</small><h2>{event.name}</h2><p>{eventPrice(event)}</p><a href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a><button className={s.primary} onClick={() => onOpen(event)}>О событии <ExternalLink size={17} /></button></div></article>)}</div></div>}
    {feed?.freshness === 'stale' && <p className={s.staleNotice}>Источник сейчас недоступен: показана предыдущая загрузка. Проверь дату и условия перед посещением.</p>}
    {feed?.fetchedAt && <details className={s.feedDiagnostics}><summary>Актуальность подборки</summary><p>Проверено {eventDate(feed.fetchedAt)}. Обновляется по запросу, кэш до часа. Подборка не охватывает все события города.</p></details>}
  </section>;
}

export function EventDetail({ event, onSave, saved, onBack }: { event: LiveAstanaEvent; onSave: () => void; saved: boolean; onBack: () => void }) {
  const language = { ru: 'Русский', kk: 'Қазақша', en: 'English', und: 'Язык не указан' }[event.contentLanguage];
  const destination = event.lat !== null && event.lon !== null ? `${event.lat},${event.lon}` : null;
  const address = event.address && event.address !== event.venueName ? event.address : null;
  const price = event.priceFromKzt === null ? 'Уточняется' : event.priceFromKzt === 0 ? 'Бесплатно' : `${event.price.kind === 'from' ? 'от ' : ''}${event.priceFromKzt.toLocaleString('ru-RU')} ₸`;
  return <main className={s.detailScreen}>
    <div className={`${s.picture} ${s.detailHero}`}><Image src={eventImage(event)} fill sizes="430px" alt={eventImageLabel(event)} style={{ objectFit: eventImageFit(event) }} /><div className={s.photoShade} /><button className={`${s.round} ${s.heroBack}`} aria-label="Назад" onClick={onBack}><ArrowLeft size={21} /></button><button className={`${s.round} ${s.save}`} aria-label={saved ? 'Событие сохранено' : 'Сохранить событие'} aria-pressed={saved} onClick={onSave}><Bookmark size={21} fill={saved ? 'currentColor' : 'none'} /></button><div className={s.heroTitle}><small>{eventImageLabel(event)}</small><h1>{event.name}</h1></div></div>
    <section className={s.detailBody}><div className={s.factPills}><div><small>Когда</small><b>{eventDate(event.startsAt)}</b></div><div><small>Язык</small><b>{language}</b></div><div><small>Вход</small><b>{price}</b></div></div><div className={s.venue}><MapPin size={19} /><div><b>{event.venueName ?? 'Площадка уточняется'}</b>{address && <p>{address}</p>}</div></div>
      <div className={s.eventDescription}><p>{event.category ? `${event.category.charAt(0).toUpperCase()}${event.category.slice(1)} в Астане. ` : ''}Наличие мест и условия записи уточняй у организатора.{event.priceFromKzt !== null && event.priceFromKzt > 0 ? ' Стоимость зависит от выбранного билета.' : ''}</p><p>{event.endsAt ? `Окончание: ${eventDate(event.endsAt)}.` : 'Продолжительность и время окончания не указаны.'}</p>{!destination && <p>Координаты не предоставлены источником. Точку на карте и время пути не подставляем наугад.</p>}</div>
      <a className={s.primary} href={event.bookingUrl ?? event.contactUrl} target="_blank" rel="noreferrer">Подробности и запись <ExternalLink size={17} /></a>{destination && <a className={s.secondary} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`}>Построить внешний маршрут</a>}<a className={s.compactCredit} href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a>
    </section>
  </main>;
}
