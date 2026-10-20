"use client";

import {
  ArrowLeft,
  Bookmark,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  Copy,
  ExternalLink,
  Film,
  Languages,
  MapPin,
  Navigation,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  Ticket,
  WalletCards,
  X,
} from "lucide-react";
import type { Recommendation } from "@/domain/types";
import styles from "./MissingProductScreens.module.css";

export type ProductAuxScreenId = "01" | "15" | "22" | "23" | "30" | "31";
export type ProductDataMode = "snapshot" | "demo" | "unknown";

export type MoneyState =
  | { state: "exact" | "from"; amount: number; currency: "KZT" }
  | { state: "range"; min: number; max: number; currency: "KZT" }
  | { state: "free"; currency: "KZT" }
  | { state: "unknown"; currency: "KZT" };

export type CinemaSessionSummary = {
  id: string;
  filmTitle: string;
  cinemaName: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  audioLanguage: string | null;
  subtitleLanguages: string[] | null;
  price: MoneyState;
  sourceName: string | null;
  sourceUrl: string | null;
  checkedAtLabel: string | null;
  dataMode: ProductDataMode;
};

export type CinemaSessionDetail = CinemaSessionSummary & {
  originalTitle: string | null;
  hall: string | null;
  ageRating: string | null;
  status: "scheduled" | "cancelled" | "unknown";
  ticketUrl: string | null;
  destination: { lat: number; lon: number } | null;
};

export type SavedPlanSummary = {
  id: string;
  title: string;
  dateLabel: string | null;
  totalMinutes: number | null;
  stale: boolean;
  checkedAtLabel: string | null;
  dataMode: ProductDataMode;
};

export type ProductAuxAction =
  | { type: "continueWithoutRestore" }
  | { type: "back"; from: ProductAuxScreenId }
  | { type: "openSettings"; from: Exclude<ProductAuxScreenId, "01" | "31"> }
  | { type: "openCandidateDetails"; candidateId: string }
  | { type: "setCinemaLanguage"; value: "all" | "ru" | "kk" | "en" }
  | { type: "openCinemaSession"; sessionId: string }
  | { type: "saveCinemaSession"; sessionId: string }
  | { type: "buildCinemaRoute"; sessionId: string }
  | { type: "openTickets"; sessionId: string; url: string }
  | { type: "openPlan"; planId: string }
  | { type: "refreshPlan"; planId: string }
  | { type: "sharePlan"; planId: string }
  | { type: "createFirstPlan" }
  | { type: "closeShare" }
  | { type: "setShareExpiry"; value: ShareExpiry }
  | { type: "copyShareLink"; url: string }
  | { type: "systemShare"; url: string; title: string };

export type ShareExpiry = "24h" | "7d" | "30d";

type CommonProps = {
  className?: string;
  onAction: (action: ProductAuxAction) => void;
};

export type ProductAuxScreenProps = CommonProps & (
  | {
      screenId: "01";
      data?: { state: "restoring" | "ready" | "failed"; showStatus?: boolean; showBypass?: boolean };
    }
  | {
      screenId: "15";
      data?: { candidates: Recommendation[]; cityLabel?: string };
    }
  | {
      screenId: "22";
      data?: { sessions: CinemaSessionSummary[]; activeLanguage?: "all" | "ru" | "kk" | "en" };
    }
  | {
      screenId: "23";
      data?: { session: CinemaSessionDetail | null; saved?: boolean };
    }
  | {
      screenId: "30";
      data?: { plans: SavedPlanSummary[] };
    }
  | {
      screenId: "31";
      data?: { planId: string | null; planTitle: string | null; shareUrl: string | null; expiry: ShareExpiry | null; copied?: boolean };
    }
);

export function formatMoney(value: MoneyState): string {
  const format = (amount: number) => amount.toLocaleString("ru-RU");
  if (value.state === "free") return "Бесплатно — подтверждено источником";
  if (value.state === "unknown") return "Цена не указана";
  if (value.state === "range") return `${format(value.min)}–${format(value.max)} ₸`;
  return `${value.state === "from" ? "от " : ""}${format(value.amount)} ₸`;
}

export function cinemaLanguageLabel(session: Pick<CinemaSessionSummary, "audioLanguage" | "subtitleLanguages">): string {
  const audio = session.audioLanguage ? `Звук: ${session.audioLanguage.toUpperCase()}` : "Язык звука не указан";
  if (session.subtitleLanguages === null) return `${audio} · Субтитры не указаны`;
  if (session.subtitleLanguages.length === 0) return `${audio} · Без заявленных субтитров`;
  return `${audio} · Субтитры: ${session.subtitleLanguages.map((language) => language.toUpperCase()).join(", ")}`;
}

export function savedPlanState(plan: SavedPlanSummary): string {
  if (plan.stale) return plan.checkedAtLabel ? `Данные устарели · проверено ${plan.checkedAtLabel}` : "Данные устарели · время проверки не указано";
  return plan.checkedAtLabel ? `Проверено ${plan.checkedAtLabel}` : "Время проверки не указано";
}

function IconButton({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button className={styles.iconButton} type="button" aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

function ActionButton({ children, onClick, tone = "primary", disabled = false }: { children: React.ReactNode; onClick: () => void; tone?: "primary" | "secondary" | "text"; disabled?: boolean }) {
  return <button className={`${styles.action} ${styles[tone]}`} type="button" disabled={disabled} onClick={onClick}>{children}</button>;
}

function Header({ title, screenId, onAction, settings = true }: { title?: string; screenId: ProductAuxScreenId; onAction: (action: ProductAuxAction) => void; settings?: boolean }) {
  return (
    <header className={styles.header}>
      <IconButton label="Назад" onClick={() => onAction({ type: "back", from: screenId })}><ArrowLeft size={22} /></IconButton>
      {title ? <strong className={styles.headerTitle}>{title}</strong> : <span className={styles.wordmark}>QETTYQ<i>•</i></span>}
      {settings && screenId !== "01" && screenId !== "31"
        ? <IconButton label="Настройки" onClick={() => onAction({ type: "openSettings", from: screenId })}><Settings size={21} /></IconButton>
        : <span className={styles.headerSpacer} />}
    </header>
  );
}

function DataModeBadge({ mode }: { mode: ProductDataMode }) {
  const copy = mode === "snapshot" ? "Снимок данных" : mode === "demo" ? "Демо, не подтверждено" : "Данные не указаны";
  return <span className={`${styles.dataMode} ${styles[`dataMode_${mode}`]}`}>{copy}</span>;
}

function PosterlessArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.poster} ${compact ? styles.posterCompact : ""}`} role="img" aria-label="Иллюстрация категории: кино">
      <Film size={compact ? 24 : 42} aria-hidden="true" />
      <span>Иллюстрация категории</span>
    </div>
  );
}

function BootstrapScreen({ data, onAction }: Extract<ProductAuxScreenProps, { screenId: "01" }>) {
  const state = data?.state ?? "restoring";
  const status = state === "failed" ? "Настройки не удалось восстановить" : state === "ready" ? "Настройки восстановлены" : "Восстанавливаем настройки";
  return (
    <section className={`${styles.viewport} ${styles.bootstrap}`} aria-labelledby="bootstrap-brand">
      <div className={styles.bootstrapBrand}>
        <h1 id="bootstrap-brand" className={styles.bootstrapWordmark}>QETTYQ<i>•</i></h1>
        <svg className={styles.routeArc} viewBox="0 0 120 40" role="img" aria-label="Маршрут QETTYQ">
          <path d="M8 30C30 7 57 7 72 21c12 11 22 10 40-7" />
          <circle cx="8" cy="30" r="4" />
          <circle cx="112" cy="14" r="4" />
        </svg>
      </div>
      {(data?.showStatus ?? true) && <p className={styles.bootstrapStatus} role="status" aria-live="polite">{status}</p>}
      {(data?.showBypass || state === "failed") && <button className={styles.bypass} type="button" onClick={() => onAction({ type: "continueWithoutRestore" })}>Продолжить без восстановления</button>}
    </section>
  );
}

function FeedNeedsClarificationScreen({ data, onAction }: Extract<ProductAuxScreenProps, { screenId: "15" }>) {
  const candidates = data?.candidates ?? [];
  return (
    <section className={styles.viewport} aria-labelledby="clarification-title">
      <div className={styles.mainHeader}>
        <span className={styles.wordmark}>QETTYQ<i>•</i></span>
        <span className={styles.city}><MapPin size={16} />{data?.cityLabel ?? "Астана"}</span>
        <IconButton label="Настройки" onClick={() => onAction({ type: "openSettings", from: "15" })}><Settings size={21} /></IconButton>
      </div>
      <div className={styles.warningIntro}>
        <CircleHelp size={24} aria-hidden="true" />
        <div><h1 id="clarification-title">Можно рассмотреть, но нужно уточнить</h1><p>Мы не заменяем неизвестные данные догадками. Перед поездкой проверьте детали у источника или организатора.</p></div>
      </div>
      {candidates.length ? <div className={styles.uncertainList}>{candidates.map((candidate) => (
        <article className={styles.uncertainCard} key={candidate.id}>
          <div className={styles.categoryArt} role="img" aria-label={`Иллюстрация категории: ${candidate.category}`}><CircleHelp size={28} /><small>Иллюстрация категории</small></div>
          <div className={styles.cardBody}>
            <DataModeBadge mode="snapshot" />
            <h2>{candidate.name}</h2>
            <p className={styles.meta}>{candidate.category} · Астана</p>
            <div className={styles.unknownList}>{candidate.unknowns.length ? candidate.unknowns.map((unknown) => <p key={unknown}><CircleAlert size={16} />{unknown}</p>) : <p><CircleHelp size={16} />Нужно уточнить существенные сведения</p>}</div>
            <ActionButton onClick={() => onAction({ type: "openCandidateDetails", candidateId: candidate.id })}>Подробнее <ChevronRight size={18} /></ActionButton>
          </div>
        </article>
      ))}</div> : <div className={styles.emptyState}><CircleHelp size={34} /><h2>Кандидатов для уточнения нет</h2><p>Этот экран заполнится только реальными вариантами с явно указанными неизвестными полями.</p></div>}
    </section>
  );
}

function CinemaSessionsScreen({ data, onAction }: Extract<ProductAuxScreenProps, { screenId: "22" }>) {
  const sessions = data?.sessions ?? [];
  const activeLanguage = data?.activeLanguage ?? "all";
  return (
    <section className={styles.viewport} aria-labelledby="cinema-title">
      <Header title="Поиск" screenId="22" onAction={onAction} />
      <div className={styles.titleRow}><div><span className={styles.sectionKicker}>Кино в Астане</span><h1 id="cinema-title">Кино сегодня</h1></div><Film size={30} aria-hidden="true" /></div>
      <div className={styles.filterRail} aria-label="Фильтр по языку">{(["all", "ru", "kk", "en"] as const).map((language) => <button type="button" key={language} aria-pressed={activeLanguage === language} onClick={() => onAction({ type: "setCinemaLanguage", value: language })}>{language === "all" ? "Все" : language.toUpperCase()}</button>)}</div>
      <p className={styles.disclosure}><Languages size={17} />Язык звука и субтитры указаны отдельно</p>
      {sessions.length ? <div className={styles.sessionList}>{sessions.map((session) => (
        <article className={styles.sessionRow} key={session.id}>
          <PosterlessArt compact />
          <div className={styles.sessionBody}>
            <DataModeBadge mode={session.dataMode} />
            <h2>{session.filmTitle}</h2>
            <p>{session.cinemaName ?? "Кинотеатр не указан"}</p>
            <div className={styles.factLine}><CalendarClock size={15} />{session.dateLabel ?? "Дата не указана"} · {session.timeLabel ?? "Время не указано"}</div>
            <div className={styles.factLine}><Languages size={15} />{cinemaLanguageLabel(session)}</div>
            <div className={styles.sessionFooter}><span>{formatMoney(session.price)}</span><button type="button" onClick={() => onAction({ type: "openCinemaSession", sessionId: session.id })}>Открыть сеанс <ChevronRight size={16} /></button></div>
          </div>
        </article>
      ))}</div> : <div className={styles.emptyState}><Film size={34} /><DataModeBadge mode="demo" /><h2>Подтверждённых сеансов пока нет</h2><p>Киноафиша не подключена. QETTYQ не показывает примерное расписание как реальное.</p></div>}
    </section>
  );
}

function CinemaSessionDetailScreen({ data, onAction }: Extract<ProductAuxScreenProps, { screenId: "23" }>) {
  const session = data?.session ?? null;
  const ticketsEnabled = Boolean(session?.ticketUrl) && session?.status === "scheduled";
  const routeEnabled = Boolean(session?.destination);
  return (
    <section className={`${styles.viewport} ${styles.detailViewport}`} aria-labelledby="session-title">
      <Header title="Сеанс" screenId="23" onAction={onAction} settings={false} />
      <PosterlessArt />
      <DataModeBadge mode={session?.dataMode ?? "unknown"} />
      <h1 id="session-title" className={styles.detailTitle}>{session?.filmTitle ?? "Сеанс не выбран"}</h1>
      {session?.originalTitle && <p className={styles.originalTitle}>{session.originalTitle}</p>}
      {session?.status === "cancelled" && <p className={styles.cancelled}><CircleAlert size={18} />Сеанс отменён по данным источника</p>}
      <dl className={styles.factGrid}>
        <div><dt><MapPin size={17} />Кинотеатр</dt><dd>{session?.cinemaName ?? "Не указан"}</dd></div>
        <div><dt><CalendarClock size={17} />Дата и время</dt><dd>{session ? `${session.dateLabel ?? "Дата не указана"}, ${session.timeLabel ?? "время не указано"}` : "Не указаны"}</dd></div>
        <div><dt><Languages size={17} />Язык</dt><dd>{session ? cinemaLanguageLabel(session) : "Не указан"}</dd></div>
        <div><dt><Ticket size={17} />Зал и возраст</dt><dd>{session ? `${session.hall ?? "Зал не указан"} · ${session.ageRating ?? "Возраст не указан"}` : "Не указаны"}</dd></div>
        <div><dt><WalletCards size={17} />Цена</dt><dd>{session ? formatMoney(session.price) : "Цена не указана"}</dd></div>
        <div><dt><Clock3 size={17} />Проверка</dt><dd>{session?.checkedAtLabel ? `Проверено ${session.checkedAtLabel}` : "Время проверки не указано"}</dd></div>
      </dl>
      {session?.sourceUrl ? <a className={styles.sourceLink} href={session.sourceUrl} target="_blank" rel="noreferrer">Источник: {session.sourceName ?? "первоисточник"}<ExternalLink size={15} /></a> : <p className={styles.missingSource}>Источник не указан — внешние действия недоступны</p>}
      <div className={styles.stickyActions}>
        <IconButton label={data?.saved ? "Убрать из сохранённых" : "Сохранить"} disabled={!session} onClick={() => { if (session) onAction({ type: "saveCinemaSession", sessionId: session.id }); }}><Bookmark size={21} fill={data?.saved ? "currentColor" : "none"} /></IconButton>
        <ActionButton tone="secondary" disabled={!routeEnabled} onClick={() => { if (session) onAction({ type: "buildCinemaRoute", sessionId: session.id }); }}><Navigation size={18} />Маршрут</ActionButton>
        <ActionButton disabled={!ticketsEnabled} onClick={() => { if (session?.ticketUrl) onAction({ type: "openTickets", sessionId: session.id, url: session.ticketUrl }); }}><ExternalLink size={18} />Открыть билеты</ActionButton>
      </div>
    </section>
  );
}

function SavedPlansScreen({ data, onAction }: Extract<ProductAuxScreenProps, { screenId: "30" }>) {
  const plans = data?.plans ?? [];
  return (
    <section className={styles.viewport} aria-labelledby="plans-title">
      <Header title="Профиль" screenId="30" onAction={onAction} />
      <div className={styles.titleRow}><div><span className={styles.sectionKicker}>Сохранённое</span><h1 id="plans-title">Планы</h1></div><Bookmark size={30} aria-hidden="true" /></div>
      {plans.length ? <div className={styles.planList}>{plans.map((plan) => (
        <article className={styles.planCard} key={plan.id}>
          <div className={styles.routeThumbnail} aria-hidden="true"><i /><span /><b /></div>
          <div className={styles.planBody}>
            <div className={styles.planTop}><DataModeBadge mode={plan.dataMode} />{plan.stale && <span className={styles.stale}><CircleAlert size={14} />Нужно обновить</span>}</div>
            <h2>{plan.title}</h2>
            <p>{plan.dateLabel ?? "Дата не указана"} · {plan.totalMinutes === null ? "Общее время не рассчитано" : `≈ ${plan.totalMinutes} мин`}</p>
            <small>{savedPlanState(plan)}</small>
            <div className={styles.planActions}>
              <ActionButton onClick={() => onAction({ type: "openPlan", planId: plan.id })}>Открыть</ActionButton>
              {plan.stale && <IconButton label="Обновить" onClick={() => onAction({ type: "refreshPlan", planId: plan.id })}><RefreshCw size={19} /></IconButton>}
              <IconButton label="Поделиться" onClick={() => onAction({ type: "sharePlan", planId: plan.id })}><Share2 size={19} /></IconButton>
            </div>
          </div>
        </article>
      ))}</div> : <div className={styles.emptyState}><Bookmark size={34} /><h2>Сохранённых планов пока нет</h2><p>Сохранение не означает бронь или подтверждённое посещение.</p><ActionButton onClick={() => onAction({ type: "createFirstPlan" })}>Собрать первый план</ActionButton></div>}
    </section>
  );
}

function ShareRouteScreen({ data, onAction }: Extract<ProductAuxScreenProps, { screenId: "31" }>) {
  const url = data?.shareUrl ?? null;
  const title = data?.planTitle ?? "Маршрут QETTYQ";
  return (
    <section className={styles.shareOverlay} aria-label="Поделиться маршрутом">
      <button className={styles.scrim} type="button" aria-label="Закрыть" onClick={() => onAction({ type: "closeShare" })} />
      <div className={styles.shareSheet} role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetHeader}><h1 id="share-title">Поделиться маршрутом</h1><IconButton label="Закрыть" onClick={() => onAction({ type: "closeShare" })}><X size={21} /></IconButton></div>
        <div className={styles.privacyNote}><ShieldCheck size={24} /><div><b>Точная стартовая точка не войдёт в ссылку</b><p>Друг увидит только публичные остановки и общий порядок маршрута.</p></div></div>
        <label className={styles.expiryLabel}>Срок действия ссылки<select value={data?.expiry ?? ""} onChange={(event) => onAction({ type: "setShareExpiry", value: event.target.value as ShareExpiry })}><option value="" disabled>Выберите срок</option><option value="24h">24 часа</option><option value="7d">7 дней</option><option value="30d">30 дней</option></select></label>
        <div className={styles.linkPreview}><span>{url ?? "Ссылка ещё не создана"}</span>{data?.copied ? <Check size={19} aria-label="Скопировано" /> : <Copy size={19} aria-hidden="true" />}</div>
        <p className={styles.shareStatus} role="status" aria-live="polite">{data?.copied ? "Ссылка скопирована" : !data?.expiry ? "Сначала выберите срок действия" : !url ? "Ссылка недоступна" : "Ссылка готова"}</p>
        <div className={styles.shareActions}>
          <ActionButton disabled={!url} onClick={() => { if (url) onAction({ type: "copyShareLink", url }); }}>{data?.copied ? <Check size={18} /> : <Copy size={18} />}Скопировать ссылку</ActionButton>
          <ActionButton tone="secondary" disabled={!url} onClick={() => { if (url) onAction({ type: "systemShare", url, title }); }}><Share2 size={18} />Поделиться</ActionButton>
        </div>
      </div>
    </section>
  );
}

export function ProductAuxScreen(props: ProductAuxScreenProps) {
  const content = (() => {
    switch (props.screenId) {
      case "01": return <BootstrapScreen {...props} />;
      case "15": return <FeedNeedsClarificationScreen {...props} />;
      case "22": return <CinemaSessionsScreen {...props} />;
      case "23": return <CinemaSessionDetailScreen {...props} />;
      case "30": return <SavedPlansScreen {...props} />;
      case "31": return <ShareRouteScreen {...props} />;
    }
  })();
  return <div className={props.className}>{content}</div>;
}
