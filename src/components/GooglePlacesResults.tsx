'use client';

import { Localize } from '../client/i18n';
import { ExternalLink } from 'lucide-react';
import s from './PilotApp.module.css';

export type GooglePlacesFeed = { status: 'live' | 'unavailable' | 'consent_required'; reason: string | null; items: Array<{ id: string; name: string; address: string; googleMapsUrl: string; openingHoursText: string[]; cuisineOrDishConfirmed: false; thirdPartyAttributions?: Array<{ name: string; url: string | null }> }>; attribution: { text: 'Google Maps'; url: 'https://maps.google.com' } };
function safeLink(value: string) { try { const url = new URL(value); return url.protocol === 'https:' && ['www.google.com', 'maps.google.com', 'maps.app.goo.gl'].includes(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; } }
function safeAttributionLink(value: string | null) { try { if (!value) return null; const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } }
export function GooglePlacesResults({ feed }: { feed: GooglePlacesFeed | null }) {
  if (!feed) return null;
  return <Localize><section className={s.googleResults} aria-label="Результаты Google Maps"><h2>Заведения · Google Maps</h2>{feed.status === 'live' && <p>Цена и время пути не проверены. Это результаты поиска, а не подтверждённый план.</p>}{feed.status === 'live' ? <>{feed.items.map(item => {
    const url = safeLink(item.googleMapsUrl);
    return <article key={item.id} className={s.panel}><h3 translate="no">{item.name}</h3><p translate="no">{item.address}</p>{item.openingHoursText.length ? <details><summary>Расписание из Google Maps</summary>{item.openingHoursText.map((text, index) => <p key={index} translate="no">{text}</p>)}</details> : <p>Часы работы уточняйте.</p>}<p>Наличие конкретного блюда не подтверждено.</p>{url && <a className={s.secondary} href={url} target="_blank" rel="noreferrer">Открыть в Google Maps<ExternalLink size={15} /></a>}<div className={s.googleCredits}><a className={s.compactCredit} href="https://maps.google.com" target="_blank" rel="noreferrer" translate="no">Google Maps</a>{(item.thirdPartyAttributions ?? []).map((entry, index) => { const href = safeAttributionLink(entry.url); return href ? <a className={s.compactCredit} key={index} href={href} target="_blank" rel="noreferrer" translate="no">{entry.name}</a> : <span className={s.compactCredit} key={index} translate="no">{entry.name}</span>; })}</div></article>;
  })}{!feed.items.length && <p>По этому запросу заведений не найдено.</p>}</> : <p>{feed.status === 'consent_required' ? 'Поиск Google требует отдельного согласия.' : 'Поиск Google сейчас недоступен. Можно продолжить по каталогу QETTYQ.'}</p>}<small>Эти результаты открываются в Google Maps и не добавляются на нашу OSM-карту.</small></section></Localize>;
}
