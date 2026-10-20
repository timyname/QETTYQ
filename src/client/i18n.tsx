'use client';

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactNode, type ReactElement } from 'react';
import Image from 'next/image';
import { UI_TRANSLATIONS } from './i18n-dictionary';
import s from '../components/PilotApp.module.css';

export type Language = 'ru' | 'kk' | 'en';
export const LANGUAGE_KEY = 'qettyq.language.v1';
export const localeFor = (language: Language) => ({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' })[language];
export const validLanguage = (value: unknown): value is Language => value === 'ru' || value === 'kk' || value === 'en';
const I18n = createContext<{ language: Language; changeLanguage: (language: Language) => void; forgetLanguage: () => void }>({ language: 'ru', changeLanguage: () => undefined, forgetLanguage: () => undefined });
export const useI18n = () => useContext(I18n);
const patterns = Object.entries(UI_TRANSLATIONS).filter(([key]) => key.includes('{')).sort(([a], [b]) => b.replace(/\{\w+\}/g, '').length - a.replace(/\{\w+\}/g, '').length).map(([template, versions]) => {
  const slots: string[] = [];
  const source = template.split(/(\{\w+\})/g).map(piece => /^\{\w+\}$/.test(piece) ? (slots.push(piece), '(.+?)') : piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  return { match: new RegExp(`^${source}$`, 'u'), slots, versions };
});

export function translateText(text: string, language: Language): string {
  if (language === 'ru') return text;
  const normalized = text.trim().replace(/\s+/g, ' ');
  const value = UI_TRANSLATIONS[normalized]?.[language === 'kk' ? 0 : 1];
  if (value !== undefined) return `${/^\s/.test(text) ? ' ' : ''}${value}${/\s$/.test(text) ? ' ' : ''}`;
  for (const pattern of patterns) {
    const match = normalized.match(pattern.match);
    if (match) return pattern.slots.reduce((output, slot, index) => output.replaceAll(slot, () => match[index + 1]), pattern.versions[language === 'kk' ? 0 : 1]);
  }
  return text;
}

/** Declarative translation, before React render. Never mutates DOM or handlers.
 * Source titles, addresses and conversations must be marked translate="no". */
export function Localize({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  function visit(node: ReactNode): ReactNode {
    if (typeof node === 'string') return translateText(node, language);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<Record<string, unknown>>;
    if (element.props.translate === 'no' || element.props['data-no-translate']) return node;
    const patch: Record<string, unknown> = {};
    for (const key of ['aria-label', 'title', 'placeholder', 'alt']) if (typeof element.props[key] === 'string') patch[key] = translateText(element.props[key] as string, language);
    if ('children' in element.props) patch.children = Children.map(element.props.children as ReactNode, visit);
    return cloneElement(element, patch);
  }
  return <>{Children.map(children, visit)}</>;
}

export function LanguageProvider({ children, requireSelection = true }: { children: ReactNode; requireSelection?: boolean }) {
  const [language, setLanguage] = useState<Language>('ru');
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(LANGUAGE_KEY); } catch { /* session-only selection still works */ }
    queueMicrotask(() => { if (validLanguage(stored)) { setLanguage(stored); setSelected(true); } setChecked(true); });
  }, []);
  useEffect(() => { if (checked && selected) document.documentElement.lang = language; }, [language, checked, selected]);
  function changeLanguage(next: Language) { setLanguage(next); setSelected(true); try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* session-only */ } }
  function forgetLanguage() { setLanguage('ru'); setSelected(false); try { localStorage.removeItem(LANGUAGE_KEY); } catch { /* session-only */ } }
  return <I18n.Provider value={{ language, changeLanguage, forgetLanguage }}>{requireSelection && (!checked || !selected) ? <main className={s.languageScreen} aria-label="Language selection"><Image src="/assets/astana-welcome-v2.png" fill priority sizes="430px" alt="" /><div className={s.languageShade} />{checked && <section><h1>Қай тілде жалғастырамыз?</h1><div>{([['kk', 'Қазақша'], ['ru', 'Русский'], ['en', 'English']] as const).map(([code, label]) => <button key={code} lang={code} onClick={() => changeLanguage(code)}>{label}</button>)}</div></section>}</main> : children}</I18n.Provider>;
}

export const formatNumber = (value: number, language: Language, maximumFractionDigits = 0) => new Intl.NumberFormat(localeFor(language), { maximumFractionDigits }).format(value);
export const formatMoney = (value: number | null, language: Language) => value === null ? translateText('Уточните стоимость', language) : `${formatNumber(value, language)} ₸`;
const kkMonths = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
const kkShortMonths = ['қаң.', 'ақп.', 'нау.', 'сәу.', 'мам.', 'мау.', 'шіл.', 'там.', 'қыр.', 'қаз.', 'қар.', 'жел.'];
export function formatDate(value: string | Date, language: Language, options: Intl.DateTimeFormatOptions = {}) {
  const date = new Date(value);
  if (language !== 'kk') return new Intl.DateTimeFormat(localeFor(language), { timeZone: 'Asia/Almaty', hourCycle: 'h23', ...options }).format(date);
  // Some Chromium/ICU builds return literal M10 for Kazakh months. Keep the
  // Astana timezone from Intl, but use explicit Kazakh calendar labels/order.
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: options.timeZone ?? 'Asia/Almaty', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  const hasDate = Boolean(options.dateStyle || options.day || options.month || options.year);
  const hasTime = Boolean(options.timeStyle || options.hour || options.minute);
  const month = Number(get('month')) - 1;
  const monthLabel = options.month === 'short' || options.dateStyle === 'medium' ? kkShortMonths[month] : kkMonths[month];
  const calendar = hasDate ? `${get('day')} ${monthLabel}${options.year || options.dateStyle ? ` ${get('year')} ж.` : ''}` : '';
  const clock = hasTime ? `${get('hour')}:${get('minute')}` : '';
  return [calendar, clock].filter(Boolean).join(', ') || `${get('day')} ${kkMonths[month]} ${get('year')} ж.`;
}
export function countLabel(count: number, language: Language, kind: 'places' | 'interests') {
  const forms = { places: { ru: ['место', 'места', 'мест'], kk: ['орын', 'орын', 'орын'], en: ['place', 'places', 'places'] }, interests: { ru: ['интерес', 'интереса', 'интересов'], kk: ['қызығушылық', 'қызығушылық', 'қызығушылық'], en: ['interest', 'interests', 'interests'] } }[kind][language];
  const plural = new Intl.PluralRules(localeFor(language)).select(count);
  return `${formatNumber(count, language)} ${forms[plural === 'one' ? 0 : plural === 'few' ? 1 : 2]}`;
}
