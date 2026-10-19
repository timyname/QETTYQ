# QETTYQ · gap analysis: 44 artboards vs 28 PNG

Дата: 20 октября 2026 года  
Source of truth: `design/QETTYQ_44_ARTBOARD_SPEC.md`  
Generated folder: `design/generated/app-screens/`

## 1. Итог

- Всего в спецификации: 44 artboard.
- Сейчас PNG: 28.
- Отсутствуют: 16.
- Совпадение количества файлов не означает готовность UI: существующие PNG — композиционные референсы. Text, controls, maps, routes, markers, states and dock remain code-native.
- Все новые экраны наследуют production-стиль screen 14: winter pearl background, deep jade structure, one restrained lime state, matte white surfaces, soft depth, 28–32 px cards, liquid glass only over media/map.

## 2. Имеющиеся 28 PNG

`02, 03, 04, 05, 08, 09, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 32, 33, 34, 42, 43`.

Они покрывают главный onboarding, feed, map, details, route, unified search/assistant, profile/trust и основные fallback-композиции. Screens 17, 19 и permission/confirmation состояния должны реализовываться как overlays, даже если существует отдельный PNG-референс.

## 3. Отсутствующие 16 artboards

| № | Название | Релизный приоритет | Нужен новый raster asset? | Реализация / решение |
|---:|---|---|---|---|
| 01 | Bootstrap | P0 | Нет | Code-native фон, SVG route arc, wordmark и delayed status. Нужен визуальный board/state, но не image generation. |
| 06 | Swipe вправо | P0 | Нет | Variant экрана 05: transform + code stamp `Интересно`; использовать тот же 3:4 asset. |
| 07 | Swipe влево | P0 | Нет | Variant экрана 05: transform + code stamp `Не сейчас`; тот же asset. Skip не dislike. |
| 15 | Feed: нужно уточнить | P0 | Нет | Code-native warning variant CandidateCard; media reused from candidate. Нужен собранный artboard для QA, не генерация картинки. |
| 22 | Кино: список сеансов | P1 | Возможно один fallback 3:4 | UI code-native. Постер только по лицензии; иначе сгенерировать один posterless abstract cinema asset без текста и собрать typography кодом. |
| 23 | Кино: детали сеанса | P1 | Нет отдельного | Reuse licensed poster/fallback from 22. All facts/source/actions code-native. |
| 30 | Сохранённые планы | P1 | Нет | Reuse candidate media; list/empty/stale states code-native. Entry через профиль, не dock. |
| 31 | Поделиться маршрутом | P1 | Нет | Code-native privacy sheet, expiry and system share. |
| 35 | Стать организатором | P1 design / later product | Да, один 3:4 hero | Generate rights-safe abstract event-making scene; eligibility and CTA code-native. |
| 36 | Создание: основное | P1 design / later product | Нет | Form step 1/4, validation/autosave code-native. |
| 37 | Создание: дата и место | P1 design / later product | Нет | Real map mini-picker, fields and inline errors code-native. |
| 38 | Создание: цена, язык, контакт | P1 design / later product | Нет | Code-native form; explicit free vs unknown. |
| 39 | Создание: медиа и preview | P1 design / later product | Нет обязательного | Organizer upload or labelled category fallback; preview code-native. |
| 40 | Статус модерации | P1 design / later product | Нет | Code-native status timeline; no fabricated moderation events. |
| 41 | Кабинет организатора | P1 design / later product | Нет | Code-native tabs/cards. No analytics until measured. |
| 44 | Алматы: следующий город | P1 design / later city | Да, один 3:4 atmosphere asset | Generate abstract Almaty foothill artwork; lock/status copy code-native. |

## 4. Что именно генерировать изображением

Только три asset-направления из недостающего набора требуют/допускают генерацию:

### 22 · Posterless cinema fallback

```text
QETTYQ visual system, Astana modern urban editorial mood, winter pearl and cool mist palette, deep steppe jade structure, one restrained acid-lime detail, tactile matte materials, soft depth, abstract cinematic projection beam and acoustic volume, dark jade, muted cobalt and warm ivory light, strong 3:4 composition with clean lower area, no film characters, no title, no typography, no logos, no real poster, no watermark.
```

Purpose: fallback only when a licensed poster is unavailable. Film title, cinema, session, language and price remain DOM text.

### 35 · Organizer hero

```text
QETTYQ visual system, modern Astana civic editorial mood, tactile matte event-making scene, modular stage blocks, calendar plane, contact ribbon and audience-space circles, deep jade and warm ivory, one lime connector, calm premium depth, vertical 3:4, no people, no logos, no real venue, no ticket, no text, no dashboard UI.
```

Purpose: explain event creation without claiming a real organizer or published event.

### 44 · Almaty atmosphere

```text
QETTYQ visual system inherited from screen 14, abstract Almaty expansion artwork, layered foothill planes, crisp morning air, pale mineral stone, cool blue-green mist, one deep-jade route ribbon and one restrained lime endpoint, tactile editorial material, vertical 3:4, no real skyline, no text, no tourist clichés, no logos.
```

Purpose: future-city atmosphere only. Coverage, launch date and notification flow cannot be baked into art.

Common negative prompt:

```text
legible text, letters, numbers, UI controls, fake map, fake event poster, fake ticket, brand logos, watermark, neon cyberpunk, purple AI gradient, glossy plastic, yurt cliché, national costume, clutter, excessive glassmorphism.
```

## 5. Code-native boards/states to compose, not image-generate

| Group | Boards | Required states |
|---|---|---|
| Bootstrap | 01 | restoring under 500 ms, delayed copy, continue without restore, corrupt local memory fallback |
| Swipe | 06–07 | drag threshold, return, like, skip, request lock, save error, undo |
| Uncertainty | 15 | price unknown, time unconfirmed, availability unknown; not error-red |
| Cinema | 22–23 | poster available/fallback, language audio/subtitles, price unknown, source stale, external handoff |
| Plans | 30–31 | empty, saved, stale, refresh, share privacy, copy success/error |
| Organizer | 36–41 | validation, autosave, upload rights, submitted, changes requested, published/cancelled |

These boards need real text/components in the design tool or code prototype. Generating them as raster would repeat the current localisation/accessibility problem.

## 6. P0 generation/composition order

1. Compose 01 in code/SVG.
2. Create 06 and 07 as variants of 05; do not regenerate the interest asset.
3. Compose 15 from the same CandidateCard tokens as screen 14.
4. Correct existing 14, 16, 27–29 and 32 to the approved four-item dock:
   `Для тебя / Поиск / Карта / Профиль`.
5. Replace existing raster map/route with provider/code layers before treating screenshots as implementation proof.

## 7. P1 design order

1. 30 plans and 31 share, because they connect the existing route scenario and new profile entry.
2. 22–23 cinema after a real permitted schedule/source path is available.
3. 35–41 organizer flow as a coherent form system, not isolated posters.
4. 44 only as future-city informational state; no unsupported launch promise.

## 8. Style inheritance checklist from screen 14

Every new board must use:

- canvas `#F4F6F2 → #EDF3F5`;
- ink `#101915`, deep jade `#0B332D`, brand jade `#0B6E5D`;
- lime `#CFFC55` only for selected/next action;
- 22 px horizontal padding at 430; 18 px at ≤390;
- 28–32 px major card radius;
- matte white content surfaces, readable long text, restrained glass;
- soft card shadow, not neon glow;
- four-item dock when the IA requires it;
- top-right settings gear, not settings tab;
- all factual text, buttons, icons and status as code/design text layers;
- no invented event, price, schedule, source, availability or metric.

## 9. Acceptance

The 44-board set is complete only when all 16 gaps have either a design board or an explicitly documented component variant, not merely a prompt. P0 completion requires 01, 06, 07 and 15 plus corrected dock states. P1 artwork may remain pending when its real data/source dependency is unavailable, but its status must be explicit.
