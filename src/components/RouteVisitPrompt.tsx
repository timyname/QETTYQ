'use client';
import { useEffect, useRef, useState } from 'react';
import { Localize } from '../client/i18n';
import { nearbyRouteStop } from '../client/route-visit';
import s from './RouteVisitPrompt.module.css';
type Stop = { id: string; name: string; lat: number; lon: number; eventStartsAt?: string };
const preferenceKey = 'qettyq.route-return-prompts.v1';

/** Foreground-only, explicit opt-in. No background watch, location storage, or automatic visit write. */
export function useRouteVisitPrompt(allowed: boolean, stops: Stop[], confirm: (stop: Stop) => Promise<void>) {
  const [enabled, setEnabled] = useState(false);
  const [candidate, setCandidate] = useState<Stop | null>(null);
  const [saving, setSaving] = useState(false);
  const started = useRef<number | null>(null);
  useEffect(() => { queueMicrotask(() => { try { setEnabled(localStorage.getItem(preferenceKey) === 'true'); } catch { /* off */ } }); }, []);
  const toggle = (value: boolean) => { setEnabled(value); setCandidate(null); try { localStorage.setItem(preferenceKey, String(value)); } catch { /* session only */ } };
  useEffect(() => {
    if (!allowed || !enabled) { started.current = null; return; }
    let disposed = false, checking = false;
    const check = async () => {
      if (document.visibilityState !== 'visible' || checking || started.current === null || Date.now() - started.current < 60_000) return;
      started.current = null; checking = true;
      try {
        // Returning must not open an unexpected browser permission prompt.
        if (!navigator.permissions || (await navigator.permissions.query({ name: 'geolocation' })).state !== 'granted' || disposed) return;
        navigator.geolocation.getCurrentPosition(position => {
          if (!disposed) setCandidate(nearbyRouteStop(stops, { lat: position.coords.latitude, lon: position.coords.longitude }, position.coords.accuracy));
        }, () => {}, { timeout: 5000, maximumAge: 0, enableHighAccuracy: false });
      } catch { /* No background tracking or retry on denied/unsupported APIs. */ }
      finally { checking = false; }
    };
    document.addEventListener('visibilitychange', check);
    return () => { disposed = true; document.removeEventListener('visibilitychange', check); };
  }, [allowed, enabled, stops]);
  return { enabled, toggle, candidate: allowed && enabled ? candidate : null, saving,
    start: () => { if (allowed && enabled) started.current = Date.now(); },
    dismiss: () => setCandidate(null),
    confirm: async () => { if (!candidate || !allowed || !enabled) return; setSaving(true); try { await confirm(candidate); setCandidate(null); } catch { /* Caller displays a safe error; retain the confirmation for retry. */ } finally { setSaving(false); } },
  };
}
export function RouteVisitSettings({ state, allowed }: { state: ReturnType<typeof useRouteVisitPrompt>; allowed: boolean }) {
  return <Localize><section><h2>После маршрута</h2><label><input type="checkbox" checked={state.enabled} disabled={!allowed} onChange={event => state.toggle(event.target.checked)} />Предлагать подтвердить посещение</label><p>Необязательно. Включи память посещений и доступ к геолокации. При возвращении проверим близость к одной остановке, только с уже выданным доступом. В фоне не отслеживаем; посещение сохраняется лишь после твоего подтверждения.</p></section></Localize>;
}
export function RouteVisitPrompt({ state }: { state: ReturnType<typeof useRouteVisitPrompt> }) {
  return state.candidate ? <Localize><section className={s.prompt} role="dialog" aria-label="Подтверждение посещения"><h2>Ты здесь был?</h2><p translate="no">{state.candidate.name}</p><p>Близость к месту не подтверждает посещение.</p><button disabled={state.saving} onClick={() => void state.confirm()}>Да, был здесь</button><button disabled={state.saving} onClick={state.dismiss}>Не сохранять</button></section></Localize> : null;
}
