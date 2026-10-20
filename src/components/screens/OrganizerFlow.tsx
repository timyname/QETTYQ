"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleCheck,
  Clock3,
  Ellipsis,
  FileClock,
  Globe,
  ImagePlus,
  Languages,
  Link,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Upload,
  WalletCards,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Localize, useI18n, localeFor, formatDate, type Language } from '../../client/i18n';
import styles from "./OrganizerFlow.module.css";

export type OrganizerScreen =
  | "eligibility"
  | "basic"
  | "schedule"
  | "details"
  | "preview"
  | "moderation"
  | "cabinet";

export type OrganizerDataMode = "synthetic_test" | "demo";
export type OrganizerEligibility = "eligible" | "ineligible" | "unknown";
export type OrganizerPriceState = "exact" | "range" | "from" | "free" | "unknown";
export type OrganizerModerationStatus =
  | "draft"
  | "submitted"
  | "review"
  | "changes"
  | "published"
  | "withdrawn"
  | "unknown";
export type OrganizerCabinetTab = "published" | "review" | "drafts" | "ended";

export type OrganizerDraft = {
  id: string;
  title: string;
  categoryId: string;
  organizerName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  timeZone: string;
  venueName: string;
  priceState: OrganizerPriceState | "";
  priceMin: string;
  priceMax: string;
  spokenLanguages: string[];
  languageUnspecified: boolean;
  contactType: "site" | "phone" | "whatsapp";
  contactValue: string;
  mediaFileName: string | null;
  rightsConfirmed: boolean;
  savedAt: string | null;
};

export type OrganizerRequirement = {
  id: string;
  label: string;
  met: boolean | null;
};

export type OrganizerModeration = {
  status: OrganizerModerationStatus;
  comments: string[];
  mode: OrganizerDataMode;
};

export type OrganizerEvent = {
  id: string;
  title: string;
  occurrenceLabel: string | null;
  status: OrganizerModerationStatus;
  tab: OrganizerCabinetTab;
  mediaLabel?: string | null;
  mode: OrganizerDataMode;
};

export type OrganizerFlowCallbacks = {
  onNavigate?: (screen: OrganizerScreen, draft: OrganizerDraft) => void;
  onBack?: (screen: OrganizerScreen) => void;
  onDraftChange?: (draft: OrganizerDraft) => void;
  onApply?: () => void;
  onPickPlace?: (draft: OrganizerDraft) => void;
  onSubmitForReview?: (draft: OrganizerDraft) => void;
  onEdit?: (draft: OrganizerDraft) => void;
  onWithdraw?: (draftId: string) => void;
  onOpenEvent?: (event: OrganizerEvent) => void;
  onOpenSettings?: () => void;
};

export type OrganizerFlowProps = OrganizerFlowCallbacks & {
  screen: OrganizerScreen;
  mode?: OrganizerDataMode;
  initialDraft?: Partial<OrganizerDraft>;
  eligibility?: OrganizerEligibility;
  requirements?: OrganizerRequirement[];
  applicationEnabled?: boolean;
  localDraftOnly?: boolean;
  moderation?: OrganizerModeration;
  events?: OrganizerEvent[];
  mapSlot?: ReactNode;
};

const DEFAULT_DRAFT: OrganizerDraft = {
  id: "local-organizer-draft",
  title: "",
  categoryId: "",
  organizerName: "",
  date: "",
  startTime: "",
  endTime: "",
  durationMinutes: "",
  timeZone: "Asia/Almaty",
  venueName: "",
  priceState: "",
  priceMin: "",
  priceMax: "",
  spokenLanguages: [],
  languageUnspecified: false,
  contactType: "site",
  contactValue: "",
  mediaFileName: null,
  rightsConfirmed: false,
  savedAt: null,
};

const DEFAULT_REQUIREMENTS: OrganizerRequirement[] = [
  { id: "identity", label: "Контакт организатора подтверждён", met: null },
  { id: "rights", label: "Есть право публиковать сведения и медиа", met: null },
  { id: "accuracy", label: "Дата, место и условия можно проверить", met: null },
];

const SCREEN_TITLES: Record<OrganizerScreen, string> = {
  eligibility: "Стать организатором",
  basic: "Основное о событии",
  schedule: "Дата и место",
  details: "Цена, язык и контакт",
  preview: "Проверьте событие",
  moderation: "Статус события",
  cabinet: "Мои события",
};

const SCREEN_STEPS: Partial<Record<OrganizerScreen, number>> = {
  basic: 1,
  schedule: 2,
  details: 3,
  preview: 4,
};

const NEXT_SCREEN: Partial<Record<OrganizerScreen, OrganizerScreen>> = {
  eligibility: "basic",
  basic: "schedule",
  schedule: "details",
  details: "preview",
  preview: "moderation",
};

const PRICE_OPTIONS: Array<{ value: OrganizerPriceState; label: string }> = [
  { value: "exact", label: "Точная" },
  { value: "range", label: "Диапазон" },
  { value: "from", label: "От" },
  { value: "free", label: "Бесплатно" },
  { value: "unknown", label: "Не указана" },
];

const MODERATION_LABELS: Record<OrganizerModerationStatus, string> = {
  draft: "Черновик",
  submitted: "Отправлено на проверку",
  review: "Проверяется",
  changes: "Нужны изменения",
  published: "Опубликовано",
  withdrawn: "Отозвано",
  unknown: "Статус не определён",
};

const TAB_LABELS: Record<OrganizerCabinetTab, string> = {
  published: "Опубликованы",
  review: "На проверке",
  drafts: "Черновики",
  ended: "Завершены",
};

function todayForInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDraftTime(value: string | null, language: Language = 'ru') {
  if (!value) return "Черновик хранится только в этом браузере";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Черновик сохранён локально"
    : `Черновик сохранён локально в ${new Intl.DateTimeFormat(localeFor(language), {
        hourCycle: 'h23',
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)}`;
}

function priceLabel(draft: OrganizerDraft) {
  if (draft.priceState === "free") return "Бесплатно — указано организатором";
  if (draft.priceState === "unknown") return "Цена не указана";
  if (draft.priceState === "exact" && draft.priceMin) return `${draft.priceMin} ₸`;
  if (draft.priceState === "from" && draft.priceMin) return `от ${draft.priceMin} ₸`;
  if (draft.priceState === "range" && draft.priceMin && draft.priceMax) {
    return `${draft.priceMin}–${draft.priceMax} ₸`;
  }
  return "Цена ещё не заполнена";
}

function occurrenceLabel(draft: OrganizerDraft, language: Language = 'ru') {
  if (!draft.date || !draft.startTime) return "Дата и время ещё не заполнены";
  const end = draft.endTime ? `–${draft.endTime}` : "";
  return `${formatDate(`${draft.date}T12:00:00+05:00`, language, { day: 'numeric', month: 'long', year: 'numeric' })} · ${draft.startTime}${end} · ${draft.timeZone}`;
}

function FieldLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className={styles.fieldLabel}>
      {icon}
      {children}
    </span>
  );
}

function ModeBadge({ mode }: { mode: OrganizerDataMode }) {
  return (
    <Localize><span className={styles.modeBadge} title="Локальные демонстрационные данные, не опубликованное событие">
      Демо · {mode}
    </span></Localize>
  );
}

function RequirementIcon({ met }: { met: boolean | null }) {
  if (met === true) return <CircleCheck aria-hidden="true" />;
  if (met === false) return <CircleAlert aria-hidden="true" />;
  return <Circle aria-hidden="true" />;
}

export function organizerSubmitBehavior(localDraftOnly = false) {
  return localDraftOnly ? {
    label: "Сохранить черновик",
    target: "cabinet" as const,
    announcement: "Черновик сохранён на устройстве. Он не опубликован и не отправлен на проверку.",
  } : {
    label: "Отправить на проверку",
    target: "moderation" as const,
    announcement: "Демо-черновик передан в локальный статус проверки. Публичной публикации не было.",
  };
}

export function OrganizerFlow({
  screen,
  mode = "synthetic_test",
  initialDraft,
  eligibility = "unknown",
  requirements = DEFAULT_REQUIREMENTS,
  applicationEnabled = true,
  localDraftOnly = false,
  moderation = { status: "submitted", comments: [], mode: "synthetic_test" },
  events = [],
  mapSlot,
  onNavigate,
  onBack,
  onDraftChange,
  onApply,
  onPickPlace,
  onSubmitForReview,
  onEdit,
  onWithdraw,
  onOpenEvent,
  onOpenSettings,
}: OrganizerFlowProps) {
  const { language } = useI18n();
  const [draft, setDraft] = useState<OrganizerDraft>(() => ({ ...DEFAULT_DRAFT, ...initialDraft }));
  const [activeTab, setActiveTab] = useState<OrganizerCabinetTab>("drafts");
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const mediaInputId = useId();

  useEffect(() => () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
  }, [mediaPreviewUrl]);

  const localDraftEvent = useMemo<OrganizerEvent | null>(() => {
    if (!draft.title.trim()) return null;
    return {
      id: draft.id,
      title: draft.title,
      occurrenceLabel: draft.date && draft.startTime ? occurrenceLabel(draft, language) : null,
      status: "draft",
      tab: "drafts",
      mediaLabel: draft.mediaFileName,
      mode,
    };
  }, [draft, mode, language]);

  const cabinetEvents = useMemo(() => {
    const all = localDraftEvent ? [localDraftEvent, ...events.filter((event) => event.id !== localDraftEvent.id)] : events;
    return all.filter((event) => event.tab === activeTab);
  }, [activeTab, events, localDraftEvent]);

  function updateDraft(patch: Partial<OrganizerDraft>, announce?: string) {
    const next = { ...draft, ...patch, savedAt: new Date().toISOString() };
    setDraft(next);
    // Notify the parent from the event, not from a React state updater/render.
    onDraftChange?.(next);
    if (announce) setAnnouncement(announce);
  }

  function navigate(target: OrganizerScreen) {
    onNavigate?.(target, draft);
  }

  function next(event?: FormEvent) {
    event?.preventDefault();
    const target = NEXT_SCREEN[screen];
    if (target) navigate(target);
  }

  const basicValid = Boolean(draft.title.trim() && draft.categoryId && draft.organizerName.trim());
  const scheduleValid = Boolean(draft.date && draft.startTime && (draft.endTime || draft.durationMinutes) && draft.venueName.trim());
  const priceValid =
    draft.priceState === "free" ||
    draft.priceState === "unknown" ||
    ((draft.priceState === "exact" || draft.priceState === "from") && Boolean(draft.priceMin)) ||
    (draft.priceState === "range" && Boolean(draft.priceMin && draft.priceMax));
  const languageValid = draft.languageUnspecified || draft.spokenLanguages.length > 0;
  const detailsValid = Boolean(priceValid && languageValid && draft.contactValue.trim());
  const previewValid = basicValid && scheduleValid && detailsValid && (!draft.mediaFileName || draft.rightsConfirmed);

  function handleMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    const nextUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(nextUrl);
    updateDraft({ mediaFileName: file.name, rightsConfirmed: false }, "Изображение добавлено только в локальный черновик");
  }

  function submitForReview() {
    if (!previewValid) return;
    const action = organizerSubmitBehavior(localDraftOnly);
    if (localDraftOnly) onDraftChange?.(draft);
    else onSubmitForReview?.(draft);
    setAnnouncement(action.announcement);
    navigate(action.target);
  }

  function editDraft() {
    onEdit?.(draft);
    navigate("basic");
  }

  function openCabinetEvent(event: OrganizerEvent) {
    if (event.id === draft.id) editDraft();
    else onOpenEvent?.(event);
  }

  function renderHeader() {
    const step = SCREEN_STEPS[screen];
    return (
      <header className={styles.header}>
        <button type="button" className={styles.iconButton} aria-label="Назад" disabled={!onBack} onClick={() => onBack?.(screen)}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className={styles.headerTitle}>
          {step ? <span>Шаг {step} из 4</span> : <span>QETTYQ · организатор</span>}
          <strong>{SCREEN_TITLES[screen]}</strong>
        </div>
        {screen === "cabinet" ? (
          <button type="button" className={styles.iconButton} aria-label="Настройки организатора" disabled={!onOpenSettings} onClick={onOpenSettings}>
            <Settings aria-hidden="true" />
          </button>
        ) : (
          <ModeBadge mode={mode} />
        )}
      </header>
    );
  }

  function renderEligibility() {
    const labels: Record<OrganizerEligibility, string> = {
      eligible: "Требования подтверждены в этом демо-сеансе",
      ineligible: "Сейчас не все требования выполнены",
      unknown: "Готовность ещё не подтверждена",
    };
    const canApply = eligibility === "eligible" && applicationEnabled && Boolean(onApply || onNavigate);
    return (
      <>
        <div className={styles.organizerHero} aria-hidden="true">
          <span className={styles.heroBlockA} />
          <span className={styles.heroBlockB} />
          <span className={styles.heroRoute} />
          <CalendarDays className={styles.heroCalendar} />
        </div>
        <section className={styles.section} aria-labelledby="requirements-title">
          <h1>Создавайте события, которые можно проверить</h1>
          <p className={styles.lead}>Черновик остаётся на устройстве. Публикация возможна только после отдельной проверки данных и прав.</p>
          <h2 id="requirements-title">Что потребуется</h2>
          <ul className={styles.requirementList}>
            {requirements.map((item) => (
              <li key={item.id} data-state={item.met === null ? "unknown" : item.met ? "done" : "missing"}>
                <RequirementIcon met={item.met} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <div className={styles.statusPanel} data-tone={canApply ? "positive" : "neutral"}>
            <ShieldCheck aria-hidden="true" />
            <div><strong>{labels[eligibility]}</strong><span>{applicationEnabled ? "Это не означает автоматическую публикацию." : "Приём заявок сейчас недоступен."}</span></div>
          </div>
          <h2>Как это работает</h2>
          <ol className={styles.stepList}>
            <li><b>1</b><span>Заполните факты о событии</span></li>
            <li><b>2</b><span>Подтвердите право на медиа</span></li>
            <li><b>3</b><span>Отправьте черновик на проверку</span></li>
          </ol>
        </section>
        <div className={styles.stickyBar}>
          <button type="button" className={styles.primaryButton} disabled={!canApply} onClick={() => { onApply?.(); navigate("basic"); }}>
            Подать заявку
          </button>
        </div>
      </>
    );
  }

  function renderBasic() {
    return (
      <form className={styles.form} onSubmit={next}>
        <h1>Расскажите главное</h1>
        <p className={styles.lead}>Только проверяемые сведения. Название можно изменить до отправки.</p>
        <label className={styles.field}>
          <FieldLabel icon={<Pencil aria-hidden="true" />}>Название события</FieldLabel>
          <input value={draft.title} maxLength={100} placeholder="Например, открытая тренировка" onChange={(event) => updateDraft({ title: event.target.value })} required />
          <small>{draft.title.length}/100</small>
        </label>
        <label className={styles.field}>
          <FieldLabel icon={<ChevronDown aria-hidden="true" />}>Категория</FieldLabel>
          <select aria-label="Категория" value={draft.categoryId} onChange={(event) => updateDraft({ categoryId: event.target.value })} required>
            <option value="">Выберите категорию</option>
            <option value="culture">Культура</option>
            <option value="music">Музыка</option>
            <option value="sport">Спорт</option>
            <option value="workshop">Мастер-класс</option>
            <option value="community">Встреча сообщества</option>
          </select>
        </label>
        <label className={styles.field}>
          <FieldLabel icon={<ShieldCheck aria-hidden="true" />}>Организатор</FieldLabel>
          <input value={draft.organizerName} maxLength={80} placeholder="Имя или название организации" onChange={(event) => updateDraft({ organizerName: event.target.value })} required />
        </label>
        <p className={styles.saveState} aria-live="polite"><Check aria-hidden="true" />{formatDraftTime(draft.savedAt, language)}</p>
        <div className={styles.stickyBar}>
          <button type="submit" className={styles.primaryButton} disabled={!basicValid || !onNavigate}>Дальше</button>
        </div>
      </form>
    );
  }

  function renderSchedule() {
    return (
      <form className={styles.form} onSubmit={next}>
        <h1>Когда и где</h1>
        <p className={styles.lead}>Часовой пояс показываем явно. Дата без времени не считается расписанием.</p>
        <div className={styles.twoColumns}>
          <label className={styles.field}>
            <FieldLabel icon={<CalendarDays aria-hidden="true" />}>Дата</FieldLabel>
            <input type="date" min={todayForInput()} value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} required />
          </label>
          <label className={styles.field}>
            <FieldLabel icon={<Clock3 aria-hidden="true" />}>Начало</FieldLabel>
            <input type="time" value={draft.startTime} onChange={(event) => updateDraft({ startTime: event.target.value })} required />
          </label>
        </div>
        <div className={styles.twoColumns}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Окончание</span>
            <input type="time" value={draft.endTime} onChange={(event) => updateDraft({ endTime: event.target.value, durationMinutes: "" })} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Или длительность</span>
            <input type="number" min="15" step="15" inputMode="numeric" value={draft.durationMinutes} placeholder="минут" onChange={(event) => updateDraft({ durationMinutes: event.target.value, endTime: "" })} />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Часовой пояс</span>
          <input value={draft.timeZone} readOnly aria-readonly="true" />
        </label>
        <label className={styles.field}>
          <FieldLabel icon={<MapPin aria-hidden="true" />}>Место проведения</FieldLabel>
          <input value={draft.venueName} maxLength={120} placeholder="Название площадки или адрес" onChange={(event) => updateDraft({ venueName: event.target.value })} required />
        </label>
        <div className={styles.mapFrame}>
          {mapSlot ?? (
            <div className={styles.mapFallback}>
              <MapPin aria-hidden="true" />
              <strong>Карта подключается при интеграции</strong>
              <span>В демо координаты не сохраняются и не выдумываются.</span>
            </div>
          )}
        </div>
        <button type="button" className={styles.secondaryButton} disabled={!onPickPlace} aria-describedby={!onPickPlace ? `${mediaInputId}-map-unavailable` : undefined} onClick={() => onPickPlace?.(draft)}><MapPin aria-hidden="true" />Выбрать место на карте</button>
        {!onPickPlace && <p className={styles.inlineNotice} id={`${mediaInputId}-map-unavailable`}>Выбор на карте пока не подключён. Название площадки или адрес можно ввести вручную.</p>}
        {draft.endTime && draft.startTime && draft.endTime <= draft.startTime && <p className={styles.errorText}><CircleAlert aria-hidden="true" />Окончание должно быть позже начала</p>}
        <div className={styles.stickyBar}>
          <button type="submit" className={styles.primaryButton} disabled={!onNavigate || !scheduleValid || Boolean(draft.endTime && draft.startTime && draft.endTime <= draft.startTime)}>Дальше</button>
        </div>
      </form>
    );
  }

  function renderDetails() {
    const needsMin = draft.priceState === "exact" || draft.priceState === "from" || draft.priceState === "range";
    const needsMax = draft.priceState === "range";
    const languages = ["Русский", "Қазақша", "English"];
    return (
      <form className={styles.form} onSubmit={next}>
        <h1>Условия для посетителя</h1>
        <p className={styles.lead}>Пустая цена не означает бесплатно. Неизвестное отмечается отдельно.</p>
        <fieldset className={styles.fieldset}>
          <legend><WalletCards aria-hidden="true" />Цена</legend>
          <div className={styles.choiceGrid}>
            {PRICE_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={styles.choiceButton} aria-pressed={draft.priceState === option.value} onClick={() => updateDraft({ priceState: option.value, priceMin: "", priceMax: "" })}>
                {option.label}
              </button>
            ))}
          </div>
          {needsMin && (
            <div className={styles.twoColumns}>
              <label className={styles.field}><span className={styles.fieldLabel}>{draft.priceState === "range" ? "От" : "Сумма"}</span><input type="number" min="0" inputMode="numeric" value={draft.priceMin} onChange={(event) => updateDraft({ priceMin: event.target.value })} /></label>
              {needsMax && <label className={styles.field}><span className={styles.fieldLabel}>До</span><input type="number" min={draft.priceMin || "0"} inputMode="numeric" value={draft.priceMax} onChange={(event) => updateDraft({ priceMax: event.target.value })} /></label>}
            </div>
          )}
          {draft.priceState === "unknown" && <p className={styles.inlineNotice}><CircleAlert aria-hidden="true" />В карточке будет написано «Цена не указана».</p>}
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend><Languages aria-hidden="true" />Язык</legend>
          <div className={styles.choiceGrid}>
            {languages.map((language) => {
              const selected = draft.spokenLanguages.includes(language);
              return <button key={language} type="button" className={styles.choiceButton} aria-pressed={selected} onClick={() => updateDraft({ spokenLanguages: selected ? draft.spokenLanguages.filter((item) => item !== language) : [...draft.spokenLanguages, language], languageUnspecified: false })}>{language}</button>;
            })}
            <button type="button" className={styles.choiceButton} aria-pressed={draft.languageUnspecified} onClick={() => updateDraft({ languageUnspecified: true, spokenLanguages: [] })}>Не указан</button>
          </div>
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend><Link aria-hidden="true" />Контакт</legend>
          <div className={styles.segmented}>
            {(["site", "phone", "whatsapp"] as const).map((type) => (
              <button key={type} type="button" aria-pressed={draft.contactType === type} onClick={() => updateDraft({ contactType: type, contactValue: "" })}>{type === "site" ? "Сайт" : type === "phone" ? "Телефон" : "WhatsApp"}</button>
            ))}
          </div>
          <label className={styles.field}>
            <FieldLabel icon={draft.contactType === "site" ? <Globe aria-hidden="true" /> : <Phone aria-hidden="true" />}>{draft.contactType === "site" ? "Ссылка" : "Номер для уточнения"}</FieldLabel>
            <input type={draft.contactType === "site" ? "url" : "tel"} value={draft.contactValue} placeholder={draft.contactType === "site" ? "https://…" : "+7 …"} onChange={(event) => updateDraft({ contactValue: event.target.value })} required />
          </label>
        </fieldset>
        <div className={styles.stickyBar}><button type="submit" className={styles.primaryButton} disabled={!detailsValid || !onNavigate}>Дальше</button></div>
      </form>
    );
  }

  function renderPreview() {
    return (
      <section className={styles.section}>
        <h1>{localDraftOnly ? "Проверьте перед сохранением" : "Проверьте перед отправкой"}</h1>
        <p className={styles.lead}>Это локальный preview. Он не доказывает публикацию, наличие мест или проверку организатора.</p>
        <div className={styles.mediaPanel}>
          {mediaPreviewUrl ? <Image src={mediaPreviewUrl} width={230} height={307} unoptimized alt="Локальный preview загруженного изображения" /> : <div className={styles.mediaFallback}><ImagePlus aria-hidden="true" /><strong>Иллюстрация категории</strong><span>Будет явно помечена как fallback.</span></div>}
          <label htmlFor={mediaInputId} className={styles.uploadButton}><Upload aria-hidden="true" />Загрузить изображение</label>
          <input id={mediaInputId} className={styles.visuallyHidden} type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={handleMedia} />
        </div>
        {draft.mediaFileName && (
          <label className={styles.checkRow}>
            <input type="checkbox" checked={draft.rightsConfirmed} onChange={(event) => updateDraft({ rightsConfirmed: event.target.checked })} />
            <SquareCheckBig aria-hidden="true" />
            <span>У меня есть право использовать это изображение</span>
          </label>
        )}
        <article className={styles.previewCard}>
          <span className={styles.previewMode}>Предпросмотр · {mode}</span>
          <h2 translate={draft.title ? 'no' : undefined}>{draft.title || "Название ещё не заполнено"}</h2>
          <dl>
            <div><dt><CalendarDays aria-hidden="true" />Когда</dt><dd>{occurrenceLabel(draft, language)}</dd></div>
            <div><dt><MapPin aria-hidden="true" />Где</dt><dd translate={draft.venueName ? 'no' : undefined}>{draft.venueName || "Место не указано"}</dd></div>
            <div><dt><WalletCards aria-hidden="true" />Цена</dt><dd>{priceLabel(draft)}</dd></div>
            <div><dt><Languages aria-hidden="true" />Язык</dt><dd>{draft.languageUnspecified ? "Не указан" : draft.spokenLanguages.join(", ") || "Не заполнен"}</dd></div>
            <div><dt><Link aria-hidden="true" />Контакт</dt><dd>{draft.contactValue || "Контакт не заполнен"}</dd></div>
          </dl>
        </article>
        {!previewValid && <p className={styles.errorText}><CircleAlert aria-hidden="true" />Вернитесь к незаполненным полям. Загруженное изображение требует подтверждения прав.</p>}
        {localDraftOnly && <p className={styles.inlineNotice}>Сохранится только текст черновика на этом устройстве. Загруженное изображение доступно для просмотра до закрытия формы и не публикуется.</p>}
        <div className={styles.stickyBar}><button type="button" className={styles.primaryButton} disabled={!previewValid || !(localDraftOnly ? onDraftChange || onNavigate : onSubmitForReview)} onClick={submitForReview}>{localDraftOnly ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}{organizerSubmitBehavior(localDraftOnly).label}</button></div>
      </section>
    );
  }

  function renderModeration() {
    if (localDraftOnly) return <section className={styles.section}><h1>Черновик на устройстве</h1><p className={styles.lead}>Он не опубликован и не отправлен на проверку. Публикация и модерация пока не подключены.</p><button type="button" className={styles.secondaryButton} disabled={!onEdit && !onNavigate} onClick={editDraft}>Продолжить редактирование</button><button type="button" className={styles.secondaryButton} disabled={!onNavigate} onClick={() => navigate("cabinet")}>Мои черновики</button></section>;
    const order: OrganizerModerationStatus[] = ["draft", "submitted", "review", moderation.status === "changes" ? "changes" : "published"];
    const currentIndex = order.indexOf(moderation.status);
    return (
      <section className={styles.section}>
        <h1>Что происходит с черновиком</h1>
        <p className={styles.lead}>Показан локальный сценарий: {moderation.mode}. Он не является подтверждением публикации.</p>
        <div className={styles.currentStatus}>
          <FileClock aria-hidden="true" />
          <div><span>Текущий статус</span><strong>{MODERATION_LABELS[moderation.status]}</strong></div>
        </div>
        <ol className={styles.timeline} aria-label="Этапы проверки">
          {order.map((status, index) => {
            const active = status === moderation.status;
            const done = currentIndex >= 0 && index < currentIndex;
            return <li key={`${status}-${index}`} data-state={active ? "active" : done ? "done" : "pending"}>{done ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}<span>{MODERATION_LABELS[status]}</span></li>;
          })}
        </ol>
        <section className={styles.comments} aria-labelledby="comments-title">
          <h2 id="comments-title"><MessageSquare aria-hidden="true" />Комментарии проверки</h2>
          {moderation.comments.length ? moderation.comments.map((comment, index) => <p key={`${index}-${comment}`}>{comment}</p>) : <p>Комментариев нет. Это не означает, что проверка завершена.</p>}
        </section>
        <div className={styles.actionStack}>
          <button type="button" className={styles.secondaryButton} disabled={!onEdit && !onNavigate} onClick={editDraft}><Pencil aria-hidden="true" />Изменить событие</button>
          <button type="button" className={styles.dangerButton} disabled={!onWithdraw || moderation.status === "withdrawn"} onClick={() => onWithdraw?.(draft.id)}>Отозвать событие</button>
        </div>
      </section>
    );
  }

  function renderCabinet() {
    return (
      <section className={styles.section}>
        <div className={styles.titleRow}>
          <div><h1>Мои события</h1><p>{localDraftOnly ? "Локальные черновики. Публикация пока недоступна." : "Только локальные черновики и демонстрационные статусы."}</p></div>
          <ModeBadge mode={mode} />
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Состояния событий">
          {(localDraftOnly ? ["drafts" as const] : Object.keys(TAB_LABELS) as OrganizerCabinetTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{TAB_LABELS[tab]}</button>)}
        </div>
        <div className={styles.eventList} role="tabpanel">
          {cabinetEvents.length ? cabinetEvents.map((event) => (
            <article className={styles.eventCard} key={event.id}>
              <div className={styles.eventThumb} aria-hidden="true"><CalendarDays /></div>
              <div className={styles.eventBody}>
                <span>{MODERATION_LABELS[event.status]} · {event.mode}</span>
                <h2 translate="no">{event.title}</h2>
                <p>{event.occurrenceLabel ?? "Дата ещё не заполнена"}</p>
                <button type="button" disabled={event.id === draft.id ? !onEdit && !onNavigate : !onOpenEvent} onClick={() => openCabinetEvent(event)}>{localDraftOnly ? "Открыть черновик" : "Открыть событие"}</button>
              </div>
              <button type="button" className={styles.moreButton} aria-label={`Действия: ${event.title}`} disabled={event.id === draft.id ? !onEdit && !onNavigate : !onOpenEvent} onClick={() => openCabinetEvent(event)}><Ellipsis aria-hidden="true" /></button>
            </article>
          )) : (
            <div className={styles.emptyState}>
              <Circle aria-hidden="true" />
              <strong>Здесь пока нет событий</strong>
              <span>Нулевые показатели не показываем: данных ещё нет.</span>
            </div>
          )}
        </div>
        <button type="button" className={styles.fab} aria-label="Создать событие" disabled={!onNavigate} onClick={() => navigate("basic")}><Plus aria-hidden="true" /><span>Создать событие</span></button>
      </section>
    );
  }

  let content: ReactNode;
  if (screen === "eligibility") content = renderEligibility();
  else if (screen === "basic") content = renderBasic();
  else if (screen === "schedule") content = renderSchedule();
  else if (screen === "details") content = renderDetails();
  else if (screen === "preview") content = renderPreview();
  else if (screen === "moderation") content = renderModeration();
  else content = renderCabinet();

  return (
    <Localize><main className={styles.shell} data-screen={screen} data-mode={mode} data-local-draft={localDraftOnly}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.phoneColumn}>
        {renderHeader()}
        <div className={styles.content}>{content}</div>
        <p className={styles.liveRegion} aria-live="polite">{announcement}</p>
      </div>
    </main></Localize>
  );
}
