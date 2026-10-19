# QETTYQ · Asset & icon system

**Версия:** 1.0 · **Дата:** 20 октября 2026 года  
**Область:** 44 artboard, mobile-first web app, пилот Астана  
**Источники требований:** `PRD.md`, `design/QETTYQ_44_ARTBOARD_SPEC.md`, `design/QETTYQ_SCREEN_14_PRODUCTION_SPEC.md`  
**Machine-readable contract:** `design/qettyq-asset-manifest.json`

## 1. Решение

Визуальное направление: спокойный редакционный городской помощник с жемчужно-зимним фоном, глубокой jade-структурой, одним lime-акцентом состояния и тактильными матовыми медиа.

- Основной набор UI-иконок: **Lucide React** (`lucide-react`, уже установлен).
- Phosphor не смешивается с Lucide внутри продукта. Он остаётся зависимостью проекта, но не является источником новых пиктограмм.
- Иконки интерфейса — только code-native SVG-компоненты. AI-raster, emoji, PNG-иконки и вырезанные из сгенерированных макетов пиктограммы запрещены.
- Генерация изображений разрешена только для category illustration, city atmosphere, posterless fallback и нейтральных background/hero assets без фактов.
- Фото реального места/события допускается только с проверенным provenance и правом показа. Иллюстрация категории всегда помечается как иллюстрация и не выдаётся за реальное место.
- Карта, маршрут, маркеры, UI-текст, цены, даты, контакты, логотипы провайдеров и кнопки собираются кодом.

Почему Lucide: он уже используется в текущем UI, имеет единый округлый stroke-язык, tree-shakable React exports и покрывает навигацию, статусы, маршруты, данные, профиль и формы без визуального смешения библиотек.

## 2. Непереговорные правила

1. Один semantic action — одна иконка во всех экранах.
2. Иконка не заменяет текст у необратимого, неоднозначного или внешнего действия.
3. Цвет не является единственным носителем состояния: нужен текст, форма, `aria-*` или дополнительный glyph.
4. Неизвестное значение показывает `CircleQuestionMark` и текст `Не указано/Нужно уточнить`, а не `0`, `Check` или пустое место.
5. `skip` — `X`, но не danger-red; `dislike` — отдельное явное действие в деталях. Свайпы относятся к досугу, не к людям.
6. `save` — `Bookmark`; `Heart` используется только для реакции `Интересно` в 15 свайпах. Это устраняет dating-app семантику.
7. Для внешнего перехода рядом с текстом используется `ExternalLink`. Самодельные логотипы Google Maps, 2GIS, Яндекс Go, Ticketon и Kino.kz запрещены.
8. Настройки — `Settings` в header справа сверху, не пятый tab.
9. Нижний dock состоит ровно из четырёх пунктов: `House`, `Search`, `Map`, `UserRound`.
10. Никаких бесконечных spinner, blinking, perpetual glow и декоративных badge без события.

## 3. Геометрия и состояния иконок

### 3.1. Размеры

| Token | SVG box | Где используется |
|---|---:|---|
| `icon.xs` | 14–16 px | attribution, timestamp, компактный статус |
| `icon.sm` | 18 px | chips, meta-row, inline facts |
| `icon.md` | 20 px | поля, списки, обычные кнопки |
| `icon.nav` | 22–24 px | bottom dock |
| `icon.lg` | 24–28 px | 44–56 px icon button, sheet header |
| `icon.hero` | 40–48 px | permission/empty state; не внутри обычной кнопки |

Минимальный touch target — `44 × 44 CSS px`, предпочтительный основной — `48 × 48`. Видимый SVG не растягивается для заполнения touch target.

### 3.2. Stroke и fill

- Default: `stroke-width: 1.75`, `stroke-linecap: round`, `stroke-linejoin: round`, `fill: none`.
- Active navigation/primary state: `stroke-width: 2`, цвет `#0B6E5D`, lime surface `#CFFC55`; сам SVG остаётся line icon.
- Selected reaction: `Heart` может получить `fill: currentColor` после завершения state transition.
- Saved: `Bookmark` может получить `fill: currentColor`; loading не меняет glyph на случайный spinner — рядом появляется текст и `aria-busy`.
- Done: `Check`/`CircleCheck`, jade.
- Warning/unknown: `CircleAlert`/`CircleQuestionMark`, текст обязателен.
- Danger: `Trash`/`CircleX`, `#A9343E`; заливка danger появляется только в confirmation, не на первом шаге.
- Disabled: opacity `0.38`, cursor/semantics disabled, без blur; disabled не применяется к важным источникам и status text.
- Focus: 2 px ring `#175CC2`, offset 2 px вокруг touch target, не вокруг path.

### 3.3. Motion

- Tap: scale контейнера до `0.98`, 120–160 ms.
- Dock indicator: 180–220 ms; reduced-motion — без перемещения.
- Save: `Bookmark → Bookmark filled` или `Check`, 160–220 ms, polite live announcement.
- Copy: `Copy → Check` на 1.5 s.
- Loading: `LoaderCircle` вращается только пока реально идёт операция; для трёх стадий используется progress rail, а не бесконечный spinner.
- Marker selection: scale 0.9→1 и один ripple 600 ms; ripple не зацикливается.

## 4. Базовый semantic icon dictionary

| Semantic ID | Lucide export | Доступное имя / смысл |
|---|---|---|
| `nav.home` | `House` | Для тебя |
| `nav.search` | `Search` | Поиск и чат-помощник |
| `nav.map` | `Map` | Карта |
| `nav.profile` | `UserRound` | Профиль |
| `action.settings` | `Settings` | Настройки |
| `action.back` | `ArrowLeft` | Назад |
| `action.close` | `X` | Закрыть / не сейчас по контексту |
| `action.next` | `ArrowRight` | Дальше |
| `action.expand` | `ChevronDown` | Раскрыть |
| `action.more` | `Ellipsis` | Дополнительные действия |
| `action.save` | `Bookmark` | Сохранить |
| `action.share` | `Share2` | Поделиться |
| `action.copy` | `Copy` | Скопировать |
| `action.edit` | `Pencil` | Изменить |
| `action.delete` | `Trash` | Удалить |
| `action.reset` | `RotateCcw` | Сбросить / повторить |
| `action.external` | `ExternalLink` | Открыть первоисточник/внешний сервис |
| `action.add` | `Plus` | Добавить остановку/объект |
| `reaction.like` | `Heart` | Интересно |
| `reaction.undo` | `Undo2` | Отменить последнюю реакцию |
| `status.done` | `CircleCheck` | Готово/подтверждено |
| `status.pending` | `CircleDashed` | Ожидает |
| `status.loading` | `LoaderCircle` | Идёт операция |
| `status.warning` | `CircleAlert` | Предупреждение |
| `status.unknown` | `CircleQuestionMark` | Нужно уточнить |
| `status.offline` | `WifiOff` | Нет сети |
| `context.time` | `Clock3` | Свободное время |
| `context.budget` | `WalletCards` | Бюджет |
| `context.people` | `Users` | Участники |
| `context.date` | `CalendarDays` | Дата |
| `context.schedule` | `CalendarClock` | Сеанс/время начала |
| `context.language` | `Languages` | Язык/субтитры |
| `context.accessibility` | `Accessibility` | Доступность |
| `location.point` | `MapPin` | Точка/venue |
| `location.current` | `LocateFixed` | Моя геопозиция |
| `location.choose` | `MapPinned` | Указать точку |
| `route.build` | `Route` | Построить маршрут |
| `route.navigate` | `Navigation` | Открыть навигацию |
| `route.walk` | `Footprints` | Пешком |
| `route.reorder` | `GripVertical` | Переставить остановку |
| `filter.open` | `SlidersHorizontal` | Фильтры |
| `view.list` | `List` | Список |
| `data.source` | `Database` | Источник/режим данных |
| `privacy.protected` | `ShieldCheck` | Приватность/право использования |
| `privacy.hidden` | `EyeOff` | Не передаётся/скрыто |
| `contact.site` | `Globe` | Сайт |
| `contact.phone` | `Phone` | Телефон |
| `contact.message` | `MessageCircle` | WhatsApp/чат с организатором |
| `assistant.send` | `Send` | Отправить сообщение |
| `media.add` | `ImagePlus` | Добавить медиа |
| `media.upload` | `Upload` | Загрузить |
| `entity.movie` | `Film` | Кино |
| `entity.ticket` | `Ticket` | Билеты/источник билетов |
| `organizer.building` | `Building` | Площадка/организатор |

`Search` одновременно является названием вкладки и входом в assistant thread: это осознанная IA. Внутри сообщения допустим `MessageCircle`, но tab icon не меняется на bubble.

## 5. Bottom dock и header

### Dock

- Artboard: `14–23`, `27–34`; на route flow `24–26` скрыт ради маршрутных действий.
- Width 398 px при inset 16; min-height 72 px + safe area; radius 28 px.
- Surface `rgba(255,255,255,.82)`, blur 22 px, border white 72%, shadow `0 12px 28px rgba(11,51,45,.15)`.
- Четыре равные зоны: `Для тебя / House`, `Поиск / Search`, `Карта / Map`, `Профиль / UserRound`.
- Active item: jade icon, lime disc 38 px, `aria-current=page`.
- Inactive opacity ≥64%. Badge — только для реального unseen change.

### Header

- Слева: custom QETTYQ wordmark SVG.
- City: `MapPin` 18–20 + `ChevronDown`.
- Справа: `Settings` внутри 44 × 44. На detail/map picker settings уступает место Back/Close по сценарию.
- Настройки открывают overlay/route и возвращают в прежнюю scroll/selection position.

## 6. Custom brand glyphs, которые рисуются в SVG вручную

Эти элементы не генерируются моделью и не подменяются Unicode:

1. `qettyq-wordmark.svg` — точный wordmark, монохромный, `currentColor`, без raster filter.
2. `qettyq-route-arc.svg` — фирменная дуга загрузки/empty state; path допускает stroke-dash animation один раз.
3. `qettyq-brand-dot.svg` — маленькая lime terminal point; не используется как notification badge.
4. `marker-event.svg`, `marker-place.svg`, `marker-attraction.svg`, `marker-uncertain.svg`, `marker-selected.svg`, `marker-cluster.svg` — один параметрический marker component предпочтительнее шести файлов.
5. `route-point-a.svg`, `route-stop.svg`, `route-point-b.svg` — кодовые варианты одного route-node component.
6. 15 compact category glyphs для chips/marker: culture, rock, theatre, dance, drums, strength, active, retreat, social-food, fine-dining, coffee, exhibition, cinema, workshop, architecture-walk. Сначала использовать близкий Lucide glyph; custom path нужен только если смысл в 20 px неразличим.

Custom SVG: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, optical padding 2 px, path count желательно ≤4. Не экспортировать тени/blur внутрь SVG; depth задаёт CSS-контейнер.

## 7. Экранная icon map: 01–44

| AB | Основные semantic controls | Медиа |
|---:|---|---|
| 01 | custom wordmark, custom route arc, `ArrowRight` | нет raster |
| 02 | `MapPin`, `ChevronDown`, `Settings`, `ArrowRight` | 4 category square crops |
| 03 | `X`, `LocateFixed`, `Check` | Astana/Almaty atmosphere strips |
| 04 | `ArrowRight`, `Map`, `X` для skip | 3:4 onboarding category |
| 05 | `X`, `Undo2`, `Heart`, `CircleCheck` | 15 interest cards |
| 06 | `Heart` active | переиспользует текущую interest card |
| 07 | `X` neutral | переиспользует текущую interest card |
| 08 | `Clock3`, `ChevronDown`, `ArrowRight` | нет raster |
| 09 | `WalletCards`, `Minus`, `Plus`, `Users`, `ArrowRight` | нет raster |
| 10 | `MapPin`, `LocateFixed`, `MapPinned`, `Plus`, `ArrowRight` | CSS/SVG grid only |
| 11 | `LocateFixed`, `MapPin`, `X` | live map, не asset |
| 12 | `ArrowLeft`, `Search`, custom center pin, `Check` | live map |
| 13 | `CircleCheck`, `LoaderCircle`, `CircleDashed`, `X`, `RefreshCw` | нет raster |
| 14 | dock 4, `Settings`, `MapPin`, `ChevronDown`, `Clock3`, `WalletCards`, `Bookmark`, `Map`, `ArrowRight` | sourced hero либо labelled category fallback |
| 15 | dock 4, `CircleQuestionMark`, `CircleAlert`, `Pencil` | reuse candidates |
| 16 | dock 4, `Search`, `SlidersHorizontal`, `CalendarDays`, `List`, `Crosshair`, custom markers | live map |
| 17 | dock 4, custom selected marker, `Footprints`, `Plus`, `ArrowRight` | 1:1 sourced/fallback crop |
| 18 | dock 4, `Search`, `SlidersHorizontal`, `Map`, `List`, `Bookmark` | same candidate media as 16/17 |
| 19 | `X`, `CalendarDays`, `Languages`, `Footprints`, `Accessibility`, `EyeOff`, `RotateCcw`, `Check` | нет raster |
| 20 | `ArrowLeft`, `Bookmark`, `Share2`, `CalendarClock`, `MapPin`, `Languages`, `CircleDollarSign`, `CircleAlert`, `Route`, `ExternalLink` | sourced event hero/fallback |
| 21 | `ArrowLeft`, `Bookmark`, `Share2`, `Clock3`, `MapPin`, `Globe`, `Phone`, `Route`, `CircleQuestionMark` | licensed place photo/fallback |
| 22 | dock 4, `Film`, `SlidersHorizontal`, `Languages`, `CalendarClock`, `ExternalLink` | licensed poster or posterless fallback |
| 23 | dock 4, `ArrowLeft`, `Film`, `CalendarClock`, `Languages`, `CircleDollarSign`, `Route`, `Ticket`, `ExternalLink` | reuse poster/fallback |
| 24 | `ArrowLeft`, custom route nodes, `GripVertical`, `Plus`, `Trash`, `Bookmark`, `Navigation` | live map + network polyline |
| 25 | `ArrowLeft`, `CircleAlert`, custom route nodes, `ExternalLink` | live map + abstract dotted relation |
| 26 | `CircleCheck`, `Footprints`, `Clock3`, `Bookmark`, `Share2`, `Navigation`, `ExternalLink` | нет generated raster |
| 27 | dock 4, custom route arc, `Database`, `Send`, optional `Mic` | нет raster |
| 28 | dock 4, `MessageCircle`, `Pencil`, `Check`, `Send` | нет raster |
| 29 | dock 4, `Map`, `Plus`, `ExternalLink`, `Bookmark` | reuse candidate media |
| 30 | dock 4, `CalendarDays`, `Route`, `Share2`, `Ellipsis`, `RefreshCw`, `CircleAlert` | no required raster |
| 31 | `X`, `Link`, `Copy`, `Share2`, `ShieldCheck`, `Clock3` | нет raster |
| 32 | dock 4, `UserRound`, `Database`, `Pencil`, `Trash`, `ChevronRight` | avatar optional; initials by code |
| 33 | dock 4, `Database`, `Map`, `Route`, `CalendarClock`, `ExternalLink`, `CircleCheck`, `CircleAlert` | нет raster |
| 34 | dock 4, `ShieldCheck`, `EyeOff`, `Database`, `Trash`, `X`, `Check` | нет raster |
| 35 | `ArrowLeft`, `Users`, `CalendarDays`, `MapPin`, `ShieldCheck`, `ArrowRight` | organizer atmosphere 3:4 crop |
| 36 | `ArrowLeft`, `Pencil`, `Layers`, `Building`, `Save`, `ArrowRight` | нет raster |
| 37 | `ArrowLeft`, `CalendarDays`, `Clock3`, `MapPin`, `Search`, `CircleAlert`, `ArrowRight` | live mini-map |
| 38 | `ArrowLeft`, `CircleDollarSign`, `Languages`, `Globe`, `MessageCircle`, `Phone`, `Ticket`, `ArrowRight` | нет raster |
| 39 | `ArrowLeft`, `ImagePlus`, `Upload`, `ShieldCheck`, `Eye`, `Send` | organizer upload or labelled fallback |
| 40 | `FileClock`, `CircleCheck`, `CircleAlert`, `Pencil`, `MessageCircle`, `Undo2` | нет raster |
| 41 | `Pencil`, `CalendarClock`, `CircleX`, `Ellipsis`, `ExternalLink` | reuse event media only if useful |
| 42 | custom incomplete route arc, `Clock3`, `SlidersHorizontal`, `ArrowRight` | нет raster |
| 43 | `WifiOff`, `Map`, `List`, `Route`, `MessageCircle`, `RefreshCw`, `CircleAlert` | нет raster |
| 44 | `ArrowLeft`, `MapPin`, `Info` | Almaty atmosphere 3:4 |

Примечание: таблица задаёт разрешённый словарь, а не требование показать все перечисленные иконки одновременно. Текстовые кнопки остаются текстовыми; icon добавляется, только если он ускоряет распознавание.

## 8. Raster/media inventory и naming

### 8.1. Имена

```text
assets/media/interest/interest-{01..15}-{slug}--master.png
assets/media/interest/interest-{01..15}-{slug}--card.avif
assets/media/interest/interest-{01..15}-{slug}--card.webp
assets/media/city/city-{astana|almaty}-{hero|strip|expansion}--master.png
assets/media/category/category-{event|place|cinema|organizer}-{variant}--master.png
assets/media/entities/{entityType}-{sourceId}-{externalId}-{contentHash}.{ext}
```

Нельзя включать имя человека, телефон, координаты или секрет в filename. Для source media filename строится из стабильных non-personal IDs и hash.

### 8.2. Master slots

| Slot | Экран | Ratio | Master target | Display/crop | Safe zone | Source / fallback |
|---|---|---:|---:|---|---|---|
| `home.category.01–04` | 02 | 1:1 | 1024×1024 | ~187×132 cover | center 70%; без важных деталей в нижних 20% | generated category illustration |
| `city.astana.strip` | 03 | 2:1 | 1600×800 | 386×180 cover | center 80% | generated atmosphere |
| `city.almaty.strip` | 03 | 2:1 | 1600×800 | 386×112 cover | center 80% | generated atmosphere |
| `onboarding.demo` | 04 | 3:4 | 1200×1600 | 300×400 | lower 34% quiet | generated category illustration |
| `interest.01–15` | 05–07 | 3:4 | 1200×1600; min 1080×1440 | 342×456 | lower 34% quiet; central subject inside 80% | generated category illustration |
| `candidate.hero` | 14–15 | 3:4 source | min 1200×1600 | 386×320–350 cover | top/center focal; edge-safe 8% | licensed/source media; labelled category fallback |
| `candidate.square` | 17–18 | 1:1 crop | min 768×768 crop from same source | 96–112 square | focal center; faces never cut at eyes | same provenance as candidate |
| `event.detail.hero` | 20 | 3:4 source | min 1290×1720 | 430×410–440 cover | top visual focus; lower 15% calm | licensed event image or generated generic fallback |
| `place.detail.hero` | 21 | 3:4 source | min 1290×1720 | 430×410–440 cover | center focal | licensed place photo or labelled category fallback |
| `movie.poster` | 22–23 | 3:4 | min 900×1200 | 108×144 / 300×340 | all critical art inside 86%; no baked app copy | licensed poster; otherwise generated posterless art + code text |
| `assistant.inline` | 29 | 4:3 or 3:4 | reuse source | max height 250 | center crop | never separately generated |
| `organizer.hero` | 35 | 3:4 | 1200×1600 | 386×220–260 cover | center 70%, lower 20% quiet | generated atmosphere |
| `organizer.upload` | 39/41 | 3:4 | min 1200×1600 | responsive preview | preserve original focal point | verified organizer upload; generated labelled fallback |
| `city.almaty.expansion` | 44 | 3:4 | 1200×1600 | 430-wide feature crop | top/center focal; lower 30% quiet | generated atmosphere |

Map tiles and provider-served images are not copied into this asset library unless terms explicitly permit persistence. App-screen PNGs in `design/generated/app-screens/` are visual references only and never production backgrounds.

### 8.3. Crop rules

- Store focal point as normalized `{x,y}` when source supports multiple crops.
- `object-fit: cover`; never stretch.
- Preference titles sit in a code gradient over lower 34%; no subject eyes, hands or category symbol there.
- Real people: crop respectfully; no misleading recomposition; alt describes only visible fact.
- Category illustration: alt may be empty if title conveys the same meaning, otherwise `Иллюстрация категории: …`.
- A 1:1 map preview is a crop of the same approved candidate asset, not a new AI rendering.

## 9. Provenance, license and fallback contract

Every media record contains:

```json
{
  "kind": "licensed_photo | organizer_upload | provider_ephemeral | category_illustration",
  "sourceUrl": null,
  "author": null,
  "license": null,
  "licenseUrl": null,
  "retrievedAt": null,
  "rightsReviewedAt": null,
  "allowedUses": { "display": false, "crop": false, "persist": false, "redistribute": false },
  "promptId": null,
  "generator": null,
  "generatedAt": null,
  "contentHash": null,
  "focalPoint": { "x": 0.5, "y": 0.5 }
}
```

Fallback order:

1. source-approved licensed photo with attribution;
2. organizer upload with explicit rights confirmation;
3. provider media rendered according to provider policy, without prohibited caching;
4. QETTYQ category illustration with visible `Иллюстрация` label;
5. CSS color/texture placeholder with code-native category icon.

Unknown license means no public display. Search-engine result is not a license. Generated category illustration cannot be attached as evidence for a venue, dish, artist, event or offer.

## 10. Prompt pack for permissible assets

Every prompt starts with:

```text
QETTYQ visual system, Astana modern urban editorial mood, winter pearl and cool mist palette, deep steppe jade structure, one restrained acid-lime detail, tactile matte materials, soft daylight, subtle depth and half-shadows, modern Kazakhstan without literal folklore, premium but calm, no text, no logos, no factual map.
```

Every prompt ends with:

```text
Negative: legible text, letters, numbers, UI buttons, real venue claim, fake map, fake event poster, fake ticket, brand logos, watermark, neon cyberpunk, purple AI gradient, generic SaaS illustration, glossy plastic, dating app people, yurt cliché, national costume, clutter, excessive glassmorphism.
```

### P-HOME-02 · четыре квадратных категории

```text
Create four coordinated 1:1 editorial activity illustrations: food as an abstract ceramic plate landscape; walking as a flowing route ribbon; creative activity as tactile clay and percussion forms; discovery as an unexpected architectural portal. Same light, camera distance and material family. Strong central symbol, no identifiable venue or dish claim.
```

### P-CITY-03A · Астана

```text
Horizontal 2:1 abstract Astana winter atmosphere, broad open sky, light futuristic civic geometry, wind-shaped route arc and river-like reflection, ivory, pale blue and jade, no recognizable building. Keep the central 80 percent crop-safe.
```

### P-CITY-03B · Алматы

```text
Horizontal 2:1 abstract Almaty foothill atmosphere, layered pale mineral planes and cool blue-green air, restrained mountain geometry, no recognizable building. Same QETTYQ material system, central 80 percent crop-safe.
```

### P-INTEREST-01…15 · swipe pack

Base:

```text
3:4 mobile discovery card for CATEGORY, SYMBOL_DESCRIPTION, Astana-inspired abstract urban leisure without depicting a specific venue or event, tactile matte paper and ceramic forms, calm winter daylight, deep jade and warm ivory with CATEGORY_ACCENT and one tiny acid-lime detail, strong central subject, uncluttered lower 34 percent for a code-rendered title.
```

Substitutions:

1. culture-history / abstract arch and stage fold / muted steel-blue;
2. rock-live-music / acoustic wave and string volume / charcoal cobalt;
3. ballet-theatre / fabric motion and stage geometry / dusty rose;
4. bachata-social-dance / paired motion ribbons without people / warm coral;
5. drums-hand-music / circular percussion forms / ochre;
6. armwrestling-strength / two opposing structural arcs, no bodies / graphite;
7. active-leisure / dynamic route loop / alpine blue;
8. banya-country-retreat / warm stone and steam abstraction / sand;
9. shashlik-friends / fire and plate geometry, no real dish claim / ember;
10. fine-dining / refined table landscape, clearly distinct from 09 / brass;
11. coffee-quiet-evening / cup circle and low-amplitude steam / coffee brown;
12. exhibition-contemporary-art / frame and light portal / ultramarine;
13. cinema / projection beam and dark acoustic volume / muted cobalt;
14. workshop-creativity / clay, thread and tool composition / terracotta;
15. walk-architecture / route ribbon around abstract steppe geometry / frost blue.

### P-FEED-14 / P-DETAIL-20 · generic event fallback

```text
3:4 editorial event-category illustration for a contemporary indoor cultural evening, abstract light, acoustic curves, fabric and architectural folds, no performer faces, no real venue, calm daylight-to-evening transition, top/center focal point, clean lower transition area. It must read as an illustration, not documentary photography.
```

### P-PLACE-21 · generic place fallback

```text
3:4 honest place-category illustration for a creative studio in Astana, tactile clay tools and warm neutral interior abstraction, no real venue claim, no people, no schedule, center focal point, lower zone clear for an Illustration label.
```

### P-MOVIE-22 · недостающий киноэкран

```text
3:4 posterless cinema artwork, abstract projection beam crossing a dark acoustic volume, deep jade, muted cobalt and warm ivory, contemporary Kazakhstan city-culture mood without folklore, no film characters, no title, no typography, no franchise likeness, clean area for code-rendered film metadata. Designed as a neutral fallback, not a real movie poster.
```

Зачем: экран 22 обязан работать без права на оригинальный постер. Название фильма, кинотеатр, язык, сеанс и цена накладываются кодом.

### P-ORGANIZER-35 · недостающий вход организатора

```text
3:4 event-creation atmosphere, modular stage blocks, calendar plane, contact ribbon and audience-space circles, no people, no logos, no real venue, modern civic Astana design, matte jade and warm ivory materials, one lime connector, central 70 percent focal and quiet lower 20 percent.
```

Зачем: объясняет создание события, не изображая существующего организатора и не обещая публикацию.

### P-ALMATY-44 · недостающий следующий город

```text
3:4 abstract Almaty expansion artwork, layered foothill planes, crisp morning air, pale mineral stone, cool blue-green mist, one deep-jade route ribbon, same tactile editorial material as the Astana set, no real skyline, no tourist cliché, top/center focal and quiet lower 30 percent.
```

Зачем: сообщает о будущем расширении, не создавая впечатление, что Алматы уже поддерживается.

## 11. Export presets

| Preset | Формат | Размер | Quality / назначение |
|---|---|---|---|
| `master-raster` | PNG, sRGB | 1200×1600 (3:4), 1024×1024, 1600×800 | lossless source, не грузится клиентом |
| `mobile-3x` | AVIF + WebP | max 1200×1600 | AVIF q≈55–65, WebP q≈78–84 |
| `mobile-2x` | AVIF + WebP | display box ×2; 3:4 обычно 800×1067 или 1080×1440 | основной `srcset` |
| `thumb-2x` | AVIF + WebP | 224–248 display → 496 px wide | horizontal feed cards |
| `square-2x` | AVIF + WebP | 96–112 display → 224 px; export 256×256 | map/list preview |
| `og/social` | PNG/WebP | 1200×630 | только отдельный approved composition |
| `ui-vector` | SVG | `viewBox 0 0 24 24` or intrinsic wordmark | optimized paths, currentColor |

Rules:

- `<picture>`: AVIF → WebP → PNG/JPEG fallback.
- Preserve master; derived exports are reproducible and carry the manifest reference.
- Strip GPS/EXIF from public derivatives, preserve copyright metadata in provenance DB/manifest.
- No image upscale above master. No PNG for photographic client delivery unless transparency is required.
- `@2x` means twice the CSS display box, not filename-only duplication.
- SVGs run through trusted optimizer; retain `viewBox`, remove embedded bitmap, scripts, external references and editor metadata.

## 12. Asset QA checklist

### Visual consistency

- [ ] Same winter daylight, matte material and depth across generated set.
- [ ] Lime is a restrained state accent, not a large background.
- [ ] 15 interest cards are distinguishable at 160 px thumbnail size.
- [ ] Kazakhstan context is contemporary and diverse without costume/yurt cliché.
- [ ] No baked text, numeral, map, marker, button, logo, poster title or venue claim.
- [ ] Lower safe zone remains readable under real code gradient and two-line RU/KZ title.

### UI icons

- [ ] Only Lucide or reviewed custom SVG is used.
- [ ] Same action has the same glyph everywhere.
- [ ] Every icon-only control has accessible name and 44×44 target.
- [ ] Active/disabled/focus/error states pass contrast and are not color-only.
- [ ] Dock is exactly home/search/map/profile; gear is in header.
- [ ] `Bookmark` means save; `Heart` means interest; `X` left swipe means skip, not dislike.

### Media integrity

- [ ] Real entity media has source URL, author/license, retrieval date and allowed-use flags.
- [ ] Unknown license never reaches public UI.
- [ ] Generated illustration is labelled and never used as evidence.
- [ ] Candidate detail, feed, map and chat reuse one media identity/provenance.
- [ ] Crop focal point works in 3:4, 4:3 and 1:1 without misleading content.
- [ ] Public derivatives contain no GPS/EXIF or user identifiers.

### Technical exports

- [ ] AVIF, WebP and fallback render in target browsers.
- [ ] @2x dimensions match CSS boxes; no accidental 4–8 MB delivery files.
- [ ] SVG contains no scripts, embedded raster, external URLs or fixed black fill where `currentColor` is required.
- [ ] Layout at 360×800, 390×844 and 430×932 has no clipped title or dock overlap.
- [ ] 200% text expansion does not rely on raster UI.
- [ ] Reduced-motion path has no route drawing, indicator travel or pulses.

### Data honesty

- [ ] Media kind is visible to rendering code: licensed photo vs category illustration.
- [ ] Unknown price/time/availability is not inferred from artwork.
- [ ] Movie fallback is not presented as an official poster.
- [ ] Almaty asset is marked coming-next, not live coverage.
- [ ] Provider/brand names are text links with `ExternalLink`, not improvised logos.

## 13. Передача frontend-инженеру

1. Импортировать иконки только именованными exports из `lucide-react` через один `Icon` adapter с tokens size/stroke/state.
2. Создать semantic wrappers: `IconButton`, `StatusIcon`, `BottomDockIcon`, `MapMarker`, `MediaFrame`.
3. `MediaFrame` принимает `kind`, `alt`, `attribution`, `focalPoint`, `fallbackCategory` и показывает label для illustration.
4. Не использовать `design/generated/app-screens/*.png` в production DOM.
5. До подключения нового raster-slot добавить его в `design/qettyq-asset-manifest.json`, указать ratio, rights и fallback.
6. Любой новый custom glyph проходит проверку на 16/20/24 px, contrast и screen-reader name.

