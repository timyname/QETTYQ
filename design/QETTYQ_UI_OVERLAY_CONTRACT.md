# QETTYQ · контракт кодового UI поверх визуальных ассетов

Версия: 1.0  
Canvas reference: 430 × 932 CSS px  
Назначение: handoff frontend-верстальщику. PNG в `design/generated/app-screens/` — композиционный референс, не готовый UI.

## 1. Непереговорное разделение слоёв

```text
AppShell (code)
├── background gradient/noise (CSS)
├── licensed/category media (raster asset only)
├── map canvas + attribution (provider)
├── semantic content (HTML/React)
├── interactive controls and states (HTML/React/SVG)
├── overlay portal: sheets/dialogs/toasts
└── dock or sticky action bar
```

Запрещено использовать полноэкранный PNG как фон и накладывать невидимые кнопки. Вырезать/перегенерировать только медиа-части. Нарисованные в PNG тексты, skeleton bars, карта, иконки, markers, dock и CTA не переносятся в production.

## 2. Токены

```css
:root {
  --q-canvas: #f4f6f2;
  --q-canvas-cold: #edf3f5;
  --q-surface: #ffffff;
  --q-ink: #101915;
  --q-muted: #68746f;
  --q-line: #dce4df;
  --q-jade: #0b6e5d;
  --q-deep: #0b332d;
  --q-soft: #dcefe8;
  --q-lime: #cffc55;
  --q-warning: #fff2c8;
  --q-danger: #a9343e;
  --q-focus: #175cc2;
  --q-radius-control: 12px;
  --q-radius-panel: 18px;
  --q-radius-card: 28px;
  --q-space: 4px;
  --q-tap-min: 44px;
  --q-dock-h: 72px;
}
```

Основной фон: radial tint не больше 20% alpha + linear `#F4F6F2 → #EDF3F5`. Glass применять только над картой/изображением. Длинный текст — поверхность opacity 92–100%.

## 3. Геометрия shell

На 430 × 932:

- safe top: `env(safe-area-inset-top)`, reference 24 px;
- header: 64 px;
- content: от y≈88 до dock/sticky boundary;
- horizontal padding: 22 px; на ширине ≤390 — 18 px;
- dock outer: inset 16 px, min-height 72 px + safe bottom;
- sticky action bar: bottom `env(safe-area-inset-bottom)`, не перекрывает последний контент; content получает эквивалентный bottom padding.

Нельзя фиксировать экран на 932 px. Использовать `100dvh`, min/max constraints и прокрутку смысловой области.

## 4. Компонентный контракт

### `QButton`

Variants: `primary`, `secondary`, `text`, `danger`, `icon`. Sizes: 44, 48, 56, 64. Состояния обязательны: default, hover, focus-visible, pressed, loading, disabled, success, error. Loading не меняет ширину. Icon-only всегда имеет `aria-label`.

### `BottomDock`

Ровно пять items: `Для тебя`, `Карта`, `Помощник`, `Планы`, `Профиль`. Props: `active`, `hasRealUpdate`, `onNavigate`. Active: jade icon + lime surface 36–40 px, `aria-current=page`. Default route `Планы` ведёт на список/empty (30), не на несуществующий готовый план.

### `PreferenceDeck`

Media 3:4; card reference 342 × 456; нижний scrim 34%; code labels `Идея` + title max 2 lines. Pointer threshold, pointercancel, undo и unique reaction ID. Кнопки `Не сейчас`, `Интересно`, `Отменить последний выбор`, `Уже пробовал` дублируют gesture.

### `CandidateCard`

Один typed component для feed, map sheet и chat. Props включают `candidateId`, entity kind, media provenance, facts, unknowns, source, freshness, route summary. Chat/Map/Feed не создают копии данных. Compact/full variants меняют layout, не факты.

### `MapWorkspace`

Настоящий provider, attribution всегда видима. Overlay controls — search, filters, dates, map/list switch. Marker — SVG/HTML с accessible name. Выбранный marker увеличивается один раз; sheet открывается над картой. При сбое tiles тот же candidate set доступен списком.

### `RouteWorkspace`

Map top 62–66%; code polyline только при `route.mode=network`. `estimated` рисует абстрактный пунктир между точками и badge `Оценка по прямой`, но не road geometry. Breakdown: дорога, ожидание, событие, дорога, запас; неизвестная стоимость остаётся unknown.

### `QSheet` / `QDialog`

Focus trap, inert background, labelled heading, close 44 × 44, Escape/Back closes topmost overlay, focus returns to trigger. Snap positions только если drag имеет button alternative.

### `AssistantThread`

Composer sticky над dock; keyboard не перекрывает input. Condition chips редактируемы. Inline card использует `CandidateCard`. Assistant copy не содержит неподтверждённых фактов; source action видима рядом с результатом.

## 5. Route и overlay map

```text
/                         02 Home
/onboarding/intro         04
/onboarding/interests     05 (06/07 are visual states, not routes)
/onboarding/time          08
/onboarding/budget        09
/onboarding/geography     10
/onboarding/location      12
/discover                 14
/map                      16 or 18 via view param
/event/:id                20
/place/:id                21
/route                    24/25 state
/plan/:id                 26
/assistant                27–29 thread states
/plans                    30
/profile                  32
/sources                  33
/privacy                  34
```

Overlay state:

- 03 city sheet over 02;
- 11 location explanation over 10;
- 17 candidate preview over 16;
- 19 filters over 16/18;
- delete confirmation over 34;
- external handoff confirmation where platform does not make destination obvious.

System Back priority: confirmation → full sheet → preview sheet → route history → previous page. Auto screens 01 and successful 13 use replace and are not Back destinations.

## 6. Экранные контракты P0

### 02 Home

Header 64: wordmark, city button, profile. H1 `Как проведём свободное время?`. Grid 2×2: `Поесть`, `Погулять`, `Заняться чем-то`, `Попробовать новое`; each entire tile is a 44+ target. Composer placeholder `Расскажи, что хочется сегодня`, send accessible label `Отправить`. Bottom: primary `Настроить подборку`, text `Показать на карте`. Dock hidden.

### 04 Intro

Header `Шаг 1 из 2`, action `Пропустить`. H1 `Выбери, что тебе по душе`. Body `Покажем 15 идей. Свайпни вправо, если интересно, и влево — если не сейчас.` 3:4 demo card is decorative (`alt=""`). Primary `Начать 15 выборов`; text `Сразу перейти к карте`. Dock hidden.

### 05 Interests

Header QETTYQ, `N из 15`, `Закрыть`. Deck y≈126, action row below card: 64 `Не сейчас`, 44 undo, 64 `Интересно`; text `Уже пробовал`. Progress uses `aria-valuenow`. After 5 reactions show `Показать варианты сейчас`. While request pending disable actions; on error restore card.

### 08/09/10 Context

Shared step header `Шаг 2 из 2`, Back 44. One expanded section, other sections rows 64. Sticky primary 56. Time copy and presets per audit. Budget distinguishes `Не знаю` from `0 ₸`. Geography has two equal 44+ choices; `Собрать варианты` disabled until origin chosen or manual flow completes.

### 11/12 Location

11 is explanation sheet; system prompt starts only after primary. Denied state stays actionable. 12 map moves under fixed pin, search is real input, reverse-geocode announces result; primary disabled until valid point. Attribution never covered.

### 13 Retrieval

Three stages with text, not percentage. Only active stage animates. `aria-live=polite` announces stage change. `Отменить`; timeout adds `Повторить`. Success replaces with 14; no-results replaces with 42.

### 14 Feed

Header city/date/context. Hero 386 × 500–540: media ~340; DOM facts below. `Почему подходит` generated only from evidence/preferences. Buttons `Подробнее`, `Сохранить`; card tap must not swallow nested buttons. Dock active `Для тебя`.

### 16/17/18/19 Map cluster

16 real map fills workspace; search 330 × 52 + filter 52; dates horizontally scroll; collapsed sheet 156; dock active `Карта`. 17 is sheet state with 96 square media and route fact, not a new raster screen. 18 list uses exact same IDs and filters; rows min 132. 19 full-height sheet; primary count appears only after backend/client calculation, otherwise `Показать варианты`.

### 20/21 Details

Page scrolls. Hero visible 410–440; Back/save/share are code controls. Content overlaps hero by 24 with opaque surface; facts, source, checked-at and unknown warnings are DOM. Sticky actions sit above safe area and do not cover source. 20 uses `Построить маршрут` + contact/ticket; 21 uses route/site/phone only when field exists. Never render inactive fake CTA.

### 24/25/26 Route

Dock hidden. 24: real map top 62–66%, route sheet 270–310, drag handles need accessible move controls. Actions `Сохранить план`, `Открыть навигацию`. While route recalculates: button `Строим маршрут…`, route stale styling, no clickable external navigation. 25: warning surface and `Проверить во внешней карте`; no road polyline. 26: timeline and provider text buttons; provider disabled if URL cannot be built.

### 27/28/29 Assistant

Dock active `Помощник`. 27 H1 `Чем помочь?`; three example prompts; composer. 28 gives one short clarification and answer buttons, not generic reassurance. 29 says how many results and which constraints passed; CandidateCard shares data with feed/map. Actions `На карте`, `В маршрут`, `Источник`.

### 32/33/34 Trust

Dock active `Профиль`. 32 sections: interests, tried, event languages, assistant memory, defaults; no personality score. 33 source rows show mode in human wording and timestamp; external origin is explicit. 34 explains storage/retention; danger button opens dialog. Dialog lists deleted categories and contains `Отмена` + `Удалить данные`; on error dialog remains and gives retry.

### 42/43 Fallbacks

42 names exact binding constraint and one safe relaxation. 43 is component-state library, not four simultaneous production errors. Each failure preserves a usable fallback: map→list, route→estimated, LLM→deterministic, offline→dated snapshot.

## 7. State wording

| Component | Default | Loading | Success | Error |
|---|---|---|---|---|
| Save | `Сохранить` | `Сохраняем…` | `Сохранено` | `Не удалось сохранить. Повторить` |
| Route | `Построить маршрут` | `Строим маршрут…` | `Маршрут готов` | `Маршрут не построен. Показать оценку` |
| Search | `Показать варианты` | `Ищем варианты…` | `Показано N вариантов` | `Не удалось обновить. Показаны данные на …` |
| Reaction | `Интересно` | silent optimistic lock | next card | `Выбор не сохранён. Повторить` |
| Delete | `Удалить данные` | `Удаляем…` | `Данные удалены` | `Не удалось удалить данные. Повторить` |
| Send | `Отправить` | `Отправляем…` | message in thread | `Сообщение не отправлено. Повторить` |

Unknown is not an error and not zero: `Цена не указана`, `Время не подтверждено`, `Наличие мест уточняйте у организатора`.

## 8. Motion contract

- tap: 120–160 ms, scale no lower than .98;
- card return: 220 ms, low-bounce spring;
- card dismiss: 220–280 ms, one reaction;
- screen: 180–240 ms;
- sheet: 260–340 ms;
- marker: 180 ms + one 600 ms ripple;
- network route draw: 650–900 ms once;
- toast remains 4–6 s or user-dismissible.

No infinite glow, badge bounce, auto-scroll or fake loading. Under reduced motion: opacity 120–160 ms, no rotation/ripple/route draw.

## 9. Definition of done for each screen

- no full-screen reference PNG in DOM;
- copy is real text and survives RU/KK/EN length;
- all controls have 44+ target, visible focus and accessible name;
- states default/pressed/loading/disabled/success/error are demonstrable;
- Back/overlay behavior matches section 5;
- data fact exposes source/unknown/freshness as applicable;
- 360×800, 390×844, 430×932 and 200% text inspected;
- keyboard and reduced-motion path works;
- visual regression screenshot is taken from actual code.
