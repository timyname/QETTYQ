'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bus, CalendarDays, Car, Clock3, MapPin, Navigation, Share2, Trash2, Footprints } from 'lucide-react';
import { arrivalLabels, astanaDateInput, googleWalkingPlanUrl, parseAstanaDateInput } from '@/client/route-timeline';
import s from './RoutePlan.module.css';
import type { RoutingStatus, StreetRoute } from '../server/pilot/street-routing';

const MapCanvas = dynamic(() => import('./MapCanvas').then(m => m.MapCanvas), { ssr: false, loading: () => <p>Загружаем карту…</p> });
type Point = { lat: number; lon: number };
export type RouteStop = Point & { id: string; name: string; address: string | null; category: string; durationMinutes: number; price: { min: number; max: number } | null };
export type RoutePlanData = {
  id: string; createdAt?: string; stops: RouteStop[]; totalMinutes: number | null; travelMinutes: number | null;
  visitMinutes: number; remainingMinutes: number | null; distanceKm: number | null; budget: { min: number | null; max: number | null };
  feasibility: string; legs?: Array<{ estimatedMinutes: number; distanceKm: number }>;
};
type Props = {
  plan: RoutePlanData; origin: Point | null; destination?: Point | null; busy: boolean;
  onBack: () => void; onOpenStop: (id: string) => void; onChangeStart: () => void;
  onRemove: (id: string) => void; onShare: (departure: string) => void;
};
const time = (iso: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const dateLabel = (iso: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long' }).format(new Date(iso));
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const provider = (value: unknown) => value === 'fossgis_foot' || value === 'valhalla_demo' || value === 'openrouteservice';
const metric = (value: unknown, limit: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= limit;
function isRoutingStatus(value: unknown): value is RoutingStatus {
  return record(value) && typeof value.available === 'boolean' && provider(value.provider) && typeof value.label === 'string' && value.label.length <= 100 && (value.reason === null || typeof value.reason === 'string') && typeof value.localDemo === 'boolean';
}
function isStreetRoute(value: unknown, pointCount: number, expectedProvider: RoutingStatus['provider']): value is StreetRoute {
  if (!record(value) || value.quality !== 'street' || value.profile !== 'foot' || value.provider !== expectedProvider || typeof value.fetchedAt !== 'string' || !Number.isFinite(Date.parse(value.fetchedAt)) || !metric(value.distanceMeters, 200_000) || !metric(value.durationSeconds, 172_800)) return false;
  if (!record(value.geometry) || value.geometry.type !== 'LineString' || !Array.isArray(value.geometry.coordinates) || value.geometry.coordinates.length < 2 || value.geometry.coordinates.length > 20_000 || !value.geometry.coordinates.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && Number.isFinite(p[0]) && p[0] >= 70.9 && p[0] <= 72 && typeof p[1] === 'number' && Number.isFinite(p[1]) && p[1] >= 50.7 && p[1] <= 51.55)) return false;
  if (!Array.isArray(value.legs) || value.legs.length !== pointCount - 1 || !value.legs.every(p => record(p) && metric(p.distanceMeters, 200_000) && metric(p.durationSeconds, 172_800))) return false;
  if (!record(value.attribution) || typeof value.attribution.text !== 'string' || value.attribution.text.length > 512 || typeof value.attribution.url !== 'string' || !['https://routing.openstreetmap.de/about.html', 'https://valhalla.openstreetmap.de/', 'https://openrouteservice.org/'].includes(value.attribution.url)) return false;
  return Array.isArray(value.warnings) && value.warnings.every(w => typeof w === 'string');
}

export function RoutePlan({ plan, origin, destination, busy, onBack, onOpenStop, onChangeStart, onRemove, onShare }: Props) {
  const [departure, setDeparture] = useState(() => new Date().toISOString());
  const [dateError, setDateError] = useState('');
  const [active, setActive] = useState(plan.stops[0]?.id);
  const [expanded, setExpanded] = useState(false);
  const [routingStatus, setRoutingStatus] = useState<RoutingStatus | null>(null);
  const [consentFor, setConsentFor] = useState<string | null>(null);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [routingError, setRoutingError] = useState('');
  const [calculated, setCalculated] = useState<{ key: string; route: StreetRoute } | null>(null);
  const routingRequest = useRef<AbortController | null>(null);
  const routingPoints = [...(origin ? [origin] : []), ...plan.stops.map(p => ({ lat: p.lat, lon: p.lon })), ...(destination ? [destination] : [])];
  const routingKey = JSON.stringify(routingPoints);
  const street = calculated?.key === routingKey ? calculated.route : null;
  const consent = consentFor === routingKey;
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/routing', { signal: controller.signal, cache: 'no-store' }).then(async r => r.ok ? await r.json() as unknown : null).then(value => { if (isRoutingStatus(value) && !controller.signal.aborted) setRoutingStatus(value); }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => () => { routingRequest.current?.abort(); }, [routingKey]);
  async function calculateStreets() {
    if (!consent || !origin || !routingStatus?.available || routingBusy) return;
    const controller = new AbortController(); routingRequest.current?.abort(); routingRequest.current = controller;
    setRoutingBusy(true); setRoutingError('');
    try {
      const payload = JSON.stringify({ points: routingPoints, provider: routingStatus.provider, consent: true });
      const submit = () => fetch('/api/routing', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: payload, signal: controller.signal });
      let response = await submit();
      if (response.status === 401) {
        // An ephemeral worker session can expire. Auth rejects before provider traffic.
        // Renew once, retaining only this explicit provider/point consent, never retry a provider error.
        const session = await fetch('/api/session', { method: 'POST', credentials: 'same-origin', signal: controller.signal });
        if (!session.ok) throw new Error('ROUTING_SESSION_UNAVAILABLE');
        response = await submit();
      }
      const body: unknown = await response.json();
      if (!response.ok || !record(body) || !isStreetRoute(body.route, routingPoints.length, routingStatus.provider)) throw new Error(record(body) && typeof body.error === 'string' ? body.error : 'ROUTING_UNAVAILABLE');
      if (!controller.signal.aborted) setCalculated({ key: routingKey, route: body.route });
    } catch (error) {
      if (!controller.signal.aborted) { setCalculated(null); setRoutingError(String(error).includes('RATE_LIMITED') ? 'Слишком много запросов. Подожди немного и попробуй снова.' : 'Путь по улицам сейчас недоступен. Ниже остаётся оценка по прямой и внешняя навигация.'); }
    } finally { if (routingRequest.current === controller) setRoutingBusy(false); }
  }
  const timelineLegs = street ? street.legs.map(p => ({ estimatedMinutes: p.durationSeconds / 60 })) : plan.legs;
  const arrivals = arrivalLabels(departure, Boolean(origin), plan.stops.map(p => p.durationMinutes), timelineLegs);
  const bufferMinutes = plan.totalMinutes !== null && plan.travelMinutes !== null ? Math.max(0, plan.totalMinutes - plan.travelMinutes - plan.visitMinutes) : 0;
  const totalMinutes = street ? Math.ceil(street.durationSeconds / 60) + plan.visitMinutes + bufferMinutes : plan.totalMinutes;
  const remainingMinutes = street && plan.totalMinutes !== null && plan.remainingMinutes !== null ? plan.totalMinutes + plan.remainingMinutes - totalMinutes! : plan.remainingMinutes;
  const end = plan.stops.at(-1)!;
  const navigation = googleWalkingPlanUrl(plan.stops, origin, destination)!;
  const points = plan.stops.map((p, index) => ({ ...p, title: p.name, dateLabel: `${index === plan.stops.length - 1 ? 'B' : index + 1} · ${p.durationMinutes} мин — оценка посещения` }));

  return <main className={s.screen} aria-label="Маршрут по Астане">
    <div className={s.map}><MapCanvas fitPoints points={points} origin={origin} routeGeometry={street?.geometry} routeAttribution={street?.attribution} activeId={active} onSelect={id => { setActive(id); setExpanded(true); }} /></div>
    <div className={s.top}><button className={s.back} onClick={onBack}><ArrowLeft size={18} /> На карту</button><h1>Твой маршрут</h1></div>
    <section className={s.sheet} data-expanded={expanded} aria-label="План маршрута">
      <button className={s.handle} aria-label={expanded ? 'Свернуть план маршрута' : 'Развернуть план маршрута'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span /></button>
      <div className={s.scroll}>
        <div className={s.travelModes} role="group" aria-label="Способ передвижения"><button aria-pressed="true"><Footprints size={17} />Пешком</button><button disabled title="Автомобильный расчёт пока не подключён"><Car size={17} />Авто</button><button disabled title="Стоимость и время такси пока не подключены"><Car size={17} />Такси</button><button disabled title="Расписание транспорта пока не подключено"><Bus size={17} />Автобус</button></div><p className={s.modeNote}>Здесь рассчитываем только пеший путь. Другие способы пока недоступны.</p>
        <div className={s.heading}><div><small>Астана · {dateLabel(departure)}{street ? ' · путь по улицам' : ''}</small><h2>{totalMinutes === null ? 'Нужна точка старта' : `Примерно ${totalMinutes} мин`}</h2></div><button className={s.icon} aria-label="Поделиться планом" onClick={() => onShare(departure)}><Share2 size={19} /></button></div>
        <label className={s.departure}><CalendarDays size={19} /><span>Дата и время начала<input aria-label="Дата и время начала маршрута" type="datetime-local" value={astanaDateInput(departure)} onChange={e => { const parsed = parseAstanaDateInput(e.target.value); if (parsed) { setDeparture(parsed); setDateError(''); } else setDateError('Выберите действительные дату и время.'); }} /></span><button type="button" onClick={() => { setDeparture(new Date().toISOString()); setDateError(''); }}>Сейчас</button></label>
        {dateError && <p role="alert" className={s.warning}>{dateError}</p>}
        <p className={s.zone}>Время Астаны. Расписание мест на выбранную дату нужно уточнить.</p>
        <ol className={s.timeline}>
          <li className={s.start}><span className={s.dot}>A</span><div><b>{origin ? 'Точка старта на карте' : 'Откуда начнём?'}</b><small>{origin ? `${time(departure)} · начало` : 'Для оценки дороги выбери старт'}</small></div><button onClick={onChangeStart}>{origin ? 'Изменить' : 'Выбрать'}</button></li>
          {plan.stops.map((stop, index) => <li key={stop.id} data-active={active === stop.id}>
            <span className={s.dot}>{index === plan.stops.length - 1 && !destination ? 'B' : index + 1}</span>
            <div className={s.stop}>
              <small className={s.leg}><Footprints size={12} />{street?.legs[index] ? `≈${Math.ceil(street.legs[index].durationSeconds / 60)} мин · ${(street.legs[index].distanceMeters / 1000).toFixed(1)} км по улицам` : origin && plan.legs?.[index] ? `≈${plan.legs[index].estimatedMinutes} мин · ${plan.legs[index].distanceKm.toFixed(1)} км по прямой` : 'Дорога пока не рассчитана'}</small>
              <button className={s.stopTitle} onClick={() => { setActive(stop.id); onOpenStop(stop.id); }}>{stop.name}<ArrowUpRight size={15} /></button>
              <small>{arrivals[index] ? `≈${time(arrivals[index]!)} · ` : ''}посещение ≈{stop.durationMinutes} мин</small>
              <small>{stop.address ?? 'Адрес уточняйте перед посещением'}</small>
            </div>
            <button className={s.remove} disabled={busy || plan.stops.length === 1} aria-label={`Убрать ${stop.name} из плана`} onClick={() => onRemove(stop.id)}><Trash2 size={15} /></button>
          </li>)}
          {destination && <li><span className={s.dot}>B</span><div><b>Конечная точка на карте</b><small>После выбранных остановок</small></div></li>}
        </ol>
        <div className={s.facts}><span><Clock3 size={15} />{remainingMinutes === null ? 'Оставшееся свободное время неизвестно.' : `Останется ≈${remainingMinutes} мин`}</span><span><MapPin size={15} />{street ? `${(street.distanceMeters / 1000).toFixed(1)} км по улицам` : plan.distanceKm === null ? 'Расстояние пока не рассчитано.' : `≈${plan.distanceKm.toFixed(1)} км по прямой`}</span><span>Бюджет: {plan.budget.min === null ? 'нужно уточнить стоимость' : `от ${plan.budget.min.toLocaleString('ru-RU')} ₸`}</span></div>
        {(plan.feasibility === 'infeasible' || remainingMinutes !== null && remainingMinutes < 0) && <p className={s.warning}>Этот план превышает выбранные ограничения. Убери остановку или измени условия.</p>}
        {!street && <p className={s.note}>На карте — точки плана, не линия дороги. Время пешком оценено по прямой; точный путь уточнит навигация. Посещения — проектная оценка, не бронь.</p>}
        <section className={s.routing} aria-label="Расчёт пути по улицам">
          <b>Путь по улицам</b>
          {street ? <><p>Пеший маршрут рассчитан {routingStatus?.label}. Время остаётся оценкой, проходы могут измениться. Посещения не подтверждены. Линия и координаты хранятся только на этом экране.</p><button onClick={() => { setCalculated(null); setConsentFor(null); }}>Убрать дорожный расчёт</button></> : <><p>{routingStatus?.available ? `Для расчёта координаты старта и всех остановок получит ${routingStatus.label}. Провайдер может сохранять их в технических журналах. Никакой фоновой отправки.` : 'В этой сборке дорожный провайдер не подключён. Можно открыть внешнюю навигацию ниже.'}</p>{routingStatus?.available && <><label className={s.consent}><input type="checkbox" checked={consent} onChange={e => setConsentFor(e.target.checked ? routingKey : null)} />Разрешаю передать выбранные точки для этого расчёта</label><button disabled={!consent || !origin || routingBusy} onClick={() => void calculateStreets()}>{routingBusy ? 'Строим пеший путь…' : 'Рассчитать путь по улицам'}</button>{!origin && <small>Сначала выбери точку старта.</small>}</>}</>}
          {routingError && <p role="status">{routingError}</p>}
        </section>
        <div className={s.external}><a href={navigation} target="_blank" rel="noreferrer">Google Maps ↗</a><a href={`dgis://2gis.ru/routeSearch/rsType/pedestrian/to/${end.lon},${end.lat}`} target="_blank" rel="noreferrer">2ГИС ↗</a><a href={`https://2gis.kz/astana/search/${encodeURIComponent(end.name)}`} target="_blank" rel="noreferrer">2ГИС в браузере ↗</a><a href={`https://maps.apple.com/?daddr=${end.lat},${end.lon}&dirflg=w`} target="_blank" rel="noreferrer">Apple Maps ↗</a></div>
      </div>
      <div className={s.actions}><a className={s.begin} href={navigation} target="_blank" rel="noreferrer"><Navigation size={19} />Начать маршрут<ArrowUpRight size={18} /></a><small>{origin ? 'Откроется Google Maps с остановками. Выбранная точка старта передастся сервису.' : 'Откроется Google Maps с остановками. Точку старта выберешь там.'}</small></div>
    </section>
  </main>;
}
