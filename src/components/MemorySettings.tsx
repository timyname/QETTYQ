'use client';

import { useCallback, useEffect, useState } from 'react';
import { Localize, formatDate, useI18n } from '../client/i18n';
import type { MemoryScope as ServerScope, MemoryPreferences, MemoryState } from '../server/memory/contracts';
import s from './PilotApp.module.css';

export type MemoryScope = ServerScope;
export type MemoryProfile = MemoryPreferences;
export type ServerMemory = MemoryState;
type HTTP = <T>(url: string, body?: unknown, method?: string) => Promise<T>;

export function useServerMemory(http: HTTP, ready: boolean) {
  const [state, setState] = useState<ServerMemory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const value = await http<ServerMemory>('/api/memory', undefined, 'GET'); setState(value); setError(''); return value; }
    catch { setError('Серверная память недоступна. Память на устройстве продолжает работать.'); return null; }
  }, [http]);
  useEffect(() => { if (!ready) return; let cancelled = false; queueMicrotask(() => { if (!cancelled) void refresh(); }); return () => { cancelled = true; }; }, [ready, refresh]);
  async function grant(scope: MemoryScope, retention: 'session_24h' | 'persistent_30d', profile: MemoryProfile) {
    setBusy(true); setError('');
    try {
      // Sequential: the first response creates the opaque cookie used by later requests.
      await http('/api/memory/consents', { scope, retention });
      if (scope === 'profile') await http('/api/memory/profile', profile, 'PATCH');
      await refresh();
    } catch { setError('Не удалось изменить согласие. Повтори попытку.'); } finally { setBusy(false); }
  }
  async function revoke(scope: MemoryScope) {
    setBusy(true); setError('');
    try { await http('/api/memory/consents', { scope }, 'DELETE'); await refresh(); }
    catch { setError('Не удалось отозвать согласие. Повтори попытку.'); } finally { setBusy(false); }
  }
  async function saveProfile(profile: MemoryProfile) {
    if (!state?.consents.profile?.active) return;
    try { await http('/api/memory/profile', profile, 'PATCH'); }
    catch { setError('Не удалось обновить серверную память. Изменения остались на устройстве.'); }
  }
  return { state, busy, error, refresh, grant, revoke, saveProfile };
}

export function MemorySettings({ memory, profile, onDeleteAll }: { memory: ReturnType<typeof useServerMemory>; profile: MemoryProfile; onDeleteAll: () => void }) {
  const { language } = useI18n();
  const [retention, setRetention] = useState<'session_24h' | 'persistent_30d'>('session_24h');
  const scopes: Array<[MemoryScope, string, string]> = [
    ['profile', 'Предпочтения', 'Интересы, язык, время и бюджет. Без адреса и геопозиции.'],
    ['dialogue', 'Диалог', 'Последние 24 сообщения. Адресные данные скрываются; история не считается фактом о событиях.'],
    ['ai_transfer', 'Память для AI', 'Отдельное разрешение использовать сохранённый контекст в AI. Само по себе не включает AI.'],
    ['visits', 'Подтверждённые посещения', 'Только явно подтверждённые посещения. Автоматического отслеживания нет.'],
  ];
  return <Localize><section className={s.panel} aria-label="Серверная память"><h2>Серверная память</h2><p>Необязательно. Привязана к защищённому cookie этого браузера, не к аккаунту. На другом устройстве история сама не появится.</p><label>Срок хранения<select aria-label="Срок хранения серверной памяти" value={retention} onChange={e => setRetention(e.target.value as typeof retention)} disabled={memory.busy}><option value="session_24h">24 часа</option><option value="persistent_30d">30 дней</option></select></label>{scopes.map(([scope, label, note]) => {
    const consent = memory.state?.consents[scope];
    const active = Boolean(consent?.active);
    return <div key={scope} className={s.memoryScope}><div><b>{label}</b><p>{note}</p>{active && consent && <small>Действует до {formatDate(new Date(consent.expiresAt).toISOString(), language, { dateStyle: 'medium', timeStyle: 'short' })}</small>}</div><button className={s.memoryToggle} aria-label={label} aria-pressed={active} disabled={memory.busy || !memory.state?.available} onClick={() => active ? void memory.revoke(scope) : void memory.grant(scope, retention, profile)}><span /></button></div>;
  })}{memory.error && <p role="status">{memory.error}</p>}<button className={s.danger} onClick={onDeleteAll}>Удалить мои данные</button></section></Localize>;
}
