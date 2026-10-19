# A16 · Local memory, native storage, карты и событийные адаптеры

**Дата проверки:** 19 октября 2026 года
**Статус:** browser-local MVP реализован; Expo/iOS, production tiles, routing API и автоматические event feeds — спецификация, не заявленная интеграция.

## 1. Что реализовано в веб-прототипе

- Версионированная запись `qettyq.local-memory.v1` в `localStorage`.
- Профиль хранит только `locale`, `goal`, `minutes`, `budget`, `likedTags`.
- Диалог хранит максимум 24 сообщения по 500 символов; неизвестные поля при чтении отбрасываются.
- Точная геолокация, session token, source credentials и результаты провайдеров в схему не входят.
- Пользователь видит подпись «только в этом браузере» и может удалить память одной кнопкой.
- Чат использует `DeterministicChatAssistant`: извлекает только цель, время и бюджет, не делает сетевых вызовов и не создаёт фактов о местах/событиях.
- Профиль восстанавливает контекст формы после reload. Серверная гостевая сессия остаётся отдельным контуром и не заменяется `localStorage`.

Это удобство на одном устройстве, а не аккаунт, cloud sync или защищённое хранилище.

## 2. Контракт chat assistant

```ts
interface ChatAssistantProvider {
  respond(input: {
    text: string;
    profile: LocalPreferenceProfile;
    history: LocalChatMessage[];
  }): Promise<{
    mode: "deterministic" | "llm";
    reply: string;
    patch: Partial<Pick<LocalPreferenceProfile, "goal" | "minutes" | "budget">>;
    suggestions: string[];
    warnings: string[];
  }>;
}
```

Правила:

1. `patch` — предложение интерфейсу, а не факт о городе.
2. Время, бюджет, admissibility и ranking всегда перепроверяет код.
3. Провайдер не может добавлять POI/event ID, которых нет в evidence.
4. Точный origin/destination, session token и полный профиль не отправляются LLM.
5. При отключённом, недоступном или некорректном LLM используется deterministic provider.
6. Текст ответа явно сообщает режим fallback; он не называется «AI-рекомендацией».

Следующий серверный контракт может принимать только нормализованный `contextPatch` и короткий evidence bundle. Сырой диалог по умолчанию не хранится на сервере.

## 3. Expo/iOS storage

### 3.1. Решение

Для native-клиента рекомендуется Expo React Native development build, а не упаковка текущего сайта в WebView. Причины: MapLibre Native, нормальные жесты карты, foreground geolocation, системные deeplinks и управляемая iOS permission-конфигурация. Expo development build допускает native libraries и custom native configuration: [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

Распределение данных:

| Данные | Native storage | Причина |
|---|---|---|
| Opaque guest session token | `expo-secure-store` | Малое чувствительное значение в Keychain/Keystore |
| `locale`, time/budget, chosen tags, provider preference | AsyncStorage либо SQLite | Несекретная версия профиля, легко удалить |
| Диалог | По умолчанию session memory; opt-in — bounded AsyncStorage/SQLite | Свободный текст может содержать персональные данные |
| Exact current location | Не сохранять | Только runtime context одного расчёта |
| Route geometry/cache | Краткоживущий memory cache | Может раскрывать перемещения и подчиняется terms провайдера |
| API keys/server credentials | Только backend / trusted build setup | Не помещать в bundle, storage, logs |

`expo-secure-store` не использовать как базу большого диалога. В non-sensitive store каждая запись получает `schemaVersion`, `updatedAt`, лимиты и migration. При downgrade/new unknown version — безопасный default без попытки угадать данные.

### 3.2. Lifecycle

```text
cold start
  → read secure session token
  → read non-sensitive profile
  → validate/migrate
  → render restored badge
  → write only after initial read

Delete my data
  → DELETE /api/session/data (если сессия существует)
  → delete SecureStore token
  → delete local profile/dialogue/cache
  → clear in-memory location/context
  → show new guest state
```

Тесты обязательны для corrupted JSON, unknown version, partial write, 24-message cap, reinstall/logout и offline deletion retry. iOS backup/restore behaviour проверяется на выбранной конфигурации; нельзя обещать удаление с другого устройства без аккаунта.

## 4. Геолокация

### Browser

- Запрашивать только по пользовательскому действию «Использовать мою геопозицию» и только в secure context.
- До системного prompt объяснить цель и дать равноправный ручной выбор точки.
- `denied`, `unavailable`, `timeout` и approximate result — самостоятельные состояния, не fatal error.
- Точные координаты не помещать в URL, localStorage, analytics или chat transcript.
- После ухода с route flow очистить runtime coordinate unless user explicitly keeps current context.

### Expo/iOS

- Только `requestForegroundPermissionsAsync` / When In Use; background location для MVP отключена.
- В `Info.plist`/config plugin нужен понятный localized `NSLocationWhenInUseUsageDescription`.
- `Allow Once` и reduced accuracy считаются рабочими режимами; приложение не требует precise location для открытия каталога.
- После denial показывать manual pin/address, а ссылку в Settings — только после явного действия пользователя.

Expo документирует разделение `When In Use` и `Always`, а также временный `Allow Once`: [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/).

## 5. Карта

### 5.1. Provider modes

```ts
type MapMode =
  | { kind: "osm_vector"; styleUrl: string; attribution: string }
  | { kind: "google"; mapId: string; attribution: "provider_rendered" }
  | { kind: "static_fallback"; reason: string };
```

P0 production recommendation: MapLibre Native/GL + OSM-derived vector tiles from a licensed provider or self-hosted service + QETTYQ style JSON. MapLibre RN supports Expo/React Native and requires own production style/tiles: [MapLibre React Native setup](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/). Vector source is TileJSON/MVT, with explicit attribution: [MapLibre VectorSource](https://maplibre.org/maplibre-react-native/docs/components/sources/vector-source/).

Текущий `tile.openstreetmap.org` raster layer остаётся только low-volume prototype fallback. OSMF запрещает bulk/offline prefetch, требует видимую атрибуцию и не даёт SLA: [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/). Production URL не hardcode; tile provider переключается server-controlled config без релиза клиента.

### 5.2. Custom style

- Светлая высококонтрастная подложка; POI basemap приглушены, QETTYQ candidates — отдельный GeoJSON source.
- Layer order: land/water → roads → transit/reference labels → candidate clusters → selected marker → user puck → route overlay.
- Не использовать provider POI icons/labels как доказательство event/price/opening hours.
- Attribution всегда видима и не перекрыта bottom sheet.
- Все marker icons имеют screen-reader label и эквивалент в списке.

### 5.3. Clustering и zoom LOD

MapLibre `GeoJSONSource` поддерживает `cluster`, `clusterRadius`, `clusterMaxZoom` и expansion zoom: [GeoJSONSource](https://maplibre.org/maplibre-react-native/docs/components/sources/geo-json-source/).

| Zoom | Представление |
|---|---|
| `< 10` | Городской overview, aggregate counts, без плотных labels |
| `10–12` | Кластеры по 50 px, цвет по dominant category |
| `12–14` | Меньшие кластеры + priority candidate icons |
| `>= 14` | Индивидуальные pins; title только для selected/высокого приоритета |

Map query выполняется после 250 ms debounce и только для видимого bbox. Ответ максимум 250 features; `bbox`, `zoom`, `filters`, `contextRevision`. Клиент отбрасывает stale response по revision. Cluster tap вычисляет expansion zoom, marker tap открывает preview sheet, repeated tap — detail.

### 5.4. Google boundary

Два допустимых сценария не смешиваются:

1. **Handoff:** `https://www.google.com/maps/dir/?api=1&destination=LAT,LON&travelmode=walking`; ключ не нужен, QETTYQ не получает geometry/ETA. Официальный контракт: [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).
2. **Google provider mode:** отдельная Google map + соответствующие keys, billing, attribution и provider terms. Google Places/Routes content нельзя представлять как собственный OSM dataset или без проверки накладывать на non-Google map.

Нельзя называть handoff «встроенным маршрутом». Текущая прямая дистанция — `estimated`, не pedestrian route.

## 6. Route provider interface

```ts
interface RoutingProvider {
  route(request: {
    mode: "walk";
    origin: Coordinate;
    destination: Coordinate;
    via?: Coordinate[];
  }): Promise<{
    mode: "provider" | "estimated";
    distanceMeters: number | null;
    durationSeconds: number | null;
    geometry: GeoJSON.LineString | null;
    provider: string;
    retrievedAt: string;
    warnings: string[];
  }>;
}
```

Server keys остаются на backend. Request имеет bbox/city validation, rate limit, abort timeout и минимальный field mask. Если provider недоступен, Haversine может дать только distance/time estimate с `geometry=null` и заметным warning; строгая выполнимость по маршруту становится `unknown`, а не `true`.

## 7. Event domain

```ts
type Event = {
  id: string;
  canonicalSourceId: string;
  texts: LocalizedField[];
  category: string;
};

type EventOccurrence = {
  id: string;
  eventId: string;
  venueId: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: "Asia/Almaty";
  status: "scheduled" | "postponed" | "cancelled" | "unknown";
  price: MoneyRange | null;
  contentLanguages: OccurrenceLanguage[];
  evidence: SourceEvidence[];
};
```

Событие без `startAt` не попадает в «сегодня в 19:00». Unknown price не равна free. Content language не выводится из title или языка страницы. Карточка хранит event-specific source URL и `checkedAt`; общая главная страница источника недостаточна для factual claim.

## 8. Source adapter и scheduler

```ts
interface EventSourceAdapter {
  sourceId: string;
  acquisition: "official_api" | "rss" | "ics" | "partner_feed" | "manual_editorial" | "link_only";
  fetch(cursor: SourceCursor | null, signal: AbortSignal): Promise<SourceBatch>;
  normalize(raw: unknown): NormalizedEventCandidate[];
}
```

Adapter включается только если registry содержит:

- legal basis / terms URL;
- разрешённые поля, cache TTL, attribution и media rights;
- owner, contact, schedule, rate limit;
- `enabled=true` после review.

Scheduler:

1. distributed lock `sourceId`;
2. conditional request (`ETag`/`Last-Modified`) если источник поддерживает;
3. validate → normalize → quarantine ambiguous rows;
4. idempotent upsert by `(sourceId, externalId, occurrenceStart)`;
5. mark missing occurrences stale, не удалять мгновенно;
6. exponential backoff + last-good snapshot;
7. metrics без response body/credentials.

### Статусы конкретных источников

| Источник | Допустимый MVP mode | До автоматизации |
|---|---|---|
| Visit Astana | `manual_editorial` / `link_only` | Получить документированный feed/API или письменное разрешение; event-specific URLs; не копировать медиа/длинные тексты |
| Ticketon | `link_only` | Partner feed/договор; цена подтверждается у оператора при переходе |
| Sxodim | `link_only` | Partner feed/письменное разрешение и правила хранения |
| Threads | Официальный Threads API только для разрешённых public/managed profiles | Meta app, access token/scopes, terms; никакого headless login/private endpoints |
| Official venues | `ics`/`rss`/`partner_feed` если опубликованы, иначе manual | Проверить отдельные terms и стабильный идентификатор occurrence |

Robots/CAPTCHA/login restrictions не обходятся. Не использовать DOM scraper как fallback при отсутствии разрешения. Неизвестная лицензия означает `disabled`, а не «можно временно».

## 9. API surface

```text
POST /api/v1/map/query
  body: { bbox, zoom, filters, contextRevision, locale }
  response: { features, truncated, sourceSnapshotAt, requestId }

GET /api/v1/events/:eventId
  response: { event, occurrences, evidence, freshness, unknowns }

POST /api/v1/routes/preview
  body: { origin, destination, mode:"walk", contextRevision }
  response: { route|null, mode, provider, warnings, requestId }

GET /api/v1/sources/status
  response: { sources:[{ id, mode, lastSuccessAt, freshness, warning }] }
```

Coordinates идут в POST body, `Cache-Control: no-store`, не в URL. Ошибки: `VALIDATION_ERROR`, `SESSION_REQUIRED`, `PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `OUTSIDE_SERVICE_AREA`, `STALE_CONTEXT`. Provider failure не превращается в empty results.

## 10. Проверяемые ворота

- Browser memory: reload restore, corrupt payload, cap, delete, cross-tab behaviour.
- Chat: RU/KK/EN examples, ambiguous input, malicious prompt, unsupported facts, no network request.
- Map: attribution visible, 60 fps target on representative iPhone, 250-feature cap, cluster expansion, offline tile error.
- Location: not-asked, allow-once, approximate, denied, timeout, manual fallback.
- Events: timezone/DST fixture, duplicate occurrence, postponed/cancelled, unknown price/language, stale source.
- Providers: 429/5xx/timeout/schema drift, last-good snapshot, no secret/body in logs.
- Delete: server session + browser/native stores + runtime location are all cleared.

## 11. Не сделано

- Expo project и iOS build не созданы.
- MapLibre/vector tile provider не подключён.
- Google Routes/Places, 2GIS API и billing не подключены.
- Visit Astana/Ticketon/Sxodim/venue feeds не согласованы.
- Threads adapter не зарегистрирован и не имеет credentials.
- Current four-event list remains a manually curated snapshot; it is not live coverage.
