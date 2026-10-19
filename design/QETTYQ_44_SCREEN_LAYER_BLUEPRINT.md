# QETTYQ · layer blueprint для 44 artboards

Дата: 20 октября 2026 года  
Статус: production handoff specification; не подтверждение реализованного UI  
Machine-readable twin: `design/qettyq-screen-layers.json`

## 0. Глобальный контракт

- Reference canvas: **430 × 932 CSS px**, mobile-first; фактическая высота через `100dvh` и safe-area env.
- Визуальное наследование: screen 14 — winter pearl, deep jade, один lime state, matte white surfaces, мягкая глубина, restrained liquid glass.
- Dock: **Для тебя / Поиск / Карта / Профиль**. Поиск объединяет direct search и assistant. Gear находится top-right. Plans — через профиль и route/plan context.
- Raster допустим только для rights-safe media/category art. Текст, controls, cards, chips, dock, markers, route, states — DOM/SVG. Карта и network route — provider.
- Unknown никогда не превращается в 0, бесплатно, false, confirmed или available.
- Общие button states: default → hover (pointer devices) → focus-visible → pressed → loading → disabled → success → error.
- Accessibility: Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 0.1. Общие токены

| Token | Value |
|---|---|
| canvas | `#F4F6F2` |
| canvasCold | `#EDF3F5` |
| surface | `#FFFFFF` |
| ink | `#101915` |
| muted | `#68746F` |
| line | `#DCE4DF` |
| jade | `#0B6E5D` |
| deep | `#0B332D` |
| soft | `#DCEFE8` |
| lime | `#CFFC55` |
| warning | `#FFF2C8` |
| danger | `#A9343E` |
| focus | `#175CC2` |

## 01 · Bootstrap

**Purpose:** Восстановить guest session и локальные настройки без рекламной заставки.  
**Route/state:** `/bootstrap → replace` · restoring / delayed / bypass / corrupt-memory fallback  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 20 | brand | brand / DOM + SVG | center x=149,y≈360,w=132 | QETTYQ wordmark and 96px route arc. |
| 30 | status | status / DOM | center,bottom 18–24% | Appears only after 500ms. |
| 80 | bypass | actions / DOM | bottom=safe+24 | Appears after 2s. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| brand | QETTYQ | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| status | Восстанавливаем настройки | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| bypass | Продолжить без восстановления | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| route-arc | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 96px | 2px | route-arc |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| bypass | Продолжить без восстановления | text | 02 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| sessionState | restoring\|ready\|failed | failure opens clean profile; no full-screen crash |
| savedCity | cityId\|null | null routes to city selection |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** route-arc, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Route arc draws once in 450 ms; no infinite spinner.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 02 · Главный экран

**Purpose:** Начать подбор, перейти к поиску или открыть карту.  
**Route/state:** `/` · default / composer-filled  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Wordmark; city button; settings gear only when a profile exists. |
| 20 | hero-copy | content / DOM | x=22,y=112,w=386 | H1. |
| 30 | goal-grid | cards / DOM + raster media | x=22,y≈230,w=386,2×2 | Four 187×132 tiles; radius 28; shadow 0 8 20 rgba(11,51,45,.07). |
| 40 | composer | input / DOM | x=22,h=58 | Search/assistant entry. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Primary onboarding CTA + text map CTA; dock hidden. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Как проведём свободное время? | display | Manrope, system-ui, sans-serif | 38px / 1.02 / 700 | 2 |
| food | Поесть | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| walk | Погулять | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| activity | Заняться чем-то | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| new | Попробовать новое | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| composer | Расскажи, что хочется сегодня | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| setup | Настроить подборку | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| map | Показать на карте | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| location-pin | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать город |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| search | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поиск |
| arrow-right | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Отправить |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| goal-tiles | 1:1 | cover | category illustrations; no real venue claim | CSS category color + SVG symbol |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| city | Астана | secondary | 03 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| settings | Настройки | icon | settings | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| composer-send | Отправить | icon | 27 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| setup | Настроить подборку | primary | 04 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| map | Показать на карте | text | 16 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| selectedCity | cityId | missing opens 03 |
| composerText | string | empty leaves send disabled |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** goal-tiles.
- **SVG:** location-pin, settings, search, arrow-right, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 03 · Выбор города

**Purpose:** Выбрать поддерживаемый город без подмены геолокацией.  
**Route/state:** `overlay on /` · Astana available / Almaty coming-next  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: full-height sheet over screen 02.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 15 | scrim | overlay / CSS | full viewport | rgba(11,51,45,.28); inert background. |
| 20 | sheet | sheet / DOM | x=0,bottom=0,w=430,h≈844 | Radius top 30; glass only at edge, opaque content. |
| 30 | city-cards | cards / DOM + raster media | x=22,y≈170,w=386 | Astana 180h, Almaty 112h. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Continue with selected supported city. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Выбери город | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| astana | Астана | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| almaty | Алматы | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| next | Следующий город | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| location | Текущее местоположение | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| continue | Продолжить с Астаной | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |
| location | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Текущее местоположение |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| astana-strip | 2:1 | cover | generated atmosphere, not factual skyline | CSS color field |
| almaty-strip | 2:1 | cover | generated atmosphere | CSS color field |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| close | Закрыть | icon | 02 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| astana | Астана | secondary | 03:selected | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| almaty | Алматы | secondary | 44 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| continue | Продолжить с Астаной | primary | 02 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| supportedCities | City[] | unsupported city stays disabled |
| deviceCity | cityId\|null | never overrides explicit choice |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** astana-strip, almaty-strip.
- **SVG:** x, location, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 04 · Перед 15 выборами

**Purpose:** Объяснить свайпы как выбор досуга и дать skip.  
**Route/state:** `/onboarding/intro` · default  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Step 1 of 2; Skip right. |
| 20 | copy | content / DOM | x=22,y=112,w=386 | Title + concise explanation. |
| 30 | demo-card | card / DOM + raster | x=65,y≈260,w=300,h=400 | 3:4, radius 30, two blurred cards behind. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Primary start + text map action. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| step | Шаг 1 из 2 | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| skip | Пропустить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| title | Выбери, что тебе по душе | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| body | Покажем 15 идей. Свайпни вправо, если интересно, и влево — если не сейчас. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| start | Начать 15 выборов | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| map | Сразу перейти к карте | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-right | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | arrow-right |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| demo-interest | 3:4 | cover | generated category illustration | abstract CSS/SVG card |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| skip | Пропустить | text | 08 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| start | Начать 15 выборов | primary | 05 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| map | Сразу перейти к карте | text | 16 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| — | — | No factual fields |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** demo-interest.
- **SVG:** arrow-right, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 05 · Свайп — спокойно

**Purpose:** Собрать явные реакции на 15 идей досуга.  
**Route/state:** `/onboarding/interests` · idle card  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Wordmark, progress N/15, close. |
| 20 | deck | cards / DOM + raster media | x=44,y=126,w=342,h=456 | Main 3:4 card; next cards peek 16–24 px; radius 30–32; shadow 0 22 50 rgba(11,51,45,.16). |
| 30 | card-copy | content / DOM | inside card bottom 34% | Gradient scrim, label Idea, title max 2 lines. |
| 40 | reactions | actions / DOM + SVG | below card | X 64, undo 44, heart 64. |
| 50 | progress | status / DOM | above sticky context | Four segments + optional early-results action. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| progress | {{index}} из 15 *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| kind | Идея | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| title | {{interestTitle}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| skip | Не сейчас | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| like | Интересно | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| undo | Отменить последний выбор | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| tried | Уже пробовал | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| early | Показать варианты сейчас | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 28px | 1.8px | Не сейчас |
| undo-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 22px | 1.8px | Отменить последний выбор |
| heart | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 28px | 1.8px | Интересно |
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| interest-art | 3:4 | cover | one of 15 generated category assets; no facts | category color + SVG symbol |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| close | Закрыть | icon | 04 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| skip | Не сейчас | icon | 07 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| undo | Отменить последний выбор | icon | 05:previous | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| like | Интересно | icon | 06 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| tried | Уже пробовал | text | 05:next | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| early | Показать варианты сейчас | text | 08 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until 5 reactions |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| cardId | string | required |
| interestTags | string[] | empty card invalid |
| reactionCount | number | 0 is valid |
| lastReaction | Reaction\|null | null disables undo |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** interest-art.
- **SVG:** x, undo-2, heart, x, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Card follows pointer; max ±7°; return 220 ms; dismiss 220–280 ms; one idempotent reaction.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 06 · Свайп вправо

**Purpose:** Показать подтверждение like до следующей карточки.  
**Route/state:** `state of /onboarding/interests` · like drag threshold passed  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Wordmark left; city/context when relevant; settings gear 44×44 top-right on main app screens. |
| 20 | deck | cards / DOM + same raster as 05 | card translated +96–120px, rotate +6° | No new asset. |
| 30 | stamp | feedback / DOM | card top-left | Lime outline; text code-native. |
| 40 | reactions | actions / DOM + SVG | below card | Heart active briefly. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| stamp | Интересно | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| progress | {{index}} из 15 *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| heart | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 28px | 1.8px | Интересно |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| interest-art | 3:4 | cover | same asset/cardId as 05 | same fallback as 05 |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| like | Интересно | icon | 05:next | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| reaction | like | request failure restores previous card |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** interest-art.
- **SVG:** heart, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Heart scale 1.06→1 once; background cards separate 4 px; then next card.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 07 · Свайп влево

**Purpose:** Показать skip без отрицательного долгосрочного вывода.  
**Route/state:** `state of /onboarding/interests` · skip drag threshold passed  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Wordmark left; city/context when relevant; settings gear 44×44 top-right on main app screens. |
| 20 | deck | cards / DOM + same raster as 05 | card translated −96–120px, rotate −6° | No new asset. |
| 30 | stamp | feedback / DOM | card top-right | Muted grey-green, never danger red. |
| 40 | reactions | actions / DOM + SVG | below card | X active briefly. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| stamp | Не сейчас | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| progress | {{index}} из 15 *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 28px | 1.8px | Не сейчас |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| interest-art | 3:4 | cover | same asset/cardId as 05 | same fallback as 05 |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| skip | Не сейчас | icon | 05:next | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| reaction | skip | skip weight remains 0; request failure restores card |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** interest-art.
- **SVG:** x, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Dismiss 220–280 ms, no red flash; next card enters once.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 08 · Контекст — время

**Purpose:** Задать доступное время и момент старта.  
**Route/state:** `/onboarding/time` · time expanded  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + Step 2 of 2. |
| 20 | form | form / DOM | x=22,y=140,w=386 | Numeric value, slider, presets, now/later segment. |
| 30 | collapsed | cards / DOM | x=22,below form,w=386 | Budget and geography rows 64h. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Next. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| step | Шаг 2 из 2 | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| title | Сколько свободного времени? | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| value | {{availableMinutes}} мин *(dynamic)* | numeric | Manrope, system-ui, sans-serif | 36px / 1 / 700 | 1 |
| now | Сейчас | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| later | Позже | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| budget | Бюджет | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| geo | География | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| next | Дальше | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| clock | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Время |
| calendar | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Позже |
| wallet | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | wallet |
| map-pin | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | map-pin |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 05 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| now | Сейчас | secondary | 08:now | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| later | Позже | secondary | 08:later | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| next | Дальше | primary | 09 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| availableMinutes | 30\|60\|90\|120\|custom | missing disables next |
| startAt | ISO8601\|null | null allowed only for now derived by code |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, clock, calendar, wallet, map-pin, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 09 · Контекст — бюджет

**Purpose:** Различить точный лимит, unknown и подтверждённо бесплатное.  
**Route/state:** `/onboarding/budget` · budget expanded  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + Step 2 of 2. |
| 20 | budget-form | form / DOM | x=22,y=140,w=386 | Amount, presets, unknown/free, basis, party stepper. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Next. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Какой бюджет учитывать? | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| amount | {{budgetDisplay}} *(dynamic)* | numeric | Manrope, system-ui, sans-serif | 36px / 1 / 700 | 1 |
| unknown | Не знаю | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| free | 0 ₸ — только подтверждённо бесплатное | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| person | На человека | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| group | На всех | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| next | Дальше | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| wallet | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | wallet |
| minus | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Уменьшить количество |
| plus | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Увеличить количество |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 08 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| unknown | Не знаю | secondary | 09:unknown | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| free | 0 ₸ | secondary | 09:free | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| next | Дальше | primary | 10 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| budget.maxMinor | number\|null | null means unknown, never zero |
| budget.basis | person\|group | missing defaults must be confirmed |
| partySize | integer | minimum 1 |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, wallet, minus, plus, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 10 · Контекст — география

**Purpose:** Выбрать origin и optional destination/return.  
**Route/state:** `/onboarding/geography` · origin missing / chosen  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + context progress. |
| 20 | geo-form | form / DOM | x=22,y≈220,w=386 | Two origin choices, point B, return toggle. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Build options; disabled until origin valid. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Откуда начинаем? | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| location | Моя геопозиция | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| manual | Указать вручную | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| destination | Добавить точку B | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| return | Вернуться сюда | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| submit | Собрать варианты | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| navigation | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Моя геопозиция |
| map-pin | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Указать вручную |
| plus | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | plus |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 09 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| location | Моя геопозиция | secondary | 11 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| manual | Указать вручную | secondary | 12 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| destination | Добавить точку B | text | 12?mode=destination | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| submit | Собрать варианты | primary | 13 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until valid origin |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| origin | Coordinates\|null | null disables submit |
| destination | Coordinates\|null | null allowed |
| returnToOrigin | boolean | false is explicit |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, navigation, map-pin, plus, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 11 · Запрос геолокации

**Purpose:** Объяснить location use до системного permission.  
**Route/state:** `overlay on /onboarding/geography` · pre-permission / requesting / denied  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: bottom sheet; browser prompt only after primary.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | map-underlay | map / map provider | full content | Dimmed real map, no user marker; attribution visible. |
| 15 | scrim | overlay / CSS | full | Background inert. |
| 20 | permission-sheet | sheet / DOM | x=22,bottom=safe,w=386,h=420–500 | Opaque 94–100%, radius 30. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Two actions inside sheet. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Разрешить геолокацию? | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| body | Точка нужна только для расчёта маршрута. Разрешение запрашивает браузер. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| allow | Разрешить один раз | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| manual | Указать вручную | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| denied | Доступ не предоставлен. Можно указать точку вручную. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| location | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 48px | 1.8px | Геолокация |
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| close | Закрыть | icon | 10 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| allow | Разрешить один раз | primary | browser-permission | system | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| manual | Указать вручную | secondary | 12 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| permissionState | prompt\|granted\|denied\|unavailable | denied is not error dead-end |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** location, x, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** map-underlay.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Locate icon pulses once after 800 ms; no pulse after response.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 12 · Ручной выбор точки

**Purpose:** Выбрать origin/destination без геолокации.  
**Route/state:** `/onboarding/location` · moving / geocoding / valid / error  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | map | map / map provider | 0,0,430,≈700 | Interactive map + attribution. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + search input 386×52. |
| 30 | fixed-pin | marker / SVG + DOM | viewport center | Map moves under pin. |
| 40 | point-sheet | sheet / DOM | bottom=0,h≈156 | Selected label + primary action. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| search | Найти адрес или место | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| title | Укажи точку старта | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| selected | {{selectedPointLabel}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| use | Использовать эту точку | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| error | Не удалось определить адрес. Переместите карту или повторите. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| search | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поиск |
| map-pin | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 36px | 1.8px | Выбранная точка |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 10 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| use | Использовать эту точку | primary | 13 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until valid coordinates |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| coordinates | Coordinates\|null | null disables use |
| displayLabel | string\|null | fallback: Координаты выбраны, адрес не определён |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, search, map-pin, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** map.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Pin rises while moving and settles 4 px after debounce; announce resolved label.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 13 · Поиск и проверка

**Purpose:** Показать реальные стадии retrieval, constraints and ranking.  
**Route/state:** `/searching` · stage active / timeout / no-results / success  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 20 | progress-flow | status / DOM + SVG | center,w=320–380 | Three stages connected by route line; done/active/pending. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Cancel; retry only after timeout/error. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Подбираем варианты | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| stage1 | Проверяем источники | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| stage2 | Считаем время и путь | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| stage3 | Сверяем условия | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| cancel | Отменить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| retry | Повторить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| check | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Готово |
| loader | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выполняется |
| circle | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Ожидает |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| cancel | Отменить | text | 10 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| retry | Повторить | secondary | 13 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| stage | sources\|route\|constraints | missing uses generic loading copy |
| requestId | string | never show raw ID |
| errorCode | typed\|null | show actionable copy |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** check, loader, circle, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Only active stage has moving point; no fake percentage; success replace→14, empty replace→42.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 14 · Персональная лента

**Purpose:** Показать grounded candidates and why they fit.  
**Route/state:** `/discover` · loaded / refreshing / save-state  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Для тебя`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Wordmark; city; settings gear top-right. |
| 20 | context-rail | chips / DOM | x=22,y=88,w=386,h=48 | Time, budget, geography, edit. |
| 30 | heading | content / DOM | x=22,y≈140 | H1 For you. |
| 40 | hero-card | card / DOM + raster media | x=22,y≈174,w=386,h=500–540 | Media 320–350 + factual content; radius 28; shadow 0 22 50 rgba(11,51,45,.16). |
| 50 | more-row | cards / DOM + raster media | below hero | Horizontal 224–248 cards. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Для тебя; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Для тебя | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| edit | Изменить условия | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| candidate | {{candidate.title}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| why-label | Почему подходит | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| why | {{candidate.why}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| details | Подробнее | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| save | Сохранить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| map | На карте | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| more | Ещё по вашему настроению | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| location | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать город |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| bookmark | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранить |
| map | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | На карте |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| hero-media | 3:4 source, displayed ≈386×340 | cover | licensed photo or labelled category illustration | category illustration |
| more-media | 1:1 | cover | same candidate provenance | category color + SVG |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| city | Астана | secondary | 03 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| settings | Настройки | icon | profile/settings | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| edit | Изменить условия | text | 08 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| details | Подробнее | primary | 20\|21 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| save | Сохранить | icon | save(candidateId) | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| map | На карте | text | 17 | push+overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| candidateId | string | required |
| title | string | missing excludes candidate |
| price | typed state | unknown → Цена не указана |
| occurrence | typed\|null | null never shown as scheduled event |
| source.checkedAt | ISO\|null | null → Время проверки не указано |
| why | string[] | empty hides reason block |

Unknown rules: Наличие мест уточняйте у организатора. Цена не указана. Расписание не подтверждено.

### Rendering, responsive, motion and a11y

- **Raster:** hero-media, more-media.
- **SVG:** location, settings, bookmark, map, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 15 · Лента — нужно уточнить

**Purpose:** Показать допустимый candidate с существенным unknown без false certainty.  
**Route/state:** `variant of /discover` · uncertain bucket  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Для тебя`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Wordmark left; city/context when relevant; settings gear 44×44 top-right on main app screens. |
| 20 | warning-intro | status / DOM | x=22,y≈100,w=386 | Warning-soft #FFF2C8; not error red. |
| 30 | uncertain-cards | cards / DOM + reused media | x=22,below intro,w=386 | Each card names exactly one unknown. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Для тебя; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Можно рассмотреть, но нужно уточнить | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| price | Цена не указана | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| availability | Наличие мест уточняйте у организатора | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| schedule | Расписание не подтверждено | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| details | Подробнее | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| circle-help | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Нужно уточнить |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| candidate-media | same as candidate | cover | same provenance as feed candidate | category illustration |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| details | Подробнее | primary | 20\|21 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| warnings | typed warning[] | empty candidate belongs in regular bucket |
| unknownFields | string[] | render exact unknown only |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** candidate-media.
- **SVG:** circle-help, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 16 · Карта — обзор

**Purpose:** Исследовать тот же candidate set spatially.  
**Route/state:** `/map` · overview / loading tiles / list fallback  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Карта`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | map | map / map provider | full area behind controls | Real provider; attribution visible and not covered. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Search 330×52; filter 52×52; settings gear within overflow/header only if space. |
| 20 | date-chips | chips / DOM | x=22,y≈152,h=44 | Horizontally scrollable dates. |
| 30 | markers | markers / DOM + SVG over provider | map coordinates | Events/places/attractions/clusters. |
| 50 | collapsed-sheet | sheet / DOM | bottom=dock+safe,w=430,h=156 | Map/List segment + selected summary or nearby count. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Карта; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| search | Событие или место | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| map | Карта | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| list | Список | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| filters | Фильтры | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| attribution | {{providerAttribution}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| search | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поиск |
| sliders-horizontal | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Фильтры |
| calendar | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать дату |
| map | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Карта |
| list | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Список |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| search | Поиск | secondary | 27 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| filters | Фильтры | icon | 19 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| marker | Выбрать событие | icon | 17 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| list | Список | secondary | 18 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| candidates | Candidate[] | empty routes 42 |
| coordinates | Coordinates | missing candidate omitted from map but may remain list |
| providerAttribution | string | required |

Unknown rules: Unknown facts appear only in preview; marker does not imply availability.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** search, sliders-horizontal, calendar, map, list, settings, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** map, markers.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 17 · Карта — выбранный кандидат

**Purpose:** Preview candidate while preserving map context.  
**Route/state:** `overlay on /map` · selected marker / sheet preview  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock да, active `Карта`; overlay: preview sheet over screen 16.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | map-parent | map / map provider | full | Same map/candidate set as 16. |
| 20 | selected-marker | marker / SVG + DOM | at coordinates | 44×52 + lime halo 64; one ripple. |
| 40 | preview-sheet | sheet / DOM + raster media | bottom=dock+safe,h=220–260 | 96×96 media, facts, actions; attribution remains visible. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Карта; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | {{candidate.title}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| time | {{occurrenceOrHours}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| price | {{priceDisplay}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| language | {{languageDisplay}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| walk | {{routeDisplay}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| details | Подробнее | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| add | Добавить в маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| plus | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Добавить в маршрут |
| bookmark | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранить |
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| preview-media | 1:1 | cover | candidate media provenance | category placeholder |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| close | Закрыть | icon | 16 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| details | Подробнее | primary | 20\|21 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| add | Добавить в маршрут | icon | 24 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| save | Сохранить | icon | save(candidateId) | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| candidateId | string | required |
| routeSummary | network\|estimated\|null | null → Время в пути не рассчитано |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** preview-media.
- **SVG:** plus, bookmark, x, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** map-parent.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Marker scale 180 ms + one 600 ms ripple; map pans to keep marker above sheet.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 18 · Карта как список

**Purpose:** Accessible list parity and map-provider fallback.  
**Route/state:** `/map?view=list` · list / loading / fallback  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Карта`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Same search/filter/date context as map. |
| 20 | view-switch | segmented / DOM | x=22,y≈100 | Map/List, no reset. |
| 30 | candidate-list | list / DOM + raster media | x=22,below controls,w=386 | Rows min 132, image 112 square. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Карта; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Рядом с вами | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| map | Карта | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| list | Список | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| candidate | {{candidate.title}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| details | Подробнее | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| map | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Карта |
| list | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Список |
| sliders-horizontal | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Фильтры |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| row-media | 1:1 | cover | same entity media as map/feed | category placeholder |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| map | Карта | secondary | 16 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| filters | Фильтры | icon | 19 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| candidate | Подробнее | secondary | 20\|21 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| candidateIds | string[] | must equal current map result set |
| selectedCandidateId | string\|null | null allowed |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** row-media.
- **SVG:** map, list, sliders-horizontal, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 19 · Фильтры

**Purpose:** Edit filters and return calculated result count.  
**Route/state:** `overlay on /map or /discover` · dirty / recalculating / ready / error  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock да, active `Карта`; overlay: near-full-height modal sheet; background inert.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 15 | scrim | overlay / CSS | full | Dim parent. |
| 20 | filter-sheet | sheet / DOM | x=0,bottom=0,w=430,h≈880 | Radius top 30; scroll body. |
| 30 | filter-groups | form / DOM | x=22,w=386 | Date, category, price, language, route, accessibility, hide attractions. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Show calculated options + Reset. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Карта; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Фильтры | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| date | Дата | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| category | Категория | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| price | Цена | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| language | Язык | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| route | Путь | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| access | Доступность | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| hide | Скрыть достопримечательности | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| show | Показать {{count}} вариантов *(dynamic)* | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| reset | Сбросить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |
| check | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | check |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| close | Закрыть | icon | parent | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| show | Показать варианты | primary | 16\|18 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until count calculated |
| reset | Сбросить | text | 19:defaults | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| filters | FilterState | missing group uses explicit default |
| resultCount | number\|null | null → label Показать варианты, not fake number |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** x, check, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 20 · Детали события

**Purpose:** Show sourced occurrence facts, unknowns and next actions.  
**Route/state:** `/event/:id` · loaded / stale / external-handoff  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Для тебя`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | hero | media / raster in DOM | x=0,y=0,w=430,h=410–440 | 3:4 crop; licensed or category illustration. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back, save, share floating code controls; settings not duplicated. |
| 30 | detail-surface | content / DOM | x=0,y≈416,w=430 | Opaque white, radius top 30, overlaps hero 24; scroll. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Route + external contact/ticket above dock or hide dock consistently. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Для тебя; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | {{event.title}} *(dynamic)* | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| facts | {{eventFacts}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| why | Почему подходит | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| unknown | {{warning}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| source | Источник и время проверки | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| route | Построить маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| contact | Связаться с организатором | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| tickets | Открыть билеты | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| bookmark | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранить |
| share-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поделиться |
| navigation | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Построить маршрут |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть внешний сайт |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| event-hero | 3:4 | cover with focal point | licensed event image or labelled category illustration | category illustration |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | parent | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| save | Сохранить | icon | save(eventId) | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| share | Поделиться | icon | system-share | system | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| route | Построить маршрут | primary | 24 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| external | Открыть внешний источник | secondary | external-url | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| occurrence.startAt | ISO\|null | null → Расписание не подтверждено |
| price | typed | unknown rendered |
| languages | string[] | empty → Язык не указан |
| source | Evidence | required for factual event |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** event-hero.
- **SVG:** arrow-left, bookmark, share-2, navigation, external-link, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 21 · Детали места

**Purpose:** Separate permanent place from scheduled event.  
**Route/state:** `/place/:id` · loaded / schedule-unconfirmed  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Для тебя`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | hero | media / raster in DOM | x=0,y=0,w=430,h=410–440 | Licensed place image or honest category illustration. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back/save/share. |
| 30 | detail-surface | content / DOM | below hero,scroll | Hours/address/source; activity schedule separate. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Route/site/phone only when field exists. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Для тебя; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | {{place.title}} *(dynamic)* | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| hours | {{hoursStatus}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| schedule | Расписание занятий не подтверждено | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| coords | Источник координат | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| route | Построить маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| site | Открыть сайт | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| phone | Позвонить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| bookmark | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранить |
| share-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поделиться |
| navigation | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Маршрут |
| phone | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Позвонить |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть сайт |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| place-hero | 3:4 | cover | licensed real photo or labelled category illustration | category illustration |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | parent | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| route | Построить маршрут | primary | 24 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| site | Открыть сайт | secondary | external-url | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| phone | Позвонить | secondary | tel-url | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| openingHours | structured\|null | null → Часы работы не указаны |
| activitySchedule | structured\|null | null never converted to session |
| coordinatesSource | Evidence | required |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** place-hero.
- **SVG:** arrow-left, bookmark, share-2, navigation, phone, external-link, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 22 · Кино — список сеансов

**Purpose:** Browse sourced sessions by language and time.  
**Route/state:** `/search/cinema` · list / poster fallback / empty  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Поиск`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back/title/settings gear. |
| 20 | language-filters | chips / DOM | x=22,y≈100,h=44 | RU/KK/EN; clarify audio/subtitles. |
| 30 | session-list | list / DOM + optional raster poster | x=22,below filters,w=386 | Rows 168h; poster 108×144; time chips. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Поиск; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Кино сегодня | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| ru | RU | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| kk | KK | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| en | EN | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| audio-note | Язык звука и субтитры указаны отдельно | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| film | {{film.title}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| session | {{session.time}} *(dynamic)* | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| price | {{priceDisplay}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| sliders-horizontal | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Фильтры |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| poster | 3:4 | cover | licensed poster only | generated abstract posterless art; title remains DOM |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 27 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| session | Открыть сеанс | secondary | 23 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| sessions | Session[] | empty → no-results |
| audioLanguage | locale\|null | null → Язык звука не указан |
| subtitleLanguages | locale[] | empty distinct from unknown by source schema |
| price | typed | unknown rendered |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** poster.
- **SVG:** arrow-left, sliders-horizontal, settings, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 23 · Кино — детали сеанса

**Purpose:** Show exact sourced cinema occurrence and external tickets.  
**Route/state:** `/cinema/session/:id` · loaded / stale / cancelled  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Поиск`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | poster | media / raster in DOM | x=22,y≈88,w≈250,h=300–340 visible | Licensed poster or posterless fallback. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back/save/settings. |
| 30 | session-facts | content / DOM | below poster,scroll | Film, cinema, hall, exact time, audio, subtitles, age, price, checked-at. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Route + external tickets. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Поиск; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| film | {{film.title}} *(dynamic)* | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| original | {{film.originalTitle}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| facts | {{sessionFacts}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| checked | Проверено {{checkedAt}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| route | Построить маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| tickets | Открыть билеты | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| bookmark | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранить |
| navigation | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Маршрут |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть билеты |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| poster | 3:4 | contain/cover by rights-safe source | licensed poster | same fallback as 22 |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 22 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| route | Построить маршрут | primary | 24 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| tickets | Открыть билеты | secondary | external-url | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| session.startAt | ISO | missing invalidates session |
| session.status | scheduled\|cancelled\|unknown | cancelled disables ticket CTA |
| source.checkedAt | ISO\|null | null → Время проверки не указано |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** poster.
- **SVG:** arrow-left, bookmark, navigation, external-link, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 24 · Конструктор маршрута — network

**Purpose:** Assemble A→candidate(s)→B using a network route.  
**Route/state:** `/route` · network ready / recalculating / save-state  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | map | map / map provider | top 62–66% | Real map + attribution. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back only; optional locate. |
| 20 | route-line | route / provider geometry + SVG style | on map | Jade 4px + lime halo 9px; arrows long segments. |
| 30 | route-points | markers / DOM + SVG | provider coordinates | A,1,2,B 36–44. |
| 40 | route-sheet | sheet / DOM | bottom=0,h=270–310+actions | Breakdown + accessible reorder. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Save plan + Open navigation; no dock. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | План маршрута | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| summary | {{routeDuration}} · {{routeCost}} *(dynamic)* | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| save | Сохранить план | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| navigation | Открыть навигацию | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| recalc | Строим маршрут… | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| grip-vertical | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Изменить порядок |
| bookmark | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранить план |
| navigation | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть навигацию |
| ellipsis | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Действия остановки |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | parent | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| save | Сохранить план | secondary | 26\|30 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| navigation | Открыть навигацию | primary | external-provider | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until route ready |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| route.mode | network | estimated routes use 25 |
| geometry | polyline | missing forbids road line |
| segments | RouteSegment[] | missing segment invalidates total |
| totalCost | Money\|null | null → Стоимость не рассчитана |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, grip-vertical, bookmark, navigation, ellipsis, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** map, route-line.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Provider geometry draws once 650–900 ms after ready; stop scale .86→1; no redraw loop.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 25 · Конструктор маршрута — estimated

**Purpose:** Honest fallback when routing provider is unavailable.  
**Route/state:** `/route?mode=estimated` · estimated  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | map | map / map provider or neutral grid | top 62–66% | No road polyline claim. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back. |
| 20 | estimated-link | route / SVG | between points | Thin dashed abstract connection only. |
| 30 | warning | status / DOM | route sheet top | Warning-soft badge. |
| 40 | route-sheet | sheet / DOM | bottom=0 | Straight-line estimate + limitations. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | External map check + edit. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Маршрут пока приблизительный | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| badge | Оценка по прямой | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| body | Дорожный маршрут недоступен. Проверьте время во внешней карте. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| external | Проверить во внешней карте | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| edit | Изменить маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| triangle-alert | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Приблизительная оценка |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть внешнюю карту |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | parent | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| external | Проверить во внешней карте | primary | external-provider | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| edit | Изменить маршрут | secondary | 24 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| straightDistanceMeters | number\|null | null → Расстояние не рассчитано |
| estimatedMinutes | number\|null | null → Время не рассчитано |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, triangle-alert, external-link, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** map.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 26 · Готовый план

**Purpose:** Summarize route, activity, waiting, buffer and handoff.  
**Route/state:** `/plan/:id` · saved/unsaved / active-step / stale  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back, share, settings optional. |
| 20 | summary | card / DOM | x=22,y≈100,w=386,h=96 | Total time/cost/status. |
| 30 | timeline | timeline / DOM + SVG | x=22,below summary,w=386 | Travel→wait→event→travel→buffer. |
| 40 | provider-actions | actions / DOM | below timeline | Text buttons; no homemade logos. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Open navigation + Edit route. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | План готов | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| summary | {{planSummary}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| navigation | Открыть навигацию | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| edit | Изменить маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| share | Поделиться | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| saved | Сохранено | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| share-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поделиться |
| navigation | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть навигацию |
| pencil | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Изменить маршрут |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | parent | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| navigation | Открыть навигацию | primary | external-provider | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| edit | Изменить маршрут | secondary | 24 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| share | Поделиться | secondary | 31 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| plan.segments | PlanSegment[] | empty invalid |
| plan.savedAt | ISO\|null | null → not saved |
| plan.stale | boolean | true shows refresh warning |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, share-2, navigation, pencil, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 27 · Поиск — пустой старт

**Purpose:** Unified text search and assistant entry.  
**Route/state:** `/search` · empty / draft  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Поиск`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Title + data mode human label + settings gear. |
| 20 | intro | content / DOM + SVG | x=22,y≈110,w=386 | Short task heading; optional route arc. |
| 30 | examples | cards / DOM | x=22,center,w=386 | Three prompt buttons, not chat bubbles. |
| 70 | composer | input / DOM | x=22,bottom=dock+safe+12,w=386,h=58 | Sticky above dock/keyboard. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Поиск; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Что найдём? | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| p1 | Что сегодня вечером? | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| p2 | Кино на английском | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| p3 | Маршрут на два часа | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| placeholder | Событие, место или план | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| mode | {{dataModeLabel}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| search | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поиск |
| send | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Отправить |
| route-arc | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | route-arc |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| settings | Настройки | icon | profile/settings | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| p1 | Что сегодня вечером? | secondary | 28 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| p2 | Кино на английском | secondary | 28 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| p3 | Маршрут на два часа | secondary | 28 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| send | Отправить | icon | 28 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until non-empty query |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| query | string | empty disables send |
| dataMode | live\|snapshot\|deterministic | missing → Режим данных не указан |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** settings, search, send, route-arc, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 28 · Поиск — уточнение

**Purpose:** Ask only for a missing constraint before retrieval.  
**Route/state:** `/search?state=clarify` · clarification  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Поиск`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Search title + settings. |
| 20 | thread | thread / DOM | x=22,y≈100,w=386 | User message + one concise assistant question. |
| 30 | conditions | chips / DOM | inside thread | Editable time/budget/language. |
| 40 | answers | actions / DOM | x=22,w=386 | Full-width options. |
| 70 | composer | input / DOM | above dock | Sticky composer. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Поиск; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| user | {{query}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| assistant | Уточню один параметр, чтобы не показать неподходящее. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| question | {{clarifyingQuestion}} *(dynamic)* | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| change | Изменить условия | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| send | Отправить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| pencil | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Изменить условия |
| send | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Отправить |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| answer | {{answerLabel}} | secondary | 29 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| change | Изменить условия | text | 08\|09\|10 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| send | Отправить | icon | 29 | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| query | string | required |
| conditions | Condition[] | unknown chip is editable, not silently assumed |
| clarification | typed\|null | null proceeds 29 |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** settings, pencil, send, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 29 · Поиск — результаты

**Purpose:** Show grounded candidate cards inside unified search thread.  
**Route/state:** `/search?state=results` · results / no-results / provider-fallback  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Поиск`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Search title + save thread/settings. |
| 20 | thread-summary | content / DOM | x=22,y≈100,w=386 | Short grounded explanation + condition chips. |
| 30 | inline-card | card / DOM + reused raster media | x=46,w=338,h≈420 | Same CandidateCard data as feed. |
| 40 | alternatives | cards / DOM + reused media | below main card | Two compact alternatives. |
| 70 | composer | input / DOM | above dock | Sticky. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Поиск; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| summary | Нашёл {{count}} вариантов по вашим условиям. *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| candidate | {{candidate.title}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| map | На карте | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| route | В маршрут | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| source | Источник | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| details | Подробнее | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| map | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | На карте |
| route | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Добавить в маршрут |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Источник |
| send | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Отправить |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| inline-candidate-media | 4:3 or 3:4, max-h 250 | cover | same candidate media/provenance as feed | category illustration |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| map | На карте | primary | 17 | push+overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| route | В маршрут | secondary | 24 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| source | Источник | text | external-url | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| details | Подробнее | text | 20\|21 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| candidates | Candidate[] | empty →42 |
| count | number | must equal rendered candidates |
| explanation | grounded string | missing → deterministic summary |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** inline-candidate-media.
- **SVG:** settings, map, route, external-link, send, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 30 · Сохранённые планы

**Purpose:** Open saved and stale plans from profile.  
**Route/state:** `/plans` · list / empty / stale / refreshing  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Профиль`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back/Profile context + settings. |
| 20 | plan-list | list / DOM + reused media | x=22,y≈110,w=386 | Cards 148–176; stale warning strip. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Профиль; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Планы | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| plan | {{plan.title}} *(dynamic)* | cardTitle | Manrope, system-ui, sans-serif | 24px / 1.12 / 700 | 2 |
| date | {{plan.date}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| total | {{plan.total}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| open | Открыть | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| refresh | Обновить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| share | Поделиться | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| empty | Сохранённых планов пока нет | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| first | Собрать первый план | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| refresh-cw | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Обновить |
| share-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поделиться |
| ellipsis | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Другие действия |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| plan-thumb | 1:1 | cover | reused saved candidate media | route SVG thumbnail |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 32 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| open | Открыть | primary | 26 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| refresh | Обновить | secondary | 30:refresh | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| share | Поделиться | icon | 31 | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| first | Собрать первый план | primary | 14 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| plans | Plan[] | empty shows honest state |
| stale | boolean | true shows dated warning, never auto-updates silently |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** plan-thumb.
- **SVG:** arrow-left, refresh-cw, share-2, ellipsis, settings, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 31 · Поделиться маршрутом

**Purpose:** Create privacy-safe share link.  
**Route/state:** `overlay on /plan/:id` · configure / copying / copied / error  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: bottom sheet over plan.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 15 | scrim | overlay / CSS | full | Parent inert. |
| 20 | share-sheet | sheet / DOM | bottom=0,w=430 | Summary, privacy toggles, expiry, actions. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Поделиться маршрутом | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| privacy | Точная стартовая точка не войдёт в ссылку | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| expiry | Срок действия ссылки | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| copy | Скопировать ссылку | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| share | Поделиться | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| copied | Ссылка скопирована | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |
| copy | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Скопировать ссылку |
| share-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Поделиться |
| check | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Скопировано |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| close | Закрыть | icon | 26 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| copy | Скопировать ссылку | primary | clipboard | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| share | Поделиться | secondary | system-share | system | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| shareUrl | URL\|null | null disables actions |
| expiresAt | ISO | missing requires user choice |
| includeExactOrigin | false | must remain false for public link |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** x, copy, share-2, check, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Copy icon morphs to check for 1.5s; no confetti.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 32 · Профиль и память

**Purpose:** Explain and control preferences, memory, plans and privacy.  
**Route/state:** `/profile` · guest / local-storage / edits  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Профиль`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Profile title + settings gear top-right. |
| 20 | profile-summary | card / DOM | x=22,y≈100,w=386 | Guest/account and storage badge. |
| 30 | sections | content / DOM + reused raster thumbs | x=22,below summary,w=386,scroll | Interests, tried, languages, memory, defaults, Plans entry, Sources, Privacy. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Профиль; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Профиль | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| guest | Гость | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| local | Сохранено локально | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| interests | Интересы | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| tried | Уже пробовали | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| languages | Языки мероприятий | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| memory | Память помощника | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| defaults | Время и бюджет | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| plans | Планы | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| sources | Источники данных | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| privacy | Приватность и данные | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| pencil | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Изменить |
| database | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Хранилище |
| calendar | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Планы |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Источники |
| shield | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Приватность |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| tried-thumbs | 1:1 | cover | same previously viewed candidate provenance | category placeholder |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| settings | Настройки | icon | profile/settings | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| edit | Изменить | secondary | profile/edit | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| plans | Планы | secondary | 30 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| sources | Источники данных | secondary | 33 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| privacy | Приватность и данные | secondary | 34 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| storageMode | local\|account | unknown → Хранилище не определено |
| interests | Tag[] | empty → Интересы ещё не выбраны |
| memorySummary | string\|null | null hides summary, never invents profile |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** tried-thumbs.
- **SVG:** settings, pencil, database, calendar, external-link, shield, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 33 · Источники

**Purpose:** Expose provenance, data mode, freshness and coverage.  
**Route/state:** `/sources` · loaded / source unavailable  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Профиль`; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + title + settings. |
| 20 | provider-summary | card / DOM | x=22,y≈100,w=386 | Map/route/event source summary. |
| 30 | source-list | list / DOM | x=22,below summary,w=386 | Rows with name, mode, checked-at, coverage, link. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Профиль; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Источники данных | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| map | Карта | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| route | Маршруты | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| events | События | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| mode | {{sourceModeLabel}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| checked | Проверено {{checkedAt}} *(dynamic)* | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| open | Открыть источник | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| external-link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Открыть источник |
| circle-check | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Доступен |
| triangle-alert | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Ограничение |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 32 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| open | Открыть источник | text | external-url | external | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| sources | SourceStatus[] | empty → Источники не настроены |
| checkedAt | ISO\|null | null → Время проверки не указано |
| mode | live\|snapshot\|link_only | never display snapshot as live |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, settings, external-link, circle-check, triangle-alert, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 34 · Приватность и удаление

**Purpose:** Explain storage/transfers/retention and allow deletion.  
**Route/state:** `/privacy` · default / confirmation / deleting / error / deleted  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…838; scroll content gets ≥110px bottom padding; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock да, active `Профиль`; overlay: delete confirmation when invoked.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + title + settings. |
| 20 | privacy-blocks | content / DOM | x=22,y≈100,w=386 | Stored / not stored / provider / retention. |
| 30 | danger-zone | card / DOM | x=22,below content,w=386 | White button with danger text. |
| 70 | confirmation | dialog / DOM | center or bottom sheet | Only when triggered; focus trap. |
| 90 | bottom-dock | navigation / DOM + SVG | x=16,bottom=safeBottom,w=398,h=72+safeBottom | Four items; active=Профиль; style inherits screen 14. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Приватность и данные | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| stored | Что хранится | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| not-stored | Что не хранится | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| provider | Что передаётся провайдерам | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| retention | Срок хранения | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| delete | Удалить все мои данные | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| confirm-title | Удалить данные? | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| cancel | Отмена | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| confirm | Удалить данные | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| trash-2 | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Удалить данные |
| x | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Закрыть |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 32 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| delete | Удалить все мои данные | danger | 34:confirm | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| cancel | Отмена | secondary | 34 | close-overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| confirm | Удалить данные | danger | 02 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| retention | policy\|null | null → Срок хранения не указан |
| deletionState | idle\|loading\|success\|error | error keeps dialog and retry |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, settings, trash-2, x, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 35 · Стать организатором

**Purpose:** Explain eligibility and event submission without promising publication.  
**Route/state:** `/organizer/start` · eligible / not-eligible / application unavailable  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + title. |
| 20 | hero | media / raster in DOM | x=22,y≈100,w=386,h=220–260 | Generated abstract organizer hero. |
| 30 | requirements | content / DOM | x=22,below hero,w=386 | Requirements, steps, current eligibility. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Apply only when flow exists. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Стать организатором | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| requirements | Что потребуется | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| steps | Как это работает | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| status | {{eligibilityLabel}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| apply | Подать заявку | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| check | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Требование выполнено |
| circle | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Требование не выполнено |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| organizer-hero | 3:4 crop in 386×240 | cover | generated abstract event-making scene | CSS/SVG modular blocks |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 32 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| apply | Подать заявку | primary | 36 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until eligibility confirmed and flow enabled |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| eligibility | eligible\|ineligible\|unknown | unknown disables application |
| requirements | Requirement[] | empty does not imply eligible |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** organizer-hero.
- **SVG:** arrow-left, check, circle, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 36 · Создание события — основное

**Purpose:** Collect title/category/organizer as step 1/4.  
**Route/state:** `/organizer/event/new/basic` · editing / validating / autosaving / error  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + progress 1/4 + autosave state. |
| 20 | form | form / DOM | x=22,y≈120,w=386 | One focused field at a time; no CRM wall. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Next. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| progress | Шаг 1 из 4 | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| title | Основное о событии | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| name | Название события | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| category | Категория | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| organizer | Организатор | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| saved | Черновик сохранён | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| next | Дальше | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| chevron-down | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать категорию |
| check | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сохранено |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 35 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| next | Дальше | primary | 37 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until valid required fields |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| title | string | empty invalid |
| categoryId | string | unknown invalid |
| organizerName | string | empty invalid |
| draftSavedAt | ISO\|null | null shows Сохраняем or save error |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, chevron-down, check, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 37 · Создание события — дата и место

**Purpose:** Collect occurrence and real location as step 2/4.  
**Route/state:** `/organizer/event/new/schedule` · editing / validation errors / map picking  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + progress 2/4. |
| 20 | schedule-form | form / DOM | x=22,y≈120,w=386 | Date/start/end/timezone/venue. |
| 30 | mini-map | map / map provider | x=22,w=386,h=220 | Real provider + attribution. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Next. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| progress | Шаг 2 из 4 | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| title | Дата и место | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| date | Дата | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| start | Начало | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| end | Окончание или длительность | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| timezone | Часовой пояс | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| venue | Место проведения | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| past | Дата уже прошла | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| order-error | Окончание должно быть позже начала | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| next | Дальше | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| calendar | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать дату |
| clock | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать время |
| map-pin | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Выбрать место |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 36 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| pick-place | Выбрать место | secondary | 37:map | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| next | Дальше | primary | 38 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until valid future occurrence and place |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| startAt | ISO | missing invalid |
| endAt | ISO\|null | null requires duration |
| timeZone | IANA string | default must be visible |
| placeId|coordinates | identifier | missing invalid |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, calendar, clock, map-pin, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** mini-map.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 38 · Создание события — цена, язык, контакт

**Purpose:** Collect typed commercial and contact facts as step 3/4.  
**Route/state:** `/organizer/event/new/details` · editing / validation  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + progress 3/4. |
| 20 | details-form | form / DOM | x=22,y≈120,w=386,scroll | Price state, language semantics, contacts. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Next. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| progress | Шаг 3 из 4 | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| title | Цена, язык и контакт | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| price | Цена | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| exact | Точная | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| range | Диапазон | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| from | От | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| free | Бесплатно | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| unknown | Не указана | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| language | Язык | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| contact | Контакт | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| next | Дальше | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| wallet | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Цена |
| languages | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Язык |
| link | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Ссылка |
| phone | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Телефон |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 37 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| price-state | Выбрать тип цены | secondary | 38:price | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| next | Дальше | primary | 39 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until valid contact and typed price state |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| price.state | exact\|range\|from\|free\|unknown | empty is invalid; user chooses unknown explicitly |
| language.spoken | locale[] | empty requires explicit not specified |
| contact | URL\|phone\|WhatsApp | missing invalid for submission |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, wallet, languages, link, phone, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 39 · Создание события — медиа и preview

**Purpose:** Verify rights and preview submission as step 4/4.  
**Route/state:** `/organizer/event/new/preview` · no-media / uploaded / rights-unchecked / submitting / error  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + progress 4/4. |
| 20 | media-preview | media / raster upload in DOM | x=22,y≈120,w≈260,3:4 | Organizer upload or labelled category fallback. |
| 30 | rights | form / DOM | x=22,w=386 | Explicit rights checkbox. |
| 40 | event-preview | card / DOM | x=22,w=386 | Title, occurrence, venue, price, contact, unknowns. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Submit for review. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| progress | Шаг 4 из 4 | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| title | Проверьте событие | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| rights | У меня есть право использовать это изображение | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| fallback | Иллюстрация категории | meta | Manrope, system-ui, sans-serif | 13px / 1.3 / 550 | 2 |
| submit | Отправить на проверку | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| upload | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Загрузить изображение |
| check-square | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Подтвердить права |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| organizer-upload | 3:4 | cover with crop control | user upload with asserted rights | labelled category illustration |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 38 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| upload | Загрузить изображение | secondary | file-picker | system | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| submit | Отправить на проверку | primary | 40 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; disabled until preview valid and rights confirmed when upload used |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| media | Upload\|null | null uses labelled fallback |
| rightsConfirmed | boolean | false blocks uploaded media submission |
| preview | EventDraft | unknown fields displayed honestly |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** organizer-upload.
- **SVG:** arrow-left, upload, check-square, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 40 · Статус модерации

**Purpose:** Show real submission state and available actions.  
**Route/state:** `/organizer/event/:id/status` · draft|submitted|review|changes|published|withdrawn  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + event title. |
| 20 | status-timeline | timeline / DOM + SVG | x=22,y≈140,w=386 | Draft→submitted→review→published/changes. |
| 30 | review-notes | content / DOM | x=22,below timeline,w=386 | Only real moderator comments. |
| 40 | actions | actions / DOM | x=22 | Edit allowed fields, withdraw. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Статус события | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| current | {{moderationStatusLabel}} *(dynamic)* | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| comments | Комментарии проверки | section | Manrope, system-ui, sans-serif | 26px / 1.1 / 700 | 2 |
| edit | Изменить событие | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| withdraw | Отозвать событие | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| circle | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Статус |
| message-square | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Комментарии |
| pencil | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Изменить |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 41 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| edit | Изменить событие | secondary | 36 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| withdraw | Отозвать событие | danger | 40:confirm | overlay | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| status | ModerationStatus | unknown → Статус не определён |
| comments | Comment[] | empty → Комментариев нет |
| publishedAt | ISO\|null | null never shows published date |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** arrow-left, circle, message-square, pencil, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Current node pulses once on screen open; no continuing animation.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 41 · Кабинет организатора

**Purpose:** Manage own drafts and occurrences without fake analytics.  
**Route/state:** `/organizer` · published/review/drafts/ended tabs  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back/Profile + settings. |
| 20 | tabs | tabs / DOM | x=22,y≈100,w=386 | Published, review, drafts, ended. |
| 30 | event-list | list / DOM + uploaded media | x=22,below tabs,w=386 | Status cards and measured actions only. |
| 70 | create-fab | action / DOM + SVG | right=22,bottom=safe+24,56×56 | Create event. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Мои события | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| published | Опубликованы | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| review | На проверке | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| drafts | Черновики | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| ended | Завершены | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| create | Создать событие | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| empty | Здесь пока нет событий | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| settings | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Настройки |
| plus | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Создать событие |
| ellipsis | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Действия события |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| event-thumb | 1:1 | cover | organizer media with rights or category fallback | category illustration |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Назад | icon | 32 | pop | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| create | Создать событие | icon | 36 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| event | Открыть событие | secondary | 40 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| events | OrganizerEvent[] | empty tab shows honest empty state |
| metrics | measured only | missing metrics are omitted, not zero |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** event-thumb.
- **SVG:** arrow-left, settings, plus, ellipsis, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 42 · Нет результатов

**Purpose:** Explain binding constraint and one safe relaxation.  
**Route/state:** `/no-results` · empty  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 20 | empty-state | content / DOM + SVG | center x=22,w=386 | Route line ending before target + exact reason. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Calculated relaxation + edit/map alternatives. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| title | Подходящих вариантов не нашли | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| reason | {{bindingReason}} *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| relax | {{recommendedChange}} *(dynamic)* | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| edit | Изменить условия | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| map | Посмотреть на карте | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| route-off | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | route-off |
| sliders-horizontal | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Изменить условия |
| map | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Посмотреть на карте |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| relax | {{recommendedChange}} | primary | 13 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| edit | Изменить условия | secondary | 08\|09\|10 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| map | Посмотреть на карте | text | 16 | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| bindingReason | typed reason | missing → По текущим условиям вариантов нет |
| recommendedChange | validated relaxation\|null | null hides primary relaxation |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** route-off, sliders-horizontal, map, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 43 · Degraded states board

**Purpose:** Design-system variants for provider failures; never one simultaneous product screen.  
**Route/state:** `component state board` · offline|map unavailable|routing unavailable|LLM unavailable  
**Priority:** P0  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header нет; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 20 | variant-grid | component-board / DOM | x=22,y≈100,w=386 | Four separate component variants, not runtime stack. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| offline | Нет сети. Показаны сохранённые данные на {{date}}. *(dynamic)* | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| map | Карта недоступна. Открыть список. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| route | Маршрут не построен. Показать оценку. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| llm | Помощник недоступен. Показаны результаты поиска. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| retry | Повторить | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| wifi-off | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Нет сети |
| map-off | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Карта недоступна |
| route-off | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Маршрут недоступен |
| bot-off | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Помощник недоступен |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| — | — | — | No raster media | CSS/SVG/DOM only |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| list | Открыть список | primary | 18 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| estimate | Показать оценку | primary | 25 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| results | Показать результаты поиска | primary | 14 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| retry | Повторить | secondary | current | state | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| failure.kind | typed enum | required |
| snapshotAt | ISO\|null | null → дата снимка не указана |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** none.
- **SVG:** wifi-off, map-off, route-off, bot-off, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 44 · Алматы — следующий город

**Purpose:** Inform about future city without false launch promise.  
**Route/state:** `/city/almaty` · coming-next / locked  
**Priority:** P1  
**Canvas/safe areas:** 430×932; top env(safe-area-inset-top), reference 24px; header 64px when present; content y=88…916; scroll/sticky actions account for safe bottom; bottom env(safe-area-inset-bottom), reference 16px.  
**Chrome:** header да; dock скрыт; overlay: none.

### Ordered layers

| # | Layer | Type / implementation | Bounds | Geometry, surface and behavior |
|---:|---|---|---|---|
| 0 | background | background / CSS | 0,0,430,932 | Winter gradient #F4F6F2→#EDF3F5 + optional 1–2% monochrome noise; no factual map. |
| 10 | header | chrome / DOM + SVG | x=22,y=safeTop,w=386,h=64 | Back + city label. |
| 20 | city-art | media / raster in DOM | x=22,y≈120,w=386,3:4 region | Generated abstract foothill atmosphere. |
| 30 | city-copy | content / DOM | x=22,over/below art,w=386 | Status and only confirmed future coverage. |
| 80 | sticky-actions | actions / DOM | x=16–22,bottom=safeBottom,w=386–398,min-h=72 | Notify action only if a real notification flow exists. |

### Visible text

| ID | Copy | Role | Font | Size / line-height / weight | Max lines |
|---|---|---|---|---|---:|
| city | Алматы | title | Manrope, system-ui, sans-serif | 32px / 1.06 / 700 | 2 |
| status | Следующий город | label | Manrope, system-ui, sans-serif | 14px / 1.3 / 650 | 2 |
| body | QETTYQ пока работает в Астане. | body | Manrope, system-ui, sans-serif | 16px / 1.42 / 450 | 4 |
| back | Продолжить с Астаной | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |
| notify | Сообщить о запуске | button | Manrope, system-ui, sans-serif | 16px / 1.2 / 650 | 2 |

### Icons

| Semantic name | Source | Size | Stroke | aria-label |
|---|---|---:|---:|---|
| arrow-left | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Назад |
| lock | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Город пока недоступен |
| bell | Lucide-compatible project-native SVG; inspect license; never raster or emoji | 24px | 1.8px | Сообщить о запуске |

### Media slots and provenance

| Slot | Aspect | Crop | Provenance | Fallback |
|---|---|---|---|---|
| almaty-art | 3:4 | cover | generated atmosphere only; no real skyline claim | CSS foothill planes |

### Controls, states and transitions

| Control | Label | Variant | Target | Transition | States / conditions |
|---|---|---|---|---|---|
| back | Продолжить с Астаной | primary | 02 | replace | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error |
| notify | Сообщить о запуске | secondary | notification-flow | push | default, hover (pointer devices), focus-visible, pressed, loading, disabled, success, error; render only if real flow exists |

### Data and unknown handling

| Field | Type/state | Missing/unknown behavior |
|---|---|---|
| cityStatus | coming_next | unknown → Город пока недоступен |
| coverage | confirmed category[] | empty hides coverage list |
| notificationEnabled | boolean | false hides notify CTA |

Unknown rules: Unknown остаётся unknown; не подменять нулём, false, free или confirmed.

### Rendering, responsive, motion and a11y

- **Raster:** almaty-art.
- **SVG:** arrow-left, lock, bell, wordmark/route accents where specified.
- **DOM:** all visible text, buttons, chips, cards, inputs, states, focus rings.
- **Provider:** none.
- **Responsive:** 430×932 — reference; на 360×800 padding 18 px и естественная прокрутка; на 390×844 сохранить 44 px targets; на desktop основной mobile-column max 520 px, карту разрешено вынести вторым pane. Высоты не фиксировать, использовать 100dvh и safe-area env().
- **Motion:** Screen transition 180–240 ms ease-in-out; tap 120–160 ms.
- **Reduced motion:** При prefers-reduced-motion убрать translate/scale/rotation/ripple/route draw; оставить смену opacity 120–160 мс и мгновенное изменение состояния.
- **Accessibility:** Все действия доступны клавиатурой; hit target ≥44×44 CSS px; видимый focus 2 px #175CC2 + 2 px offset; status через aria-live polite; 200% text не перекрывает sticky actions; иконки без текста имеют aria-label; цвет не является единственным сигналом.

## 45. Проверка передачи

1. Сверстать сначала 14 как эталон tokens/chrome.  
2. Создать общие DOM/SVG components и variants, не нарезать полноэкранные PNG.  
3. Для каждого screen сопоставить rendered tree с одноимённой записью JSON.  
4. Проверить 360×800, 390×844, 430×932, 1440×900, 200% text, keyboard, screen reader names и reduced motion.  
5. Фактический screenshot считается доказательством только после отображения typed data/unknown/source states.
