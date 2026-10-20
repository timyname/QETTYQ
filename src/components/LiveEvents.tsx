'use client';

import { Localize, useI18n, formatDate, formatNumber, type Language } from '../client/i18n';

import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, ExternalLink, MapPin, Plus, Route } from 'lucide-react';
import { useRef, useState } from 'react';
import { ProgressRail } from './ProgressRail';
import type { LiveAstanaEvent, EventMediaPlan } from '@/server/ingestion/sxodim-live';
import s from './PilotApp.module.css';
import art from './event-artwork.module.css';
import { twoGisWalkingPlanUrl } from '@/client/2gis-navigation';

export type LiveFeed = {
  items: LiveAstanaEvent[];
  dataMode: 'live' | 'snapshot' | 'unavailable';
  freshness: 'fresh' | 'stale' | 'unavailable';
  fetchedAt: string | null;
  expiresAt?: string | null;
  warnings?: string[];
};

export function eventDate(value: string, language: Language = 'ru') {
  const instant = new Date(value);
  return Number.isFinite(+instant) ? formatDate(instant, language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Дата не подтверждена';
}
export function eventPrice(event: LiveAstanaEvent, language: Language = 'ru') {
  if (event.priceFromKzt === null) return 'Стоимость уточняйте';
  if (event.priceFromKzt === 0) return 'Бесплатно · по данным афиши';
  return `${event.price.kind === 'from' ? 'от ' : ''}${formatNumber(event.priceFromKzt, language)} ₸ · условия уточняйте`;
}
export function eventImage(event: LiveAstanaEvent) {
  const media = (event as LiveAstanaEvent & { media?: EventMediaPlan }).media;
  return media?.kind === 'organizer_poster' && /^\/assets\/event-posters\/[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp|avif)$/i.test(media.src) && !media.src.includes('..') ? media.src : null;
}

function eventImageLabel(event: LiveAstanaEvent) {
  const media = (event as LiveAstanaEvent & { media?: EventMediaPlan }).media;
  return eventImage(event) && media?.kind === 'organizer_poster' ? `Афиша организатора${media.credit ? ` · ${media.credit}` : ''}` : 'Афиша пока не добавлена';
}

function EventArtwork({ event, mini = false }: { event: LiveAstanaEvent; mini?: boolean }) {
  const image = eventImage(event);
  const [failed, setFailed] = useState<string | null>(null);
  return image && failed !== image ? <Image className={art.poster} src={image} fill sizes={mini ? '64px' : '430px'} alt={eventImageLabel(event)} onError={() => setFailed(image)} /> : <div className={mini ? art.miniEmpty : art.empty} role="img" aria-label="Афиша пока не добавлена"><CalendarDays size={mini ? 24 : 32} strokeWidth={1.4} />{!mini && <span>{event.category ?? 'Событие'}<br />Афиша пока не добавлена</span>}</div>;
}

export function EventPreview({ event, onOpen }: { event: LiveAstanaEvent; onOpen: () => void }) {
  const { language } = useI18n();
  return <Localize><div><button className={s.mini} onClick={onOpen}><div className={s.miniImage}><EventArtwork event={event} mini /></div><span><b translate="no">{event.name}</b><small>{eventDate(event.startsAt, language)}</small><small>{eventPrice(event, language)}</small></span><ArrowUpRight size={16} /></button><a className={s.feedMeta} href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a></div></Localize>;
}

export function LiveEvents({ feed, loading, onOpen, saved, onSave }: { feed: LiveFeed | null; loading: boolean; onOpen: (event: LiveAstanaEvent) => void; saved: string[]; onSave: (id: string) => void }) {
  const { language } = useI18n();
  const [period, setPeriod] = useState('upcoming');
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
  const events = (feed?.items ?? []).filter(event => period !== 'today' || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date(event.startsAt)) === today);
  function selectPeriod(value: string) { setPeriod(value); setActive(0); rail.current?.scrollTo({ left: 0 }); }
  return <Localize><section className={s.liveSection} aria-label="Афиша Астаны"><div className={s.titleRow}><h2>Афиша Астаны</h2><span className={s.liveBadge}>{loading ? 'Обновляем' : feed?.freshness === 'fresh' ? 'Актуально' : feed?.freshness === 'stale' ? 'Предыдущая загрузка' : 'Нет связи'}</span></div><p className={s.feedMeta}>Все подключённые события. Даты и стоимость могут не совпадать с твоими условиями.</p><div className={s.chips}><button aria-pressed={period === 'upcoming'} onClick={() => selectPeriod('upcoming')}>Ближайшие даты</button><button aria-pressed={period === 'today'} onClick={() => selectPeriod('today')}>Сегодня</button></div>
    {loading && !feed && <p className={s.muted} role="status">Загружаем подтверждённые даты…</p>}
    {!loading && !events.length && <p className={s.muted}>{feed?.freshness === 'unavailable' || !feed ? 'Афиша временно недоступна. Места на карте остаются доступны.' : period === 'today' ? 'На сегодня подтверждённых событий в подключённой подборке нет. Посмотри ближайшие даты.' : 'В этой подборке пока нет будущих событий.'}</p>}
    {events.length > 0 && <div className={s.carousel}><ProgressRail count={events.length} active={Math.min(active, events.length - 1)} label="События" onSelect={index => rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: 'smooth' })} /><div ref={rail} className={`${s.rail} ${s.eventRail} ${art.rail}`} onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>{events.map(event => <article className={`${s.feedCard} ${art.card}`} key={event.id}><div className={`${s.picture} ${art.art}`} data-empty={!eventImage(event)}><EventArtwork event={event} />{eventImage(event) && <small>{eventImageLabel(event)}</small>}</div><button className={`${s.round} ${s.save}`} aria-label={saved.includes(event.id) ? 'Убрать событие из сохранённых' : 'Сохранить событие'} aria-pressed={saved.includes(event.id)} onClick={() => onSave(event.id)}><Bookmark size={20} fill={saved.includes(event.id) ? 'currentColor' : 'none'} /></button><div className={`${s.feedCardBody} ${art.body}`}><small><CalendarDays size={13} /> {eventDate(event.startsAt, language)}</small><h2 translate="no">{event.name}</h2><p>{eventPrice(event, language)}</p><a href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a><button className={s.primary} onClick={() => onOpen(event)}>О событии <ArrowUpRight size={17} /></button></div></article>)}</div></div>}
    {feed?.freshness === 'stale' && <p className={s.staleNotice}>Источник сейчас недоступен: показана предыдущая загрузка. Проверь дату и условия перед посещением.</p>}
    {feed?.fetchedAt && <details className={s.feedDiagnostics}><summary>Актуальность подборки</summary><p>Проверено {eventDate(feed.fetchedAt, language)}. Обновляется по запросу, кэш до часа. Подборка не охватывает все события города.</p></details>}
  </section></Localize>;
}

export function EventDetail({ event, onSave, saved, onBack, onAddToPlan, onBuildPlan }: { event: LiveAstanaEvent; onSave: () => void; saved: boolean; onBack: () => void; onAddToPlan?: () => void; onBuildPlan?: () => void }) {
  const { language } = useI18n();
  const spokenLanguage = { ru: 'Русский', kk: 'Қазақша', en: 'English', und: 'Язык не указан' }[event.contentLanguage];
  const destination = event.lat !== null && event.lon !== null ? twoGisWalkingPlanUrl([{ lat: event.lat, lon: event.lon }]) : null;
  const address = event.address && event.address !== event.venueName ? event.address : null;
  const price = event.priceFromKzt === null ? 'Уточняется' : event.priceFromKzt === 0 ? 'Бесплатно' : `${event.price.kind === 'from' ? 'от ' : ''}${formatNumber(event.priceFromKzt, language)} ₸`;
  return <Localize><main className={s.detailScreen}>
    <div className={`${s.picture} ${s.detailHero} ${art.detailArt}`} data-empty={!eventImage(event)}><EventArtwork event={event} />{eventImage(event) && <div className={s.photoShade} />}<button className={`${s.round} ${s.heroBack}`} aria-label="Назад" onClick={onBack}><ArrowLeft size={21} /></button><button className={`${s.round} ${s.save}`} aria-label={saved ? 'Событие сохранено' : 'Сохранить событие'} aria-pressed={saved} onClick={onSave}><Bookmark size={21} fill={saved ? 'currentColor' : 'none'} /></button><div className={`${s.heroTitle} ${art.title}`}><small>{eventImageLabel(event)}</small><h1 translate="no">{event.name}</h1></div></div>
    <section className={s.detailBody}><div className={s.factPills}><div><small>Когда</small><b>{eventDate(event.startsAt, language)}</b></div><div><small>Язык</small><b>{spokenLanguage}</b></div><div><small>Вход</small><b>{price}</b></div></div><div className={s.venue}><MapPin size={19} /><div><b translate={event.venueName ? 'no' : undefined}>{event.venueName ?? 'Площадка уточняется'}</b>{address && <p translate="no">{address}</p>}</div></div>
      <div className={s.eventDescription}><p>Наличие мест и условия записи уточняй у организатора.{event.priceFromKzt !== null && event.priceFromKzt > 0 ? ' Стоимость зависит от выбранного билета.' : ''}</p><p>{event.endsAt ? `Окончание: ${eventDate(event.endsAt, language)}.` : 'Продолжительность и время окончания не указаны.'}</p>{!destination && <p>Координаты не предоставлены источником. Точку на карте и время пути не подставляем наугад.</p>}{event.coordinateMatch && <p>Точка определена по адресу OpenStreetMap, не подтверждена организатором. Вход уточняйте. <a href={event.coordinateMatch.sourceUrl} target="_blank" rel="noreferrer" translate="no">© OpenStreetMap contributors · ODbL ↗</a></p>}</div>
      {event.priceEvidence && <a className={s.compactCredit} href={event.priceEvidence.sourceUrl} target="_blank" rel="noreferrer"><span>Источник цены</span> <ExternalLink size={13} /></a>}
      {destination && <><div className={s.twoButtons}>{onAddToPlan && <button className={s.secondary} onClick={onAddToPlan}><Plus size={17} />В мой план</button>}{onBuildPlan && <button className={s.primary} onClick={onBuildPlan}><Route size={17} />Оценить путь</button>}</div><a className={s.secondary} target="_blank" rel="noreferrer" href={destination}>Маршрут в 2ГИС <ExternalLink size={17} /></a></>}<a className={s.secondary} href={event.bookingUrl ?? event.contactUrl} target="_blank" rel="noreferrer">Подробности и запись <ExternalLink size={17} /></a><a className={s.compactCredit} href={event.requiredCredit.url} target="_blank" rel="noreferrer">Афиша: {event.requiredCredit.text} ↗</a>
    </section>
  </main></Localize>;
}
