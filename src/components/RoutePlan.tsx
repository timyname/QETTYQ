'use client';

import { Localize, useI18n, formatDate, formatNumber, translateText } from '../client/i18n';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Map, ArrowUpRight, ArrowUp, ArrowDown, CalendarDays, Clock3, MapPin, Navigation, Share2, Trash2, Footprints, X, Route, GripVertical } from 'lucide-react';
import { buildRouteTimeline, astanaDateInput, parseAstanaDateInput } from '@/client/route-timeline';
import { twoGisWalkingPlanUrl } from '@/client/2gis-navigation';
import { reorderRouteStops } from '@/client/reorder-route-stops';
import { formatDurationMinutes } from '@/client/format-duration';
import s from './RoutePlan.module.css';
import type { RoutingStatus, StreetRoute } from '../server/pilot/street-routing';

const MapCanvas = dynamic(() => import('./MapCanvas').then(m => m.MapCanvas), { ssr: false, loading: () => <p>Загружаем карту…</p> });
type Point = { lat: number; lon: number };
export type RouteStop = Point & { id: string; name: string; address: string | null; category: string; durationMinutes: number | null; durationState?: 'estimated' | 'observed' | 'unknown'; eventStartsAt?: string; eventEndsAt?: string; price: { min: number; max: number } | null };
export type RoutePlanData = {
  id: string; createdAt?: string; stops: RouteStop[]; totalMinutes: number | null; travelMinutes: number | null;
  visitMinutes: number | null; remainingMinutes: number | null; distanceKm: number | null; budget: { min: number | null; max: number | null };
  feasibility: string; constraintViolations?: { time: boolean; budget: boolean }; legs?: Array<{ estimatedMinutes: number; distanceKm: number }>;
};
type Props = {
  plan: RoutePlanData; origin: Point | null; destination?: Point | null; busy: boolean;
  onBack: () => void; onOpenStop: (id: string) => void; onChangeStart: () => void; onLocate: () => void; onEditConditions: () => void;
  onRemove: (id: string) => void; onShare: (departure: string, displayedTotalMinutes: number | null) => void;
  onReorder?: (ids: string[]) => void; onStartNavigation?: () => void; startExpanded?: boolean;
  initialDeparture?: string | null; onDepartureChange: (departure: string) => void;
};
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

export function RoutePlan({ plan, origin, destination, busy, onBack, onOpenStop, onChangeStart, onLocate, onEditConditions, onRemove, onShare, onReorder, onStartNavigation, startExpanded = false, initialDeparture, onDepartureChange }: Props) {
  const { language } = useI18n();
  const time = (iso: string) => formatDate(iso, language, { hour: '2-digit', minute: '2-digit' });
  const dateLabel = (iso: string) => formatDate(iso, language, { day: 'numeric', month: 'long' });
  const [departure, setDeparture] = useState(() => initialDeparture ?? new Date().toISOString());
  function changeDeparture(value: string) { setDeparture(value); onDepartureChange(value); setDateError(''); }
  const [dateError, setDateError] = useState('');
  const [active, setActive] = useState(plan.stops[0]?.id);
  const [expanded, setExpanded] = useState(startExpanded);
  const [dragged, setDragged] = useState<number | null>(null);
  const drag = useRef<{ timer: ReturnType<typeof setTimeout>; from: number; to: number; ready: boolean } | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const [routingStatus, setRoutingStatus] = useState<RoutingStatus | null>(null);
  const [routingStatusLoaded, setRoutingStatusLoaded] = useState(false);
  const [consentFor, setConsentFor] = useState<string | null>(null);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [routingError, setRoutingError] = useState('');
  const [calculated, setCalculated] = useState<{ key: string; route: StreetRoute } | null>(null);
  const routingRequest = useRef<AbortController | null>(null);
  const autoAttempted = useRef(new Set<string>());
  const routingPoints = [...(origin ? [origin] : []), ...plan.stops.map(p => ({ lat: p.lat, lon: p.lon })), ...(destination ? [destination] : [])];
  const routingKey = JSON.stringify(routingPoints);
  const street = calculated?.key === routingKey ? calculated.route : null;
  const consent = consentFor !== 'denied';
  function moveStop(from: number, to: number) {
    if (busy || !onReorder || from === to) return;
    onReorder(reorderRouteStops(plan.stops.map(p => p.id), from, to));
  }
  function cancelDrag() {
    if (drag.current) clearTimeout(drag.current.timer);
    drag.current = null; setDragged(null);
  }
  useEffect(() => () => { if (drag.current) clearTimeout(drag.current.timer); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/routing', { signal: controller.signal, cache: 'no-store' }).then(async r => r.ok ? await r.json() as unknown : null).then(value => { if (isRoutingStatus(value) && !controller.signal.aborted) setRoutingStatus(value); }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setRoutingStatusLoaded(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => () => { routingRequest.current?.abort(); }, [routingKey, consent]);
  const calculateStreets = useCallback(async (automatic = false) => {
    if (!consent || !origin || !routingStatus?.available || routingBusy || busy || street || routingRequest.current && !routingRequest.current.signal.aborted) return;
    const attemptKey = `${routingStatus.provider}:${routingKey}`;
    if (automatic && autoAttempted.current.has(attemptKey)) return;
    autoAttempted.current.add(attemptKey);
    const controller = new AbortController(); routingRequest.current?.abort(); routingRequest.current = controller;
    setRoutingBusy(true); setRoutingError('');
    try {
      const requestPoints = JSON.parse(routingKey) as Point[];
      const payload = JSON.stringify({ points: requestPoints, provider: routingStatus.provider, consent: true });
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
      if (!response.ok || !record(body) || !isStreetRoute(body.route, requestPoints.length, routingStatus.provider)) throw new Error(record(body) && typeof body.error === 'string' ? body.error : 'ROUTING_UNAVAILABLE');
      if (!controller.signal.aborted) setCalculated({ key: routingKey, route: body.route });
    } catch (error) {
      if (!controller.signal.aborted) { setCalculated(null); setRoutingError(String(error).includes('RATE_LIMITED') ? 'Слишком много запросов. Подожди немного и попробуй снова.' : 'Путь по улицам сейчас недоступен. Ниже остаётся оценка по прямой и внешняя навигация.'); }
    } finally { if (routingRequest.current === controller) { routingRequest.current = null; setRoutingBusy(false); } }
  }, [busy, consent, origin, routingBusy, routingKey, routingStatus, street]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void calculateStreets(true); });
    return () => { cancelled = true; };
  }, [calculateStreets]);
  const timelineLegs = street ? street.legs.map(p => ({ estimatedMinutes: p.durationSeconds / 60 })) : plan.legs;
  const timeline = buildRouteTimeline(departure, Boolean(origin), plan.stops, timelineLegs);
  const arrivals = timeline.stops.map(stop => stop.arrival);
  const bufferMinutes = plan.totalMinutes !== null && plan.travelMinutes !== null && plan.visitMinutes !== null ? Math.max(0, plan.totalMinutes - plan.travelMinutes - plan.visitMinutes) : 0;
  const baseTotalMinutes = street ? plan.visitMinutes === null ? null : Math.ceil(street.durationSeconds / 60) + plan.visitMinutes + bufferMinutes : plan.totalMinutes;
  const totalMinutes = baseTotalMinutes === null || timeline.waitMinutes === null ? null : baseTotalMinutes + Math.ceil(timeline.waitMinutes);
  const remainingMinutes = plan.totalMinutes !== null && plan.remainingMinutes !== null && totalMinutes !== null ? plan.totalMinutes + plan.remainingMinutes - totalMinutes : null;
  const exceedsConstraints = Boolean(plan.constraintViolations?.budget || remainingMinutes !== null && remainingMinutes < 0 || !plan.constraintViolations && plan.feasibility === 'infeasible');
  const navigation = twoGisWalkingPlanUrl(plan.stops, origin, destination);
  const duration = (minutes: number) => formatDurationMinutes(minutes, language)!;
  const points = plan.stops.map((p, index) => ({ ...p, title: p.name, dateLabel: translateText(`${index + 1} · ${p.durationMinutes === null ? 'Длительность уточняется' : `${duration(p.durationMinutes)}${p.durationState === 'observed' ? '' : ' — оценка посещения'}`}`, language) }));

  return <Localize><main className={s.screen} aria-label="Маршрут по Астане">
    <div className={s.map} data-panel-expanded={expanded}><MapCanvas fitPoints points={points} origin={origin} routeGeometry={street?.geometry} routeAttribution={street?.attribution} activeId={active} onSelect={id => { setActive(id); setExpanded(true); }} /></div>
    {!expanded && <button className={s.mapBubble} aria-label="На карту" title="Все места и события на карте" onClick={onBack}><Map size={22} /></button>}
    {!expanded && <button className={s.planBubble} aria-label="Развернуть план маршрута" aria-expanded={false} aria-controls="route-plan-sheet" onClick={() => setExpanded(true)}><Route size={23} /><span>{plan.stops.length}</span></button>}
    <section id="route-plan-sheet" ref={sheet} className={s.sheet} data-expanded={expanded} hidden={!expanded} aria-label="План маршрута">
      <div className={s.summary}>
        <div className={s.heading}><div><small>Мой план · {dateLabel(departure)}</small><h2 aria-live="polite">{busy ? 'Обновляем маршрут…' : totalMinutes === null ? origin ? 'Время нужно уточнить' : 'Нужна точка старта' : `${translateText('Примерно', language)} ${duration(totalMinutes)}`}</h2></div><button className={s.icon} aria-label="Свернуть план маршрута" onClick={() => { if (sheet.current) sheet.current.scrollTop = 0; setExpanded(false); }}><X size={20} /></button></div>
        <div className={s.summaryFacts}><span><Footprints size={14} />Пешком</span><span>Остановки: {formatNumber(plan.stops.length, language)}</span><span>{street ? `${formatNumber(street.distanceMeters / 1000, language, 1)} км по улицам` : plan.distanceKm === null ? 'Расстояние неизвестно' : `≈${formatNumber(plan.distanceKm, language, 1)} км по прямой`}</span></div>
        <p className={s.summaryNote}>{!origin ? 'Выбери старт для оценки дороги.' : street ? 'Время — оценка, посещения не подтверждены.' : 'Оценка по прямой, не путь по улицам.'}{plan.budget.min === null ? ' Стоимость уточняется.' : ''}</p>
        {exceedsConstraints && <p className={s.compactWarning} role="status">План превышает выбранные ограничения.</p>}
        {timeline.lateStopIndices.length > 0 && <p className={s.compactWarning} role="status">По расчёту прибудешь после начала события. Измени время старта или порядок остановок.</p>}
      </div>
      <div id="route-details" className={s.scroll} hidden={!expanded}>
        <ol className={s.timeline}>
          <li className={s.start}><span className={s.dot}>A</span><div><b>{origin ? 'Точка старта' : 'Откуда начнём?'}</b><small>{origin ? `${time(departure)} · начало` : 'Выбери старт для оценки дороги'}</small></div><button className={s.icon} disabled={busy} aria-label={origin ? 'Изменить точку старта' : 'Выбрать точку старта'} onClick={onChangeStart}><MapPin size={16} /></button></li>
          {plan.stops.map((stop, index) => <li key={stop.id} data-stop-index={index} data-active={active === stop.id} data-dragged={dragged === index}>
            <span className={s.dot}>{String.fromCharCode(66 + index)}</span>
            <div className={s.stop}>
              <small className={s.leg} data-route-leg={index}><Footprints size={12} />{origin ? `${String.fromCharCode(65 + index)} → ${String.fromCharCode(66 + index)} · ${street?.legs[index] ? `≈${duration(street.legs[index].durationSeconds / 60)} ${translateText('по улицам', language)}` : plan.legs?.[index] ? `≈${duration(plan.legs[index].estimatedMinutes)} ${translateText('по прямой', language)}` : translateText('Дорога пока не рассчитана', language)}` : translateText('Выбери старт для оценки дороги.', language)}</small>
              <button className={s.stopTitle} onClick={() => { setActive(stop.id); onOpenStop(stop.id); }}><span translate="no">{stop.name}</span><ArrowUpRight size={15} /></button>
              <small>{arrivals[index] ? `≈${time(arrivals[index]!)} · ` : ''}{stop.durationMinutes === null ? 'Длительность уточняется' : `${translateText('посещение', language)} ${stop.durationState === 'observed' ? '' : '≈'}${duration(stop.durationMinutes)}`}</small>
              {timeline.stops[index]?.waitMinutes !== null && timeline.stops[index]?.waitMinutes > 0 && <small>{translateText('До начала:', language)} ≈{duration(timeline.stops[index].waitMinutes!)}</small>}
              {timeline.stops[index]?.lateMinutes !== null && timeline.stops[index]?.lateMinutes > 0 && <small>{translateText('Опоздание по расчёту:', language)} ≈{duration(timeline.stops[index].lateMinutes!)}</small>}
              {onReorder && plan.stops.length > 1 && <div className={s.reorderActions}><button disabled={busy || index === 0} aria-label={`Поднять ${stop.name} выше`} onClick={() => moveStop(index, index - 1)}><ArrowUp size={14} /></button><button disabled={busy || index === plan.stops.length - 1} aria-label={`Опустить ${stop.name} ниже`} onClick={() => moveStop(index, index + 1)}><ArrowDown size={14} /></button></div>}
            </div>
            {onReorder && plan.stops.length > 1 && <button className={s.dragHandle} disabled={busy} aria-label={`Удерживай и перемещай ${stop.name}`}
              onPointerDown={e => { if (busy || e.button !== 0) return; cancelDrag(); e.currentTarget.setPointerCapture(e.pointerId); const state = { from: index, to: index, ready: false, timer: setTimeout(() => { state.ready = true; setDragged(index); }, 320) }; drag.current = state; }}
              onPointerMove={e => {
                const state = drag.current; if (!state?.ready) return;
                const scroll = sheet.current?.querySelector<HTMLElement>('#route-details');
                if (!scroll) return;
                const bounds = scroll.getBoundingClientRect();
                // The compact sheet may show only one stop. Dragging towards an
                // edge reveals the next stop instead of hitting the fixed footer.
                if (e.clientY > bounds.bottom - 24) scroll.scrollTop += 18;
                else if (e.clientY < bounds.top + 24) scroll.scrollTop -= 18;
                const hitY = Math.max(bounds.top + 2, Math.min(bounds.bottom - 2, e.clientY));
                const row = document.elementFromPoint(e.clientX, hitY)?.closest<HTMLElement>('[data-stop-index]');
                if (row && sheet.current?.contains(row)) { const next = Number(row.dataset.stopIndex); if (Number.isInteger(next)) state.to = next; }
              }}
              onPointerUp={() => { const state = drag.current; if (state?.ready) moveStop(state.from, state.to); cancelDrag(); }} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}><GripVertical size={16} /></button>}
            <button className={s.remove} disabled={busy || plan.stops.length === 1} aria-label={`Убрать ${stop.name} из плана`} onClick={() => onRemove(stop.id)}><Trash2 size={15} /></button>
          </li>)}
          {destination && <li><span className={s.dot}>{String.fromCharCode(66 + plan.stops.length)}</span><div><small className={s.leg}><Footprints size={12} />{String.fromCharCode(65 + plan.stops.length)} → {String.fromCharCode(66 + plan.stops.length)} · {street?.legs[plan.stops.length] ? `≈${duration(street.legs[plan.stops.length].durationSeconds / 60)} ${translateText('по улицам', language)}` : plan.legs?.[plan.stops.length] ? `≈${duration(plan.legs[plan.stops.length].estimatedMinutes)} ${translateText('по прямой', language)}` : 'Дорога пока не рассчитана'}</small><b>Конечная точка на карте</b><small>После выбранных остановок</small></div></li>}
        </ol>
        <details className={s.options}><summary>Время и параметры</summary>
        <div className={s.startActions}><button disabled={busy} onClick={onChangeStart}>{origin ? 'Изменить точку старта' : 'Выбрать точку старта'}</button><button disabled={busy} onClick={onLocate}><MapPin size={13} />Моё местоположение</button></div>
        <ol className={s.stopParameters}>{plan.stops.map((stop, index) => <li key={stop.id}><b translate="no">{stop.name}</b><small translate={stop.address ? 'no' : undefined}>{stop.address ?? 'Адрес уточняйте перед посещением'}</small><small>{street?.legs[index] ? `≈${duration(street.legs[index].durationSeconds / 60)} по улицам` : origin && plan.legs?.[index] ? `≈${duration(plan.legs[index].estimatedMinutes)} по прямой` : 'Дорога пока не рассчитана'}</small></li>)}</ol>
        <label className={s.departure}><CalendarDays size={19} /><span>Дата и время начала<input lang={language} aria-label="Дата и время начала маршрута" type="datetime-local" value={astanaDateInput(departure)} onChange={e => { const parsed = parseAstanaDateInput(e.target.value); if (parsed) changeDeparture(parsed); else setDateError('Выберите действительные дату и время.'); }} /></span><button type="button" onClick={() => changeDeparture(new Date().toISOString())}>Сейчас</button></label>
        {dateError && <p role="alert" className={s.warning}>{dateError}</p>}
        <p className={s.zone}>Время Астаны. Расписание мест на выбранную дату нужно уточнить.</p>
        <div className={s.facts}><span><Clock3 size={15} />{remainingMinutes === null ? 'Оставшееся свободное время неизвестно.' : `Останется ≈${remainingMinutes < 0 ? "−" : ""}${duration(Math.abs(remainingMinutes))}`}</span><span><MapPin size={15} />{street ? `${(street.distanceMeters / 1000).toLocaleString(language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-GB' : 'ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} км по улицам` : plan.distanceKm === null ? 'Расстояние пока не рассчитано.' : `≈${plan.distanceKm.toLocaleString(language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-GB' : 'ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} км по прямой`}</span><span>Бюджет: {plan.budget.min === null ? 'нужно уточнить стоимость' : `от ${formatNumber(plan.budget.min, language)} ₸`}</span>{plan.totalMinutes !== null && plan.travelMinutes !== null && <span><Clock3 size={15} />Запас времени {duration(bufferMinutes)}</span>}</div>
        <button className={s.editConditions} disabled={busy} onClick={onEditConditions}>Изменить условия</button>
        <button className={s.editConditions} disabled={busy} onClick={() => onShare(departure, totalMinutes)}><Share2 size={16} />Поделиться планом</button>
        {exceedsConstraints && <p className={s.warning}>Этот план превышает выбранные ограничения. Убери остановку или измени условия.</p>}
        {!street && <p className={s.note}>На карте — точки плана, не линия дороги. Время пешком оценено по прямой; точный путь уточнит навигация. Посещения — проектная оценка, не бронь.</p>}
        <section className={s.routing} aria-label="Расчёт пути по улицам">
          <b>Путь по улицам</b>
          {street ? <><p>Источник: {routingStatus?.label}. Время остаётся оценкой.</p><button onClick={() => setCalculated(null)}>Убрать дорожный расчёт</button></> : <>{routingStatus?.available ? <><label className={s.consent}><input type="checkbox" checked={consent} onChange={e => setConsentFor(e.target.checked ? null : 'denied')} />Дорожный расчёт выбранных точек</label><button disabled={!consent || !origin || routingBusy} onClick={() => void calculateStreets()}>{routingBusy ? 'Строим пеший путь…' : 'Рассчитать путь по улицам'}</button>{!origin && <small>Сначала выбери точку старта.</small>}</> : <p>Дорожный провайдер не подключён. Навигация откроется в 2ГИС.</p>}</>}
        </section>
        <p className={s.note}>Выбранные точки передаются провайдеру только при расчёте или открытии навигации. Поддержка промежуточных точек зависит от приложения 2ГИС: на iPhone проверь остановки после открытия.</p>
        </details>
      </div>
      <div className={s.actions}>
        {!origin ? <button className={s.begin} disabled={busy} onClick={onChangeStart}><MapPin size={19} />Выбрать точку старта</button>
          : street && navigation ? <a className={s.begin} href={navigation} onClick={onStartNavigation} target="_blank" rel="noreferrer"><Navigation size={19} />Начать маршрут<ArrowUpRight size={18} /></a>
          : <><button className={s.begin} disabled={busy || routingBusy || !routingStatus?.available || !consent} onClick={() => void calculateStreets()}><Route size={19} />{routingBusy ? 'Строим пеший путь…' : !routingStatusLoaded ? 'Проверяем дорожный расчёт…' : 'Проложить маршрут'}</button>
            {routingError && <p className={s.actionError} role="status">{routingError}</p>}
            {routingStatusLoaded && !routingStatus?.available && <p className={s.actionError} role="status">Дорожный расчёт сейчас недоступен. Можно построить путь в 2ГИС.</p>}
            {navigation && (routingError || routingStatusLoaded && !routingStatus?.available) && <a className={s.fallbackNavigation} href={navigation} onClick={onStartNavigation} target="_blank" rel="noreferrer">Открыть в 2ГИС без расчёта<ArrowUpRight size={14} /></a>}
            {!consent && <p className={s.actionError}>Включи дорожный расчёт в параметрах плана.</p>}
          </>}
      </div>
    </section>
  </main></Localize>;
}
