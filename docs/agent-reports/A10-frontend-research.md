# A10 — независимый аудит premium city UI

Дата: 19 октября 2026 года, `Asia/Aqtobe`  
Основа аудита: commit `66dffb5` + текущее незакоммиченное состояние рабочего дерева  
Проверено: `/`, выбор ограничений, 15 карточек, результаты, план, карта событий; Chromium `390×844` и `1440×900`; обычный и reduced-motion режимы. Исходники приложения не изменялись.

## Короткий вердикт

QETTYQ уже выглядит как аккуратный интерактивный прототип, а desktop-экран событий — как начало настоящего city-продукта. Но до уровня premium map-first приложения остаётся архитектурный разрыв: карта живёт отдельным каталогом событий, персональные рекомендации и план живут отдельным wizard, а «помощник» пока визуально обещает диалог, которого фактически нет.

Главный следующий шаг — не добавлять ещё стекла, градиенты и motion-эффекты. Нужно сделать карту общей рабочей поверхностью, а чат, фильтры, события и план — состояниями одной панели над ней.

**Рекомендуемое направление:** _«спокойный картографический workbench Астаны: карта — постоянный городской холст, глубокий нефритовый цвет — навигация, лаймовый — только подтверждённое/выбранное, тёплый песочный — неизвестность; один адаптивный rail/bottom sheet вместо набора отдельных экранов»._

## Что уже работает визуально

- Ясная иерархия, хороший крупный кириллический набор, уверенный контраст заголовков.
- Desktop explorer уже имеет правильную основу: rail слева, интерактивная карта справа, связанная карточка выбранного события, видимая атрибуция.
- Интерфейс честно разделяет snapshot, неизвестную цену, приблизительный путь и внешний источник.
- У всех ключевых touch-действий есть кнопки; карточки интересов не требуют жеста для прохождения.
- Reduced motion фактически работает: в браузерной проверке ambient и stage-анимации стали `0.01ms`, transform отсутствовал, console/page errors — `0`.
- Нормальная мобильная ширина: при `390px` горизонтального overflow не обнаружено.

## Где текущая версия теряет premium/map-first качество

### Первый контакт на телефоне

При `390×844` стартовая страница имеет высоту `1489px`. Над fold видны обещание, поле и быстрые категории, но карта и CTA карты событий находятся ниже длинного блока помощника. Это хороший marketing-first экран, но не city utility: человек ещё не видит город и не понимает географический контекст.

Фраза «2 минуты на выбор» выглядит как измеренная продуктовая метрика, хотя подтверждения нет. Обязательные 15 реакций создают высокий порог; текущий PRD исходно допускал более короткий выбор и быстрый переход к результату.

### Карта

Desktop-карта — сильная часть. На мобильном сначала показан весь список событий, и только затем карта высотой `540px`; выбор события в верхнем списке меняет состояние карты вне viewport. Поэтому мобильный экран остаётся list-first.

В `CityMap` изменение `activeId` полностью пересоздаёт Leaflet map. Это сбрасывает пользовательский pan/zoom и создаёт ненужную работу. Два события Национального музея имеют одинаковые координаты, поэтому маркеры накладываются. Apple рекомендует сохранять видимый географический контекст при открытии карточки и кластеризовать перекрывающиеся POI: [Apple HIG — Maps](https://developer.apple.com/design/human-interface-guidelines/maps).

Core-рекомендации не отображаются на карте. Экран «план» показывает честную временную шкалу, но не пространственный контекст. Map-first оболочка пока относится только к отдельному event snapshot.

### Чат и ввод намерения

Поле «Что хочется сегодня?» и mini-chat выглядят как AI chat, но первое запускает несколько регулярных выражений, второе — только фильтрует строки списка. Кнопка «Найти» во втором поле не делает отдельного действия. Формулировка «опишите план помощнику» завышает текущую способность интерфейса.

Premium-вариант не обязан быть LLM-чатом. Достаточно честного structured composer: текст → видимые chips «прогулка», «120 мин», «до 5000 ₸», «от Байтерека» → один уточняющий вопрос только для недостающего ограничения.

### События

Плюсы: даты, площадка, цена/unknown и внешний маршрут показаны компактно. Минусы: ссылки ведут на общие страницы афиши, а не на конкретное событие; нет видимого времени последней проверки отдельной записи; нет фильтров «сегодня / завтра / выходные»; нет связи события с временным бюджетом пользователя. Два события одной площадки визуально конфликтуют на карте.

### Маршрут

Текущий экран корректно признаёт приблизительность и не рисует ложную route line. Это лучше красивой выдумки. Но продуктовый финал слаб: основной CTA открывает источник, а не маршрут; карта отсутствует; нет состояния «точного маршрута нет — открыть внешнюю карту» рядом с пространственной схемой.

Ссылка `https://www.google.com/maps/dir/?api=1...` допустима как внешний cross-platform переход и не требует browser key; это отличается от встраивания Google Maps: [официальная документация Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

### Accessibility

Наблюдаемое accessibility tree выявило конкретные дефекты:

- slider времени имеет имя только `"120"`, а не «Свободное время»;
- mini-chat textbox называется placeholder-текстом, отдельного label нет;
- Leaflet-маркеры называются только «1», «2», «3», «4», без названия события;
- active event/pin не имеет `aria-selected`, `aria-current` или `aria-pressed`; различие в основном цветовое;
- footer-ссылки имеют высоту около `12px`, кнопка поиска — `32×32`, back — около `34px`;
- смена stage не переводит фокус в новый заголовок;
- ошибки рекомендаций не объявляются собственным live region;
- карта — фокусируемый generic `div`; список служит хорошей альтернативой, но связь map/list для screen reader не объявлена.

WCAG 2.2 требует минимум `24×24 CSS px` либо достаточный spacing exception, а для привычного мобильного качества стоит принять `44×44` для основных touch targets: [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Текст до 17 pt должен выдерживать 4.5:1: [W3C Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### Motion

Постоянные 18/22-секундные ambient-анимации добавляют «дорогой фон», но не объясняют состояние и расходуют визуальное внимание. Motion должен показывать связь списка с pin, раскрытие sheet и изменение маршрута. Apple рекомендует краткое, точное и опциональное движение, не задерживающее частые действия: [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

Текущая реализация хорошо отключает декоративное движение через `prefers-reduced-motion`; это нужно сохранить. Для reduced motion панель должна появляться через fade/color shift, а не scale/rotate/large translate.

## Целевая информационная архитектура

### Mobile

```text
┌─────────────────────────────────┐
│ QETTYQ        Астана ▾   locate │
│                                 │
│       interactive city map      │
│   clustered pins / route / ETA  │
│                                 │
│                    recenter  ◎  │
├──── drag handle ────────────────┤
│ Что хочется сегодня?        →   │
│ [Сейчас] [120 мин] [≤5000 ₸]    │
│                                 │
│ selected place / 1–3 results    │
│ source · unknown · route state  │
└──────── safe-area composer ─────┘
```

- Карта занимает первый viewport, sheet имеет состояния collapsed / half / full.
- На collapsed видны composer, контекст и выбранная карточка; полный список открывается вверх.
- Выбор list item подсвечивает pin и сохраняет map camera; выбор pin раскрывает ту же карточку.
- 3–5 реакций достаточно для первой выдачи; «Показать варианты сейчас» доступно всегда. Остальные реакции — опциональное уточнение.

### Desktop

```text
┌────────────── 420–460px rail ──────────────┬──── flexible map ────┐
│ composer + parsed context                  │ pins / clusters       │
│ assistant question or filters              │ selected geometry     │
│ synchronized cards                         │ route / uncertainty   │
│ provenance and source state                │ floating place card   │
└─────────────────────────────────────────────┴───────────────────────┘
```

Не делать отдельный «красивый помощник» рядом с отдельной картой. Rail и есть помощник.

## Визуальная система

### Токены

| Роль | Предложение | Правило |
|---|---|---|
| City canvas | `#F3F6F4` | Нейтральный фон только за картой/sheet, не самостоятельный hero-градиент. |
| Deep ink | `#0E2F2A` | Навигация, primary action, выбранные pin. |
| Civic jade | `#087F6D` | Links, focus-support, location/context; не заливать им всё. |
| Feasible lime | `#C7F36A` | Только feasible/selected/confirmed. Не использовать для unknown. |
| Unknown sand | `#E7C982` | Unknown price/schedule/source freshness с текстовой подписью. |
| Error brick | `#A64032` | Отказ provider/invalid constraint, всегда вместе с текстом/иконкой. |

Типографику можно оставить системной ради скорости и хорошей кириллицы, но убрать шаблонные признаки: меньше огромных рекламных заголовков внутри task UI, больше числовой иерархии для времени/цены/расстояния. Не добавлять новый шрифт без явной OFL/коммерческой проверки.

Использовать только три радиуса: `12` controls, `18` content cards, `28` верхние углы mobile sheet. Сейчас почти каждый блок — отдельная большая rounded/glass card, из-за чего продукт приближается к generic SaaS kit.

## Приоритеты и acceptance criteria

### P0 — до публичного map-first показа

1. **Объединить map, recommendations и plan.**
   - На `390×844` карта видна в первом viewport и занимает не менее 40% его высоты.
   - Выдача 1–3 мест отображает синхронные pins; выбранный result и pin имеют один ID.
   - Plan показывает точки старта/места; route line рисуется только при реальном routing evidence. Fallback называется «прямая оценка», не «пеший маршрут».

2. **Исправить mobile hierarchy.**
   - Composer, город, ручной location mode и один primary action видны без vertical scroll.
   - Event list живёт в sheet; выбор события из списка автоматически оставляет его pin и card видимыми.
   - Контент не перекрывается `env(safe-area-inset-top/bottom)` на iPhone-like viewport.

3. **Стабильная map/list синхронизация.**
   - Выбор другого события не пересоздаёт map instance и сохраняет пользовательский zoom/center.
   - Одинаковые/близкие координаты кластеризованы или раскрываются spiderfy; обе записи доступны мышью, touch и клавиатурой.
   - Active list item имеет `aria-selected=true`, marker получает accessible name вида «Выставка BETAŞAR, до 31 октября».

4. **Честный composer вместо fake chat.**
   - Введённый текст показывает распознанные параметры chips или прямо сообщает, что применён только keyword-filter.
   - UI не пишет «помощник спросит/объяснит», если ответа/уточнения действительно не происходит.
   - «Найти» имеет observable action либо удаляется; Enter и button дают одинаковый результат.

5. **Данные события и provenance.**
   - Каждая event card содержит event-specific URL, `checked_at`, timezone и status; общая homepage не считается достаточным evidence.
   - Unknown price не стилизован как confirmed; просроченная запись не показывается активной.
   - При tile/provider failure список и источники остаются доступны, а карта показывает явный fallback state.

6. **Tile/legal gate.**
   - Атрибуция `© OpenStreetMap contributors` полностью видна при любом sheet state; сейчас на mobile край текста визуально обрезается.
   - Не использовать `{s}.tile.openstreetmap.org`: текущая OSM policy требует точный `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, валидный Referer/User-Agent и cache headers. Для публичного трафика выбрать согласованный tile provider или self-hosting: [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).
   - Автотест подтверждает отсутствие prefetch/offline bulk download.

7. **Accessibility gate.**
   - Все input/slider имеют visible label + accessible name; все icon-only buttons — уникальный name.
   - Все controls ≥24×24; primary mobile controls ≥44×44.
   - Keyboard проходит list, markers, zoom, sheet и CTA без trap; нет gesture-only действия.
   - После смены stage фокус ставится в новый `h1/h2` или landmark; dynamic result/error объявляется через `aria-live`.
   - 200% browser zoom и ширина `320px` не обрезают текст/CTA; normal text ≥4.5:1, large text/UI graphics ≥3:1.

### P1 — premium polish после P0

1. **Сократить onboarding:** первая полезная выдача доступна после 3–5 сигналов или сразу; прогресс не принуждает к 15 карточкам.
2. **Событийные фильтры:** «сегодня», «завтра», «выходные», цена, расстояние; каждый filter state отражается и в pins, и в list.
3. **Motion vocabulary:**
   - pin↔card selection 160–220ms;
   - bottom sheet spring только по direct manipulation;
   - route reveal один раз после подтверждённого расчёта;
   - убрать постоянные ambient loops или сделать их статичными по умолчанию;
   - reduced-motion: без scale/rotate/map fly, только instant/fade ≤100ms.
4. **Состояния карты:** loading skeleton без fake tiles, offline/error, empty filtered area, selected cluster, permission denied/manual location.
5. **Product copy:** убрать неподтверждённое «2 минуты» либо подкрепить измерением; emoji-категории заменить единой icon-системой, если требуется более зрелый тон.

### P2 — расширение

- Переключатель KZ/RU после готовой локализации, а не декоративный toggle.
- Saved plan/history только после реализации удаления данных и понятного retention.
- Dark/high-contrast mode после прохождения основного contrast/reflow gate.
- Сложные WebGL/3D эффекты не нужны: они не улучшают решение городской задачи.

## Рекомендации по библиотекам и лицензиям

| Инструмент | Рекомендация | Лицензионный/продуктовый риск |
|---|---|---|
| Leaflet | Оставить для P0: текущему объёму хватает, bundle/модель простые. | BSD-2-Clause, требуется сохранить notices; лицензия библиотеки не даёт права на tiles: [Leaflet LICENSE](https://github.com/Leaflet/Leaflet/blob/main/LICENSE). |
| MapLibre GL JS | Рассмотреть в P1 только если нужен собственный vector style, smooth route layers и native clustering. | BSD-3-Clause с notices; style, glyphs, sprites и tile provider лицензируются отдельно: [MapLibre LICENSE](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt). |
| Motion | Оставить. Использовать для sheet/layout state, не для фонового spectacle. | Пакет MIT: [motion package metadata](https://github.com/motiondivision/motion/blob/main/packages/motion/package.json). |
| Motion Primitives | Брать только отдельные patterns после accessibility review. | MIT, но copy-paste код становится нашей ответственностью: [LICENSE](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md). |
| Magic UI / 21st.dev | Использовать как composition reference; не добавлять warp/shimmer ради «premium». | Magic UI отмечен MIT, но у каждого внешнего asset/dependency нужна отдельная проверка: [официальная GitHub-организация](https://github.com/magicuidesign). У 21st.dev проверять лицензию конкретного компонента. |
| Vaul | Не брать как новую критическую основу sheet. | MIT, но repository прямо помечен unmaintained; риск поддержки: [Vaul repository](https://github.com/emilkowalski/vaul). Предпочесть поддерживаемый dialog primitive либо собственный sheet поверх проверенного WAI-ARIA dialog. |

Для модального sheet обязательны focus containment, Escape, возврат фокуса и accessible title, как в [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/). Немодальный half-sheet над интерактивной картой не должен ложно получать `aria-modal=true`.

## Референсы: что заимствовать, а что нельзя копировать

- **Apple Maps/HIG:** интерактивная карта, muted emphasis под информационный overlay, clustering, сохранение видимой выбранной точки, place card рядом с географией. Нельзя копировать Apple assets, logo, exact map style или HIG artwork; Apple отдельно лицензирует design resources.
- **Yandex Go:** ориентир на «за несколько taps»: pickup/destination, заранее видимые ограничения/оценка, карта как операционный слой. Это подтверждается текущим публичным описанием продукта, а не разрешением копировать интерфейс: [Yandex Go в Google Play](https://play.google.com/store/apps/details?id=ru.yandex.taxi). Нельзя копировать бренд, жёлтую систему, иконки, screenshots или proprietary map assets.
- **Современные map-first apps:** постоянный spatial context + movable information surface. Заимствовать interaction grammar, не пиксели.

## Definition of done для следующего дизайн-прохода

Проход считается завершённым только если:

- mobile screenshot первого viewport уже объясняет «где я / что искать / что нажать» без scroll;
- основной recommendation flow и events используют одну map shell;
- E2E проверяет pin↔card sync, сохранение camera, tile failure, manual location, reduced motion и keyboard-only путь;
- Axe/ручной accessibility audit не находит unnamed form controls/markers и focus loss;
- карта сохраняет полную attribution во всех sheet states;
- ни одно событие, цена, route line или chat-ответ не создаётся только ради красивой демонстрации.
