'use client';
import { includePlanStop } from '../client/plan-selection';

import { Localize, LanguageProvider, useI18n, translateText, formatMoney, formatDate, countLabel } from '../client/i18n';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronRight, Clock3, Heart, MapPin, Plus, Search, Send, Settings, Sparkles, Undo2, UserRound, X, Route } from 'lucide-react';
import { appendLocalMessage, clearLocalMemory, createDefaultLocalMemory, loadLocalMemory, saveLocalMemory, type LocalMemory } from '@/client/local-memory';
import { reactionOpacity, swipeChoice, type SwipeChoice } from '@/client/swipe';
import type { PilotContext } from '@/server/pilot/contracts';
import { OrganizerFlow, type OrganizerDraft, type OrganizerScreen } from './screens/OrganizerFlow';
import { EventDetail, EventPreview, LiveEvents, type LiveFeed } from './LiveEvents';
import { BudgetControl } from './BudgetControl';
import { RoutePlan } from './RoutePlan';
import { RouteVisitPrompt, RouteVisitSettings, useRouteVisitPrompt } from './RouteVisitPrompt';
import { CitedMessage } from './CitedMessage';
import { ProgressRail } from './ProgressRail';
import { GlassDock } from './GlassDock';
import { boundedChatPayload } from './chat-payload';
import { categoryDisplayName } from './map-marker-icons';
import { MemorySettings, useServerMemory } from './MemorySettings';
import { GooglePlacesResults, type GooglePlacesFeed } from './GooglePlacesResults';
import type { LiveAstanaEvent } from '@/server/ingestion/sxodim-live';
import { CatalogPhoto, CatalogPhotoCredit } from './CatalogPhoto';
import type { PlaceMedia } from '../server/media/commons-place-media';
import s from './PilotApp.module.css';
import { useKeyboardViewport } from './use-keyboard-viewport';
import { mapSearchMatches, type MapSearchResult } from '../client/map-search-text';
import mapSearchCss from './MapSearch.module.css';

const CityMap = dynamic(() => import('./MapCanvas').then(module => module.MapCanvas), { ssr: false, loading: () => <p>Загружаем карту…</p> });
type Screen = 'welcome' | 'swipe' | 'conditions' | 'feed' | 'chat' | 'map' | 'detail' | 'event' | 'plan' | 'profile' | 'saved' | 'settings' | 'organizer';
type Point = { lat: number; lon: number };
type Card = { id: string; name: string; category: string; lat: number; lon: number; address: string | null; tags: string[]; price: { min: number; max: number } | null; durationMinutes: number | null; eventStartsAt?: string; reason?: string; distanceKm?: number | null; travelMinutes?: number | null; openingHours?: string | null; openingStatus?: 'open' | 'closed' | 'unknown'; sourceUrl?: string; retrievedAt?: string; media?: PlaceMedia };
type Plan = { id: string; stops: Card[]; totalMinutes: number | null; travelMinutes: number | null; visitMinutes: number | null; remainingMinutes: number | null; distanceKm: number | null; budget: { min: number | null; max: number | null }; warnings: string[]; feasibility: string; constraintViolations?: { time: boolean; budget: boolean }; legs?: Array<{ estimatedMinutes: number; distanceKm: number }> };
type AIStatus = { available: boolean; reason: string | null; localTestOnly?: boolean; remainingCalls?: number };
const PROVIDERS_KEY = 'qettyq.assistant-providers.v1';
const PROVIDER_NOTICE_KEY = 'qettyq.assistant-disclosure.v1';
const SCREEN_KEY = 'qettyq.screen.v1';
const SWIPE_CHOICES_KEY = 'qettyq.swipe-choices.v1';
const RESTORABLE_SCREENS = new Set<Screen>(['welcome', 'swipe', 'conditions', 'feed', 'chat', 'map', 'profile', 'saved', 'settings', 'organizer']);
function aiUnavailable(reason: string | null | undefined) {
  if (reason === 'PUBLIC_SESSION_COOLDOWN') return 'AI снова доступен через минуту. Поиск по каталогу работает сейчас.';
  if (reason === 'PUBLIC_SESSION_DAILY_LIMIT') return 'Дневной лимит AI исчерпан. Можно продолжить поиск по каталогу.';
  if (reason === 'PUBLIC_BUDGET_EXHAUSTED') return 'Общий лимит пилота исчерпан. Поиск по каталогу остаётся доступен.';
  if (reason === 'PUBLIC_AI_BUSY') return 'AI обрабатывает другой запрос. Попробуй немного позже.';
  return 'AI сейчас недоступен. Работает поиск по каталогу без внешней генерации.';
}
const INTERESTS = [
  ['Культура и история', '01-culture-history.jpg', ['culture', 'museum']],
  ['Живая музыка', '02-rock-live-music.jpg', ['rock', 'live_music']],
  ['Театр и балет', '03-ballet-theatre.jpg', ['theatre', 'ballet']],
  ['Танцы и новые знакомства', '04-bachata-social-dance.jpg', ['dance', 'bachata']],
  ['Музыка своими руками', '05-drums-hand-music.jpg', ['drums', 'workshop']],
  ['Спорт и характер', '06-armwrestling-strength.jpg', ['sport', 'armwrestling']],
  ['Активный отдых', '07-active-leisure.jpg', ['sport', 'active']],
  ['Баня и загородный отдых', '08-banya-country-retreat.jpg', ['sauna', 'country']],
  ['Шашлык с друзьями', '09-shashlik-friends.jpg', ['shashlik', 'friends']],
  ['Новый вкус', '10-fine-dining.jpg', ['restaurant', 'food']],
  ['Кофе и тихий вечер', '11-coffee-quiet-evening.jpg', ['cafe', 'coffee']],
  ['Современное искусство', '12-exhibition-contemporary-art.jpg', ['arts_centre', 'culture']],
  ['Кино на большом экране', '13-cinema.jpg', ['cinema']],
  ['Сделать что-то своими руками', '14-workshop-creativity.jpg', ['workshop']],
  ['Прогулки и архитектура', '15-walk-architecture.jpg', ['park', 'garden', 'viewpoint']],
] as const;
const INTEREST_DETAILS = ['Музеи, галереи и истории города.', 'Живые концерты, рок и небольшие сцены.', 'Спектакли, балет и вечер в театре.', 'Бачата, открытые уроки и танцевальные встречи.', 'Барабаны, джемы и первые музыкальные опыты.', 'Армрестлинг, силовые тренировки и состязания.', 'Скалодром, велопрогулки и движение на свежем воздухе.', 'Баня, тишина и поездка за город.', 'Шашлык, открытый огонь и встречи с друзьями.', 'Новая кухня, небольшие рестораны и гастрономические открытия.', 'Кофейни, книга и спокойный разговор.', 'Выставки, арт-пространства и новые имена.', 'Большой экран, премьеры и любимые жанры.', 'Керамика, рисование и творческие мастерские.', 'Набережная, городские маршруты и архитектура.'];
const initialContext: PilotContext = { cityId: 'astana', goal: 'new', minutes: 120, budget: 5000, origin: null, destination: null, returnToOrigin: false, likedTags: [], partySize: 1, budgetBasis: 'person', strictBudget: false };
const openingLabel = (card: Card) => card.openingStatus === 'open' ? 'По расписанию открыто' : card.openingStatus === 'closed' ? 'По расписанию закрыто' : 'Часы работы уточняйте.';
const credit = <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a>;
function illustration(card: Card) {
  const interest = card.tags.includes('cafe') ? INTERESTS[10] : card.tags.some(t => ['food', 'restaurant', 'fast_food'].includes(t)) ? INTERESTS[9] : card.tags.some(t => ['park', 'garden', 'viewpoint'].includes(t)) ? INTERESTS[14] : card.tags.includes('theatre') ? INTERESTS[2] : INTERESTS[0];
  return `/assets/ideas/${interest[1]}`;
}
async function api<T>(url: string, body?: unknown, method = 'POST'): Promise<T> {
  const options = { method, headers: body ? { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() } : undefined, body: body ? JSON.stringify(body) : undefined };
  let response = await fetch(url, options);
  // Ephemeral Worker sessions may expire between requests. The device retains preferences.
  if (response.status === 401 && url !== '/api/session') {
    const session = await fetch('/api/session', { method: 'POST' });
    if (session.ok) response = await fetch(url, options);
  }
  if (!response.ok) throw new Error(response.status === 429 ? 'Слишком много запросов. Попробуйте через минуту.' : 'Сервис не ответил. Попробуйте ещё раз.');
  return response.json();
}

function SwipeDeck({ onFinish, onBack, choices, setChoices }: { onFinish: (tags: string[]) => void; onBack: () => void; choices: SwipeChoice[]; setChoices: (choices: SwipeChoice[]) => void }) {
  const { language } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [committing, setCommitting] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-430, 0, 430], [-5, 0, 5]);
  const likeOpacity = useTransform(x, value => reactionOpacity(value, 1));
  const skipOpacity = useTransform(x, value => reactionOpacity(value, -1));
  const reduced = useReducedMotion();
  const width = useRef<HTMLDivElement>(null);
  const pointerCancelled = useRef(false);
  const commitLock = useRef(false);
  const interacted = useRef(false);
  const hintShown = useRef(false);
  const index = choices.length;
  const interest = INTERESTS[Math.min(index, 14)];
  useEffect(() => {
    const cancel = () => { pointerCancelled.current = true; x.stop(); x.set(0); };
    window.addEventListener('blur', cancel);
    if (reduced || index > 0 || hintShown.current) return () => window.removeEventListener('blur', cancel);
    let stopped = false;
    const timer = window.setTimeout(async () => {
      if (interacted.current || stopped) return;
      hintShown.current = true;
      for (const target of [64, 0, -64, 0]) {
        if (interacted.current || stopped) return;
        await animate(x, target, { duration: 0.36, ease: 'easeInOut' });
      }
    }, 3500);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('blur', cancel); };
  }, [index, reduced, x]);
  function finish(next: SwipeChoice[]) {
    const tags = [...new Set(next.flatMap((choice, i) => choice === 'like' ? [...INTERESTS[i][2]] : []))];
    onFinish(tags);
  }
  async function commit(choice: SwipeChoice) {
    if (commitLock.current || choices.length >= 15) return;
    commitLock.current = true;
    interacted.current = true;
    setCommitting(true);
    // A zero-duration off-screen animation can retain a compositor clip even
    // after resetting x. Reduced motion changes the card without that excursion.
    if (!reduced) await animate(x, choice === 'like' ? 550 : -550, { duration: 0.18 });
    const next = [...choices, choice];
    x.set(0);
    setChoices(next);
    setCommitting(false);
    commitLock.current = false;
    setExpanded(false);
    if (next.length === 15) finish(next);
  }
  return <Localize><section className={s.swipe} aria-label="Выбор интересов" ref={width} onPointerDownCapture={() => { if (!interacted.current) { x.stop(); x.set(0); } interacted.current = true; }}>
    {index < 14 && <div className={s.swipeNext} aria-hidden="true"><Image src={`/assets/ideas/${INTERESTS[index + 1][1]}`} fill sizes="430px" alt="" /></div>}
    <motion.div className={s.swipePhoto} style={{ x, rotate }} drag={committing || index >= 15 ? false : 'x'} dragMomentum={false} dragElastic={0.5}
      onPointerDown={() => { pointerCancelled.current = false; }}
      onPointerCancel={() => { pointerCancelled.current = true; x.stop(); x.set(0); }}
      onDragEnd={(_, info) => { const choice = pointerCancelled.current ? null : swipeChoice(info.offset.x, width.current?.clientWidth ?? 430); if (choice) void commit(choice); else void animate(x, 0, { duration: reduced ? 0 : 0.2 }); }}
      data-testid="swipe-card" tabIndex={0} role="group" aria-label={`${translateText(interest[0], language)}, ${Math.min(index + 1, 15)} из 15. Стрелка вправо — интересно, влево — не сейчас.`}
      onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); void commit(event.key === 'ArrowRight' ? 'like' : 'skip'); } }}>
      <Image src={`/assets/ideas/${interest[1]}`} fill priority sizes="430px" alt={interest[0]} draggable={false} />
      <div className={s.photoShade} />
      <motion.div className={`${s.reaction} ${s.reactionLike}`} style={{ opacity: likeOpacity }} aria-hidden="true"><Heart fill="currentColor" /><span>Интересно</span></motion.div>
      <motion.div className={`${s.reaction} ${s.reactionSkip}`} style={{ opacity: skipOpacity }} aria-hidden="true"><span>Не сейчас</span></motion.div>
      <div className={s.swipeTitle}><small>ВЫБЕРИ, ЧТО ТЕБЕ ПО ДУШЕ</small><h1>{interest[0]}</h1><p>{INTEREST_DETAILS[Math.min(index, 14)]}</p><small>Иллюстрация категории</small></div>
    </motion.div>
    <div className={s.swipeTop}><ProgressRail count={15} active={Math.min(index, 14)} label="Выбор интересов" /><button className={s.round} onClick={onBack} aria-label="Вернуться"><ArrowLeft /></button></div>
    <div className={s.swipeBottom}><button className={s.round} disabled={!choices.length || committing} aria-label="Отменить выбор" onClick={() => { x.set(0); setChoices(choices.slice(0, -1)); }}><Undo2 /></button>
      <span className={s.gestureHint}>← не сейчас · интересно →</span>
      <button className={`${s.round} ${expanded ? s.expanded : ''}`} aria-label={expanded ? 'К условиям подборки' : 'Пропустить подбор интересов'} onClick={() => expanded ? finish(choices) : setExpanded(true)}>{expanded && <span>К условиям подборки</span>}<ArrowRight /></button></div>
    <div className={s.accessibleActions}><button onClick={() => void commit('skip')}>Не сейчас</button><button onClick={() => void commit('like')}>Интересно</button></div>
  </section></Localize>;
}

export function PilotApp() { return <LanguageProvider><PilotAppContent /></LanguageProvider>; }

function PilotAppContent() {
  const { language, changeLanguage, forgetLanguage } = useI18n();
  const [initialLanguage] = useState(language);
  const money = (value: number | null) => formatMoney(value, language);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [ready, setReady] = useState(false);
  const serverMemory = useServerMemory(api, ready);
  const [memory, setMemory] = useState<LocalMemory>(createDefaultLocalMemory);
  const [context, setContext] = useState<PilotContext>(initialContext);
  const [catalog, setCatalog] = useState<Card[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [hasDiscovered, setHasDiscovered] = useState(false);
  const [swipeChoices, setSwipeChoices] = useState<SwipeChoice[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [liveFeed, setLiveFeed] = useState<LiveFeed | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<LiveAstanaEvent | null>(null);
  const [eventBack, setEventBack] = useState<Screen>('feed');
  const [saved, setSaved] = useState<string[]>([]);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planStartExpanded, setPlanStartExpanded] = useState(false);
  const [planDeparture, setPlanDeparture] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const visitPrompt = useRouteVisitPrompt(Boolean(serverMemory.state?.consents.visits?.active), plan?.stops ?? [], async stop => {
    try { await api('/api/memory/visits', { entityKind: stop.eventStartsAt ? 'event' : 'venue', entityId: stop.id, visitedAtMs: Date.now() }); await serverMemory.refresh(); }
    catch { setNotice('Не удалось сохранить посещение. Повтори попытку.'); throw new Error('VISIT_SAVE_FAILED'); }
  });
  const [text, setText] = useState('');
  const [chatCards, setChatCards] = useState<Card[]>([]);
  const [chatEvents, setChatEvents] = useState<LiveAstanaEvent[]>([]);
  const [proposed, setProposed] = useState<PilotContext | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [mapResults, setMapResults] = useState<MapSearchResult[]>([]);
  const [mapSearchBusy, setMapSearchBusy] = useState(false);
  const [mapSearchMessage, setMapSearchMessage] = useState('');
  const [mapFocus, setMapFocus] = useState<(Point & { revision: number }) | undefined>();
  const mapQueryRevision = useRef(0);
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const originReturn = useRef<Screen>('conditions');
  const [pickingVenue, setPickingVenue] = useState(false);
  const venueDraft = useRef<OrganizerDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [aiConsent, setAiConsent] = useState(true);
  const [googleConsent, setGoogleConsent] = useState(true);
  const [googlePlaces, setGooglePlaces] = useState<GooglePlacesFeed | null>(null);
  const [organizerScreen, setOrganizerScreen] = useState<OrganizerScreen>('eligibility');
  const [draft, setDraft] = useState<Partial<OrganizerDraft>>({});
  const [detailBack, setDetailBack] = useState<Screen>('feed');
  const [feedIndex, setFeedIndex] = useState(0);
  const { keyboardOpen, viewportStyle } = useKeyboardViewport(screen === 'chat' || screen === 'map');
  const rail = useRef<HTMLDivElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const chatFooter = useRef<HTMLDivElement>(null);
  const skipPersist = useRef(false);

  useEffect(() => {
    const restored = serverMemory.state;
    if (!restored?.enabled) return;
    queueMicrotask(() => {
      if (restored.consents.profile?.active && restored.profile) {
        const profile = restored.profile;
        setContext(prev => ({ ...prev, likedTags: profile.likedTags, ...(profile.goal ? { goal: profile.goal } : {}), ...(profile.minutes !== undefined ? { minutes: profile.minutes } : {}), ...(profile.budget !== undefined ? { budget: profile.budget } : {}) }));
        setMemory(prev => ({ ...prev, profile: { ...prev.profile, ...profile, budget: profile.budget ?? prev.profile.budget, ...(profile.budget !== undefined ? { budgetUnknown: profile.budget === null } : {}) } }));
      }
      if (restored.consents.dialogue?.active && restored.messages.length) setMemory(prev => ({ ...prev, dialogue: restored.messages.map(message => ({ id: message.id, role: message.role, text: message.text, mode: message.mode, createdAt: new Date(message.createdAtMs).toISOString() })) }));
    });
  }, [serverMemory.state]);

  useEffect(() => {
    if (screen !== 'chat' || !chatFooter.current) return;
    const footer = chatFooter.current, app = footer.closest<HTMLElement>('[data-screen]');
    const resize = () => app?.style.setProperty('--qettyq-chat-footer-height', `${footer.getBoundingClientRect().height}px`);
    resize(); const observer = new ResizeObserver(resize); observer.observe(footer);
    return () => observer.disconnect();
  }, [screen]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(PROVIDERS_KEY, JSON.stringify({ ai: aiConsent, google: googleConsent })); } catch { /* session-only preferences */ }
  }, [aiConsent, googleConsent, ready]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 2000); return () => clearTimeout(timer); }, [notice]);

  const loadEvents = useCallback(async () => {
    setLiveLoading(true);
    try { setLiveFeed(await api<LiveFeed>('/api/events', undefined, 'GET')); }
    catch { setLiveFeed({ items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null }); }
    finally { setLiveLoading(false); }
  }, []);
  useEffect(() => { let cancelled = false; void Promise.resolve().then(() => { if (!cancelled) void loadEvents(); }); return () => { cancelled = true; }; }, [loadEvents]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => { void api<AIStatus>('/api/assistant/status', undefined, 'GET').then(status => { if (!cancelled) setAiStatus(status); }).catch(() => { if (!cancelled) setAiStatus({ available: false, reason: 'UNAVAILABLE' }); }); };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let restoredContext = initialContext;
    let restoreFeed = false;
    // Read the browser-owned external store after hydration, not during SSR.
    void Promise.resolve().then(() => { if (cancelled) return; try {
      const providers = JSON.parse(localStorage.getItem(PROVIDERS_KEY) ?? 'null');
      if (providers && typeof providers === 'object') { setAiConsent(providers.ai !== false); setGoogleConsent(providers.google !== false); }
      const loaded = loadLocalMemory(localStorage);
      setMemory(loaded);
      const { goal, minutes, budget: knownBudget, likedTags, strictBudget, budgetUnknown } = loaded.profile;
      const budget = budgetUnknown ? null : knownBudget;
      restoredContext = { ...initialContext, goal, minutes, budget, likedTags, strictBudget: strictBudget ?? budget === 0 };
      setContext(restoredContext);
      const ids: unknown = JSON.parse(localStorage.getItem('qettyq.saved.v2') ?? '[]');
      if (Array.isArray(ids)) setSaved(ids.filter((id): id is string => typeof id === 'string').slice(0, 100));
      const rawDraft = JSON.parse(localStorage.getItem('qettyq.organizer.v2') ?? '{}');
      if (rawDraft && typeof rawDraft === 'object' && !Array.isArray(rawDraft)) setDraft(rawDraft);
      const storedChoices: unknown = JSON.parse(localStorage.getItem(SWIPE_CHOICES_KEY) ?? '[]');
      if (Array.isArray(storedChoices)) setSwipeChoices(storedChoices.filter((choice): choice is SwipeChoice => choice === 'like' || choice === 'skip').slice(0, 15));
      const storedScreen = localStorage.getItem(SCREEN_KEY) as Screen | null;
      const onboardingComplete = localStorage.getItem('qettyq.onboarding.v2') === 'complete';
      if (onboardingComplete) restoreFeed = true;
      if (storedScreen && RESTORABLE_SCREENS.has(storedScreen)) setScreen(storedScreen);
      else if (onboardingComplete) setScreen('feed');
    } catch { setNotice('Хранилище браузера недоступно. Изменения сохранятся только до закрытия страницы.'); } });
    Promise.all([api('/api/session'), api<{ items: Card[] }>('/api/catalog?cityId=astana', undefined, 'GET')]).then(async ([, result]) => {
      if (cancelled) return;
      setCatalog(result.items);
      if (restoreFeed) {
        const restored = await api<{ items: Card[] }>('/api/chat', { text: 'Подбери места по моим условиям', context: restoredContext, language: initialLanguage });
        if (cancelled) return;
        setCards(restored.items); setHasDiscovered(true);
      }
      setReady(true);
    }).catch(e => { if (!cancelled) { setError(e.message); setReady(true); } });
    return () => { cancelled = true; };
  }, [initialLanguage]);
  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) { skipPersist.current = false; return; }
    try {
      saveLocalMemory(localStorage, memory);
      localStorage.setItem('qettyq.saved.v2', JSON.stringify(saved));
      if (RESTORABLE_SCREENS.has(screen)) localStorage.setItem(SCREEN_KEY, screen);
      localStorage.setItem(SWIPE_CHOICES_KEY, JSON.stringify(swipeChoices));
    } catch { /* Memory still works during this visit. */ }
  }, [memory, saved, screen, swipeChoices, ready]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [memory.dialogue.length, busy]);
  const filtered = useMemo(() => catalog.filter(c => (filter === 'all' || c.tags.includes(filter)) && (!search.trim() || mapSearchMatches(`${c.name} ${c.address ?? ''}`, search))), [catalog, filter, search]);
  const shown = hasDiscovered ? cards : catalog.filter(c => c.tags.some(t => context.likedTags.includes(t))).slice(0, 3);
  const updateContext = (patch: Partial<PilotContext>) => {
    setContext(prev => ({ ...prev, ...patch }));
    const next = { ...context, ...patch };
    void serverMemory.saveProfile({ likedTags: next.likedTags, locale: language, goal: next.goal, minutes: next.minutes, budget: next.budget });
    setMemory(prev => ({ ...prev, profile: { ...prev.profile, ...(patch.goal ? { goal: patch.goal } : {}), ...(patch.minutes !== undefined ? { minutes: patch.minutes } : {}), ...(patch.budget !== undefined ? { budgetUnknown: patch.budget === null, ...(patch.budget !== null ? { budget: patch.budget } : {}) } : {}), ...(patch.strictBudget !== undefined ? { strictBudget: patch.strictBudget } : {}), ...(patch.likedTags ? { likedTags: patch.likedTags } : {}) } }));
  };
  function changeInterfaceLanguage(next: 'ru' | 'kk' | 'en') {
    changeLanguage(next); setMemory(prev => ({ ...prev, profile: { ...prev.profile, locale: next } }));
    void serverMemory.saveProfile({ likedTags: context.likedTags, locale: next, goal: context.goal, minutes: context.minutes, budget: context.budget });
  }
  const navigate = (next: Screen) => { if (next !== 'map') setPickingVenue(false); setScreen(next); setError(''); setNotice(''); };
  function openCard(card: Card, from: Screen) { setSelected(card); setDetailBack(from); navigate('detail'); }
  function toggleSave(id: string) { const removing = saved.includes(id); setSaved(prev => prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]); setNotice(removing ? 'Убрано из сохранённых' : 'Сохранено для будущих планов'); }
  async function discover() {
    setBusy(true); setError('');
    try {
      await api('/api/context', context);
      // Chat retrieval shares the deterministic eligibility/ranking code, without paid AI.
      const result = await api<{ items: Card[] }>('/api/chat', { text: 'Подбери места по моим условиям', context, language });
      setCards(result.items); setHasDiscovered(true); setFeedIndex(0); setScreen('feed');
      try { localStorage.setItem('qettyq.onboarding.v2', 'complete'); } catch { /* session-only */ }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function beginOriginSelection(from: Screen) { originReturn.current = from; setPickingOrigin(true); navigate('map'); }
  function locate() {
    if (!navigator.geolocation) { setNotice('Геолокация недоступна. Выберите старт на карте.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      if (point.lat < 50.8 || point.lat > 51.5 || point.lon < 70.8 || point.lon > 72) setNotice('Вы находитесь вне пилотной зоны Астаны. Выберите точку старта на карте.');
      else {
        updateContext({ origin: point }); setPickingOrigin(false); setNotice('Точка старта получена. Точная геопозиция не сохраняется в памяти браузера.');
        if (screen === 'plan' && plan) {
          void api<{ plan: Plan }>('/api/plans', { placeIds: plan.stops.map(stop => stop.id), context: { ...context, origin: point } }).then(result => setPlan(result.plan)).catch(e => setError((e as Error).message)).finally(() => setBusy(false));
          return;
        }
      }
      setBusy(false);
    }, () => { setBusy(false); setNotice('Доступ не получен. Можно выбрать старт на карте или продолжить без него.'); }, { timeout: 10000, maximumAge: 60000 });
  }
  const mapSelect = useCallback((id: string) => {
    const occurrence = liveFeed?.items.find(event => event.id === id);
    if (occurrence) { setSelectedEvent(occurrence); setEventBack('map'); setScreen('event'); return; }
    const card = catalog.find(c => c.id === id);
    if (!card) return;
    if (pickingVenue && venueDraft.current) {
      const value = { ...venueDraft.current, venueName: `${card.name}${card.address ? ` · ${card.address}` : ''}`, savedAt: new Date().toISOString() };
      setDraft(value);
      try { localStorage.setItem('qettyq.organizer.v2', JSON.stringify(value)); } catch { /* session-only draft */ }
      setPickingVenue(false); setOrganizerScreen('schedule'); setScreen('organizer');
      setNotice('Площадка выбрана. Это не подтверждает согласие организатора площадки.');
    } else setSelected(card);
  }, [catalog, pickingVenue, liveFeed]);
  const pickPoint = useCallback((point: Point) => {
    if (!pickingOrigin) return;
    if (point.lat < 50.8 || point.lat > 51.5 || point.lon < 70.8 || point.lon > 72) { setNotice('Выберите точку в пилотной зоне Астаны.'); return; }
    setContext(prev => ({ ...prev, origin: point })); setPickingOrigin(false); setScreen(originReturn.current);
    if (originReturn.current === 'plan' && plan) {
      setBusy(true);
      void api<{ plan: Plan }>('/api/plans', { placeIds: plan.stops.map(stop => stop.id), context: { ...context, origin: point } }).then(result => setPlan(result.plan)).catch(e => setError((e as Error).message)).finally(() => setBusy(false));
    }
  }, [pickingOrigin, plan, context]);
  function chooseMapResult(result: MapSearchResult) {
    setMapFocus({ lat: result.lat, lon: result.lon, revision: ++mapQueryRevision.current });
    (document.activeElement as HTMLElement | null)?.blur();
    setMapResults([]); setMapSearchMessage('');
    if (pickingOrigin) pickPoint({ lat: result.lat, lon: result.lon });
    else if (result.kind === 'place' || result.kind === 'event') mapSelect(result.id);
  }
  async function findOnMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim(); if (query.length < 2 || mapSearchBusy) return;
    const revision = ++mapQueryRevision.current;
    setMapSearchBusy(true); setMapSearchMessage('');
    try {
      const result = await api<{ items: MapSearchResult[] }>('/api/maps/search', { query });
      if (revision !== mapQueryRevision.current) return;
      const events: MapSearchResult[] = (liveFeed?.items ?? []).filter(item => item.lat !== null && item.lon !== null && mapSearchMatches(`${item.name} ${item.address ?? ''}`, query))
        .map(item => ({ id: item.id, kind: 'event', title: item.name, address: item.address, lat: item.lat!, lon: item.lon!, sourceUrl: item.provenance.sourceUrl, quality: item.coordinateQuality === 'observed' ? 'observed' : 'derived', asOf: item.fetchedAt }));
      const items = [...events, ...result.items].slice(0, 8);
      setMapResults(items);
      if (items.length) { setFilter('all'); setMapFocus({ lat: items[0].lat, lon: items[0].lon, revision }); }
      else setMapSearchMessage('В текущем каталоге и адресном снимке совпадений нет. Можно выбрать точку на карте.');
      (document.activeElement as HTMLElement | null)?.blur();
    } catch { if (revision === mapQueryRevision.current) setMapSearchMessage('Поиск не ответил. Попробуй ещё раз или выбери точку на карте.'); }
    finally { setMapSearchBusy(false); }
  }
  async function send(event?: FormEvent, preset?: string) {
    event?.preventDefault(); const message = (preset ?? text).trim(); if (!message || busy) return;
    try { localStorage.setItem(PROVIDER_NOTICE_KEY, 'seen'); } catch { /* session-only disclosure */ }
    setText(''); setBusy(true); setError('');
    const history = memory.dialogue.slice(-20).map(({ role, text }) => ({ role, text: text.slice(0, 1000) }));
    const user = { id: crypto.randomUUID(), role: 'user' as const, text: message, mode: 'user' as const, createdAt: new Date().toISOString() };
    setMemory(prev => appendLocalMessage(prev, user));
    try {
      const useAI = Boolean(aiConsent && aiStatus?.available);
      const reply = await api<{ reply: string; items: Card[]; proposedContext: PilotContext; events?: LiveAstanaEvent[]; googlePlaces?: GooglePlacesFeed; mode?: 'openai' | 'deterministic'; citations?: NonNullable<LocalMemory['dialogue'][number]['citations']>; reason?: string | null }>('/api/chat', boundedChatPayload(message, context, history, useAI, language, googleConsent));
      setMemory(prev => appendLocalMessage(prev, { id: crypto.randomUUID(), role: 'assistant', text: reply.reply, mode: reply.mode === 'openai' ? 'openai' : 'deterministic', citations: reply.citations, createdAt: new Date().toISOString() }));
      if (useAI) void api<AIStatus>('/api/assistant/status', undefined, 'GET').then(setAiStatus).catch(() => setAiStatus({ available: false, reason: 'UNAVAILABLE' }));
      setChatCards(reply.items); setChatEvents(reply.events ?? []); setGooglePlaces(reply.googlePlaces ?? null); setProposed(reply.proposedContext && JSON.stringify(reply.proposedContext) !== JSON.stringify(context) ? reply.proposedContext : null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function buildPlan(ids = planIds, expand = false) {
    if (!ids.length) { setNotice('Добавьте хотя бы одно место.'); return; }
    setBusy(true); setError('');
    try { const result = await api<{ plan: Plan }>('/api/plans', { placeIds: ids, context }); if (screen !== 'plan') setPlanDeparture(null); setPlanStartExpanded(screen === 'plan' || expand); setPlan(result.plan); navigate('plan'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function evaluateStop(id: string) {
    const ids = includePlanStop(planIds, id);
    if (!ids.includes(id)) { setNotice('В одном плане до 5 мест.'); return; }
    setPlanIds(ids);
    await buildPlan(ids);
  }
  function addToPlan(card: Card) {
    setPlanIds(prev => prev.includes(card.id) ? prev : [...prev, card.id].slice(0, 5));
    setNotice(planIds.includes(card.id) ? 'Место уже в плане.' : planIds.length >= 5 ? 'В одном плане до 5 мест.' : 'Добавлено в план.');
  }
  async function sharePlan(departure?: string, displayedTotal: number | null = plan?.totalMinutes ?? null) {
    if (!plan) return;
    const startLabel = departure ? formatDate(departure, language, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null;
    const content = `${translateText('Наш план в Астане:', language)} ${plan.stops.map(c => c.name).join(' → ')}.${startLabel ? ` ${translateText('Начало:', language)} ${startLabel} (${translateText('Время Астаны', language)}).` : ''} ${translateText(displayedTotal === null ? 'Время пути пока не рассчитано.' : `Примерно ${displayedTotal} мин`, language)}. ${translateText('Расписание и цены уточняйте перед посещением.', language)}`;
    try { if (navigator.share) await navigator.share({ title: translateText('QETTYQ · Астана', language), text: content }); else { await navigator.clipboard.writeText(content); setNotice('План скопирован. Личная геопозиция не включена.'); } } catch { setNotice('Отправка отменена или недоступна.'); }
  }
  async function erase() {
    setBusy(true);
    try {
      await api('/api/memory', undefined, 'DELETE');
      await api('/api/session/data', undefined, 'DELETE');
      clearLocalMemory(localStorage);
      visitPrompt.toggle(false);
      for (const key of ['qettyq.saved.v2', 'qettyq.organizer.v2', 'qettyq.onboarding.v2', SCREEN_KEY, SWIPE_CHOICES_KEY, PROVIDERS_KEY, PROVIDER_NOTICE_KEY, 'qettyq.route-return-prompts.v1']) localStorage.removeItem(key);
      skipPersist.current = true; setMemory(createDefaultLocalMemory()); setSaved([]); setContext(initialContext); setDraft({}); setPlan(null); setPlanIds([]); setCards([]); setChatCards([]); setChatEvents([]); setGooglePlaces(null); setGoogleConsent(true); setAiConsent(true); setProposed(null); setConfirmDelete(false); setScreen('welcome'); forgetLanguage();
    } catch { setError('Не удалось удалить все данные. Повторите удаление.'); } finally { setBusy(false); }
  }
  const saveDraft = (value: OrganizerDraft) => { setDraft(value); try { localStorage.setItem('qettyq.organizer.v2', JSON.stringify(value)); } catch { setNotice('Черновик доступен только до закрытия страницы.'); } };
  const isSetup = ['welcome', 'swipe', 'conditions'].includes(screen) || (screen === 'map' && pickingOrigin);
  const contextTab = screen === 'event' ? eventBack : screen === 'detail' ? detailBack : screen;
  const tab = contextTab === 'plan' ? 'map' : ['saved', 'settings', 'organizer'].includes(contextTab) ? 'profile' : contextTab;
  const picture = (card: Card, className?: string) => <div className={`${s.picture} ${className ?? ''}`}><CatalogPhoto media={card.media} fallback={illustration(card)} category={card.category} /></div>;
  const mini = (card: Card, from: Screen) => <button key={card.id} className={s.mini} onClick={() => openCard(card, from)}><div className={s.miniImage}><CatalogPhoto media={card.media} fallback={illustration(card)} category={card.category} mini labelClassName={s.miniDisclosure} /></div><span><b translate="no">{card.name}</b><small translate={card.address ? 'no' : undefined}>{card.address ?? 'Адрес уточните перед посещением'}</small><small>{card.price ? money(card.price.min) : 'Цена неизвестна'} · ≈{card.durationMinutes} мин на посещение</small><small>{openingLabel(card)}</small></span><ChevronRight size={18} /></button>;

  return <Localize><div className={s.app} data-screen={screen} data-keyboard-open={keyboardOpen} data-map-keyboard-open={screen === 'map' && keyboardOpen} data-chat-layout={screen === 'chat' ? 'dock-composer' : undefined} style={viewportStyle}>
    {!['swipe', 'detail', 'event'].includes(screen) && <header className={s.header}><button disabled={!ready} className={s.logo} aria-label="QETTYQ — на главную" onClick={() => navigate('feed')}>QETTYQ<span>•</span></button>{screen !== 'welcome' && <><button disabled={!ready} className={s.city} onClick={() => setNotice('Сейчас мы гуляем по Астане. Другие города добавим, когда для них будут проверенные места и события.')}><MapPin size={14} /> Астана</button><button disabled={!ready} className={s.round} aria-label={screen === 'feed' ? 'Изменить условия' : 'Настройки'} onClick={() => navigate(screen === 'feed' ? 'conditions' : 'settings')}><Settings size={20} /></button></>}</header>}
    {error && <div role="alert" className={s.error}>{error}<button aria-label="Закрыть ошибку" onClick={() => setError('')}><X size={16} /></button></div>}
    <AnimatePresence>{notice && <motion.div key={notice} role="status" className={s.notice} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .35 }}><span className={s.noticeIcon} aria-hidden="true"><Check size={18} /></span><span>{notice}</span><button aria-label="Закрыть уведомление" onClick={() => setNotice('')}><X size={16} /></button></motion.div>}</AnimatePresence>
    {screen === 'event' && selectedEvent && <EventDetail event={selectedEvent} saved={saved.includes(selectedEvent.id)} onSave={() => toggleSave(selectedEvent.id)} onAddToPlan={() => { setPlanIds(prev => prev.includes(selectedEvent.id) ? prev : [...prev, selectedEvent.id].slice(0, 5)); setNotice('Добавлено в план.'); }} onBuildPlan={() => void evaluateStop(selectedEvent.id)} onBack={() => navigate(eventBack)} />}
    {screen === 'welcome' && <main className={s.welcome}><div className={s.welcomeArt}><Image src="/assets/astana-welcome-v2.png" fill priority sizes="430px" alt="Иллюстрация: рука с QETTYQ на фоне Байтерека и современной Астаны" /><div className={s.photoShade} /></div><section className={s.welcomeCopy}><h1>Не знаешь, как<br />провести время?</h1><p>Расскажи нам о своих предпочтениях.</p><button disabled={!ready} className={s.primary} onClick={() => navigate('swipe')}>Выбрать свой вайб <ArrowRight size={19} /></button></section></main>}
    {screen === 'swipe' && <SwipeDeck choices={swipeChoices} setChoices={setSwipeChoices} onBack={() => navigate('welcome')} onFinish={tags => { updateContext({ likedTags: tags }); navigate('conditions'); }} />}
    {screen === 'conditions' && <main className={`${s.pad} ${s.conditions}`}><h1>Сколько времени<br />на себя?</h1><section className={s.panel}><label htmlFor="minutes">Свободное время <b>{context.minutes} мин</b></label><input id="minutes" aria-label="Свободное время" type="range" min="20" max="720" step="10" value={context.minutes} onChange={e => updateContext({ minutes: +e.target.value })} /><BudgetControl value={context.budget} strict={context.strictBudget} onChange={budget => updateContext({ budget })} onStrictChange={strictBudget => updateContext({ strictBudget })} /><div className={s.originControls}><h2>Откуда начнём?</h2><p>{context.origin ? 'Старт выбран. Точка хранится только до закрытия страницы.' : 'Выбери старт, чтобы оценить время дороги. Можно продолжить без него.'}</p><button className={s.secondary} disabled={busy} onClick={locate}><MapPin size={18} /> Поделиться геопозицией</button><button className={s.textButton} onClick={() => beginOriginSelection('conditions')}>Выбрать старт на карте</button>{context.origin && <button className={s.textButton} onClick={() => updateContext({ origin: null })}>Убрать точку старта</button>}</div></section><button className={s.primary} disabled={busy || !ready} onClick={() => void discover()}>{busy ? 'Проверяем условия…' : 'Показать подборку'}<ArrowRight size={18} /></button></main>}
    {screen === 'feed' && <main className={`${s.pad} ${s.feed}`} aria-label="Персональная лента"><h1 className={s.srOnly}>Для тебя</h1><h2>Места под твои условия</h2>{!ready ? <p role="status">Загружаем каталог…</p> : shown.length ? <><div className={s.carousel}><ProgressRail count={shown.length} active={Math.min(feedIndex, shown.length - 1)} label="Места" onSelect={index => rail.current?.scrollTo({ left: index * rail.current.clientWidth, behavior: 'smooth' })} /><div className={s.rail} ref={rail} onScroll={e => { const el = e.currentTarget; setFeedIndex(Math.round(el.scrollLeft / el.clientWidth)); }}>{shown.map(card => <article key={card.id} className={s.feedCard} data-photo-state={card.media?.kind === 'real_place_photo' ? 'real' : 'none'}>{picture(card)}<button className={`${s.round} ${s.save}`} aria-label={saved.includes(card.id) ? 'Убрать из сохранённых' : 'Сохранить'} aria-pressed={saved.includes(card.id)} onClick={() => toggleSave(card.id)}><Bookmark size={21} fill={saved.includes(card.id) ? 'currentColor' : 'none'} /></button><div className={s.feedCardBody}><CatalogPhotoCredit media={card.media} /><small>{categoryDisplayName(card.category)}</small><h2 translate="no">{card.name}</h2><p>{card.price ? money(card.price.min) : 'Стоимость нужно уточнить'} · посещение ≈{card.durationMinutes} мин</p><button className={s.primary} onClick={() => openCard(card, 'feed')}>Подробнее <ArrowRight size={18} /></button></div></article>)}</div></div><div className={s.catalogCredit}>{credit}</div></> : <section className={s.panel}><h2>По этим условиям вариантов не нашли</h2><p>Попробуй изменить время, бюджет или интересы. Мы не ослабляем твои условия автоматически.</p><button className={s.secondary} onClick={() => navigate('conditions')}>Изменить условия</button></section>}<button className={s.secondary} onClick={() => navigate('chat')}><Sparkles size={19} /> Подобрать вместе с помощником</button><LiveEvents feed={liveFeed} loading={liveLoading} saved={saved} onSave={toggleSave} onOpen={event => { setSelectedEvent(event); setEventBack('feed'); navigate('event'); }} /><button className={s.textButton} disabled={liveLoading} onClick={() => void loadEvents()}>Обновить афишу</button></main>}
    {screen === 'chat' && <main className={s.chat}>

      <div className={s.messages} role="log" aria-label="Диалог с помощником">{!memory.dialogue.length && <section className={s.chatIntro}><h1>Что придумаем?</h1><p>Свидание, ужин или что-то новое? Расскажи, что задумал. Я уточню детали и покажу варианты с источниками.</p><div className={s.chatSuggestions}>{['Идея для свидания', 'Где поужинать?', 'Что происходит сегодня?'].map(prompt => <button key={prompt} disabled={!ready || busy} onClick={() => void send(undefined, translateText(prompt, language))}>{prompt}</button>)}</div></section>}{memory.dialogue.map(message => <div key={message.id} className={message.role === 'user' ? s.user : s.assistant}><small>{message.role === 'user' ? 'Ты' : message.mode === 'openai' ? 'QETTYQ · AI' : 'QETTYQ · поиск по каталогу'}</small><CitedMessage message={message} /></div>)}{busy && <div className={s.assistant} role="status">{aiConsent && aiStatus?.available ? 'Проверяем афишу и готовим ответ…' : 'Проверяем каталог и ограничения…'}</div>}{chatCards.map(card => mini(card, 'chat'))}{chatEvents.map(event => <EventPreview key={event.id} event={event} onOpen={() => { setSelectedEvent(event); setEventBack('chat'); navigate('event'); }} />)}<GooglePlacesResults feed={googlePlaces} />{proposed && <section className={s.panel}><p>Из запроса: {proposed.minutes} мин · {money(proposed.budget)}. Применить эти условия?</p><button className={s.secondary} onClick={() => { updateContext(proposed); setProposed(null); setNotice('Условия обновлены.'); }}>Применить условия</button></section>}<div ref={chatEnd} /></div>

    </main>}
    {screen === 'map' && <main className={s.mapScreen}>
      <div className={s.mapToolbar}><h1>{pickingOrigin ? 'Выбери точку старта' : pickingVenue ? 'Выбери площадку' : 'Город на карте'}</h1><form className={mapSearchCss.form} role="search" onSubmit={event => void findOnMap(event)}><input type="search" enterKeyHint="search" autoComplete="off" autoCapitalize="none" maxLength={160} aria-label="Поиск места на карте" placeholder="Место или адрес" value={search} onChange={e => { setSearch(e.target.value); ++mapQueryRevision.current; setMapResults([]); setMapSearchMessage(''); }} /><button type="submit" aria-label="Найти на карте" disabled={mapSearchBusy || search.trim().length < 2}><Search size={20} /></button></form>{mapSearchBusy && <p role="status" className={mapSearchCss.message}>Ищем в каталоге и адресах…</p>}{mapSearchMessage && <p role="status" className={mapSearchCss.message}>{mapSearchMessage}</p>}{mapResults.length > 0 && <ul className={mapSearchCss.results} aria-label="Результаты поиска на карте">{mapResults.map(result => <li key={result.id}><button type="button" onClick={() => chooseMapResult(result)}><b translate="no">{result.title}</b>{result.address && <small translate="no">{result.address}</small>}{result.kind === 'address' && <small>Адресная точка OpenStreetMap · вход уточняйте</small>}</button></li>)}</ul>}<div className={s.chips}>{[['all', 'Все места'], ['park', 'Прогулки'], ['cafe', 'Кофе'], ['theatre', 'Театры']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
      <div className={s.mapViewport}><CityMap points={[...filtered.map(c => ({ id: c.id, title: c.name, lat: c.lat, lon: c.lon, dateLabel: 'Расписание уточняйте', category: c.category })), ...(!pickingVenue && !pickingOrigin && filter === 'all' ? (liveFeed?.items ?? []).filter(event => event.lat !== null && event.lon !== null && (!search.trim() || mapSearchMatches(`${event.name} ${event.address ?? ''}`, search))).map(event => ({ id: event.id, title: event.name, lat: event.lat!, lon: event.lon!, dateLabel: formatDate(event.startsAt, language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), category: event.category ?? 'Событие' })) : [])]} activeId={selected?.id ?? ''} focusPoint={mapFocus} onSelect={mapSelect} onPick={pickPoint} origin={context.origin} /></div>
      <button className={`${s.round} ${s.locate}`} aria-label="Моё местоположение" disabled={busy} onClick={locate}><MapPin size={19} /></button>
      {!pickingOrigin && !pickingVenue && planIds.length > 0 && <button className={s.mapPlanToggle} aria-label={`Мой план · ${planIds.length}`} disabled={busy} onClick={() => void buildPlan(planIds, true)}><Route size={22} /><span>{planIds.length}</span></button>}
      {pickingOrigin ? <section className={s.mapSheet}><p>Нажми на карту. Адрес не попадёт в постоянную память.</p><button className={s.secondary} onClick={() => { setPickingOrigin(false); navigate(originReturn.current); }}>Продолжить без изменения</button></section> : selected ? <section className={s.mapSheet}><button className={s.mapClose} aria-label="Закрыть выбранное место" onClick={() => setSelected(null)}><X size={16} /></button>{mini(selected, 'map')}<div className={s.mapActions}><button className={planIds.includes(selected.id) ? `${s.round} ${s.planCheck}` : s.secondary} aria-label={planIds.includes(selected.id) ? 'Добавлено в план' : 'В план'} aria-pressed={planIds.includes(selected.id)} onClick={() => addToPlan(selected)}>{planIds.includes(selected.id) ? <Check size={20} /> : <><Plus size={17} /> В план</>}</button><button className={s.primary} disabled={busy} onClick={() => void evaluateStop(selected.id)}>Оценить путь</button></div></section> : pickingVenue ? <section className={s.mapSheet}><p>Нажми на маркер площадки, чтобы добавить её адрес в черновик. Или введи адрес вручную в форме.</p></section> : <div className={s.mapQuickActions}><button onClick={() => beginOriginSelection('map')}>Выбрать старт на карте</button><button onClick={() => navigate('feed')}>Открыть афишу</button></div>}
    </main>}
    {screen === 'detail' && selected && <main className={s.detailScreen}><div className={`${s.picture} ${s.detailHero}`}><CatalogPhoto media={selected.media} fallback={illustration(selected)} category={selected.category} label={false} /><div className={s.photoShade} /><button className={`${s.round} ${s.heroBack}`} aria-label="Назад" onClick={() => navigate(detailBack)}><ArrowLeft size={21} /></button><button className={`${s.round} ${s.save}`} aria-label={saved.includes(selected.id) ? 'Убрать из сохранённых' : 'Сохранить'} aria-pressed={saved.includes(selected.id)} onClick={() => toggleSave(selected.id)}><Bookmark size={21} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} /></button><div className={s.heroTitle}><small>{categoryDisplayName(selected.category)} · Астана</small><h1 translate="no">{selected.name}</h1></div></div><section className={s.detailBody}><CatalogPhotoCredit media={selected.media} /><div className={s.factPills}><div><small>Когда</small><b>{openingLabel(selected)}</b></div><div><small>Язык</small><b>Не указан</b></div><div><small>Вход</small><b>{selected.price ? money(selected.price.min) : 'Уточняется'}</b></div></div><div className={s.venue}><MapPin size={19} /><div><b translate={selected.address ? 'no' : undefined}>{selected.address ?? 'Точный адрес уточните перед посещением'}</b></div></div>{selected.openingHours && <details className={s.feedDiagnostics}><summary>Расписание из каталога</summary><p translate="no">{selected.openingHours}</p></details>}{selected.openingStatus === 'closed' && <p className={s.staleNotice}>В выбранное время закрыто. Уточни расписание или измени время посещения.</p>}<section className={s.eventDescription}><h2>Перед тем как идти</h2><p>Расписание, язык и наличие мест не подтверждены. Контакт организатора в этом каталоге не указан.</p><p>{selected.reason ?? 'Место из сохранённого каталога Астаны. Проверь, подходит ли оно твоим планам.'} Посещение ≈{selected.durationMinutes} мин — проектная оценка.</p></section><button className={s.primary} disabled={busy} onClick={() => void evaluateStop(selected.id)}>Оценить путь <ArrowRight size={18} /></button><button className={s.secondary} aria-pressed={planIds.includes(selected.id)} onClick={() => addToPlan(selected)}>{planIds.includes(selected.id) ? <Check size={18} /> : <Plus size={18} />}{planIds.includes(selected.id) ? 'Добавлено в план' : 'В мой план'}</button>{planIds.length > 0 && <button className={s.textButton} onClick={() => void buildPlan()}>Открыть план · {planIds.length} мест</button>}<div className={s.catalogCredit}>{credit}</div></section></main>}
    {screen === 'plan' && plan && <RoutePlan key={plan.id} startExpanded={planStartExpanded} plan={plan} origin={context.origin} destination={context.returnToOrigin ? context.origin : context.destination} busy={busy} initialDeparture={planDeparture} onDepartureChange={setPlanDeparture} onBack={() => navigate('map')} onChangeStart={() => beginOriginSelection('plan')} onLocate={locate} onEditConditions={() => { setPlanDeparture(null); navigate('conditions'); }} onStartNavigation={visitPrompt.start} onReorder={ids => { setPlanIds(ids); void buildPlan(ids); }} onOpenStop={id => { const event = liveFeed?.items.find(item => item.id === id); if (event) { setSelectedEvent(event); setEventBack('plan'); navigate('event'); return; } const card = plan.stops.find(c => c.id === id); if (card) openCard(card, 'plan'); }} onRemove={id => { const next = plan.stops.filter(c => c.id !== id).map(c => c.id); setPlanIds(next); void buildPlan(next); }} onShare={(departure, total) => void sharePlan(departure, total)} />}
    {screen === 'profile' && <main className={s.pad}><small className={s.eyebrow}>ЛИЧНОЕ ПРОСТРАНСТВО</small><h1>Твой QETTYQ</h1><section className={s.panel}><UserRound size={32} /><h2>Без регистрации</h2><p>Предпочтения и последние сообщения хранятся в этом браузере. Геопозиция не сохраняется.</p><p>{context.likedTags.length ? countLabel(context.likedTags.length, language, 'interests') : 'Интересы ещё не выбраны'}</p></section><button className={s.rowButton} onClick={() => navigate('saved')}><Bookmark /> Сохранённые места <span>{saved.length}</span><ChevronRight /></button><button className={s.rowButton} onClick={() => navigate('swipe')}><Heart /> Изменить интересы<ChevronRight /></button><button className={s.rowButton} onClick={() => navigate('conditions')}><Clock3 /> Условия подборки<ChevronRight /></button><button className={s.rowButton} onClick={() => { setOrganizerScreen('cabinet'); navigate('organizer'); }}><Plus /> Моё событие<ChevronRight /></button><button className={s.rowButton} onClick={() => navigate('settings')}><Settings /> Настройки и память<ChevronRight /></button></main>}
    {screen === 'saved' && <main className={s.pad}><button className={s.back} onClick={() => navigate('profile')}><ArrowLeft size={18} /> Профиль</button><h1>Сохранённое</h1>{catalog.filter(c => saved.includes(c.id)).map(c => mini(c, 'saved'))}{liveFeed?.items.filter(event => saved.includes(event.id)).map(event => <EventPreview key={event.id} event={event} onOpen={() => { setSelectedEvent(event); setEventBack('saved'); navigate('event'); }} />)}{!saved.length && <section className={s.panel}><Bookmark /><h2>Место для будущих планов</h2><p>Сохраняй интересные локации из ленты или с карты.</p><button className={s.primary} onClick={() => navigate('map')}>Выбрать на карте</button></section>}</main>}
    {screen === 'settings' && <main className={s.pad}><button className={s.back} onClick={() => navigate('profile')}><ArrowLeft size={18} /> Профиль</button><h1>Настройки</h1><section className={s.panel}><h2>Город</h2><p>Астана · пилот</p><p className={s.muted}>Алматы — следующий этап. Каталог пока не подключён.</p><label htmlFor="locale">Язык интерфейса</label><select id="locale" value={language} onChange={e => { const next = e.target.value as 'ru' | 'kk' | 'en'; changeInterfaceLanguage(next); }}><option value="ru" translate="no">Русский</option><option value="kk" translate="no">Қазақша</option><option value="en" translate="no">English</option></select><p className={s.muted}>Язык сохранён на этом устройстве. Названия событий и адреса остаются на языке источника.</p></section><section className={s.panel}><h2>На этом устройстве</h2><p>Интересы, последние 24 сообщения, сохранённые места и нобай хранятся в браузере. Геопозиция не сохраняется.</p></section><section className={s.panel} aria-label="Настройки помощника"><h2>Помощник</h2><p>Можно искать с AI и Google или оставить только каталог QETTYQ. Эти настройки не включают долговременную память.</p><label className={s.check}><input type="checkbox" checked={aiConsent} onChange={e => setAiConsent(e.target.checked)} disabled={busy} />Умный ответ OpenAI</label><label className={s.check}><input type="checkbox" checked={googleConsent} onChange={e => { setGoogleConsent(e.target.checked); if (!e.target.checked) setGooglePlaces(null); }} disabled={busy} />Поиск заведений и фото Google</label><p>OpenAI получает запрос и ограниченную историю без точной геопозиции. Google получает поисковый запрос и город; фото загружаются с его серверов. Ничего не отправляется до твоего сообщения.</p><p className={s.muted}>{aiConsent && !aiStatus?.available ? aiUnavailable(aiStatus?.reason) : 'Лимиты пилота сохраняются. При недоступности AI продолжим по проверенному каталогу.'}</p><button className={s.textButton} onClick={() => navigate('chat')}>Вернуться к разговору</button></section><RouteVisitSettings state={visitPrompt} allowed={Boolean(serverMemory.state?.consents.visits?.active)} /><MemorySettings memory={serverMemory} profile={{ likedTags: context.likedTags, locale: language, goal: context.goal, minutes: context.minutes, budget: context.budget }} onDeleteAll={() => setConfirmDelete(true)} /><footer className={s.credit}>{credit}<p>Снимок каталога: 19 октября 2026. Геометрия карты загружается из OpenStreetMap.</p></footer></main>}
    {screen === 'organizer' && <main className={s.organizer}><p className={s.muted}>Локальный черновик. Публикация и проверка организатора пока недоступны.</p><button className={s.textButton} onClick={() => setOrganizerScreen(organizerScreen === 'eligibility' ? 'cabinet' : 'eligibility')}>{organizerScreen === 'eligibility' ? 'К моим черновикам' : 'Условия публикации'}</button><OrganizerFlow localDraftOnly screen={organizerScreen} mode="demo" initialDraft={draft} eligibility="unknown" applicationEnabled={false} moderation={{ status: 'draft', mode: 'demo', comments: ['Это локальный черновик. Публикация и проверка организатора пока не подключены.'] }} onNavigate={(next, value) => { saveDraft(value); setOrganizerScreen(next); }} onDraftChange={saveDraft} onBack={current => { const previous: Partial<Record<OrganizerScreen, OrganizerScreen>> = { schedule: 'basic', details: 'schedule', preview: 'details', moderation: 'cabinet', basic: 'cabinet' }; const target = previous[current]; if (target) setOrganizerScreen(target); else navigate('profile'); }} onSubmitForReview={value => { saveDraft(value); setNotice('Черновик сохранён на устройстве. Он не опубликован и не отправлен на модерацию.'); }} onPickPlace={value => { saveDraft(value); venueDraft.current = value; setPickingVenue(true); setSelected(null); setFilter('all'); setSearch(''); navigate('map'); }} onOpenEvent={() => setOrganizerScreen('preview')} onOpenSettings={() => navigate('settings')} onEdit={() => setOrganizerScreen('basic')} /></main>}
    {confirmDelete && <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="delete-title"><section className={s.panel}><h2 id="delete-title">Удалить память QETTYQ?</h2><p>Исчезнут интересы, диалог, сохранённые места, черновик и данные текущей серверной сессии. Это нельзя отменить.</p><button className={s.danger} disabled={busy} onClick={() => void erase()}>Да, удалить данные</button><button className={s.secondary} onClick={() => setConfirmDelete(false)}>Оставить данные</button></section></div>}
    <RouteVisitPrompt state={visitPrompt} />{screen === 'chat' ? <div ref={chatFooter} className={s.chatDockPanel}><div className={s.composer}><form onSubmit={event => void send(event)}><input maxLength={500} value={text} onChange={e => setText(e.target.value)} placeholder="Спроси, куда сходить…" aria-label="Сообщение помощнику" /><button className={s.round} aria-label="Отправить сообщение" disabled={busy || !text.trim() || !ready}><Send size={19} /></button></form></div>{!keyboardOpen && <GlassDock active={tab} onNavigate={id => { setPickingOrigin(false); navigate(id); }} />}</div> : !isSetup && <GlassDock active={tab} onNavigate={id => { setPickingOrigin(false); navigate(id); }} />}
  </div></Localize>;
}
