# QETTYQ — инструкция для генерации экранов веб‑приложения

Версия: 1.0  
Базовый canvas: `430 × 932 px` (iPhone 14 Pro Max viewport, без рамки телефона)  
Дополнительная проверка: `390 × 844` и `360 × 800`  
Источник структуры: `design/QETTYQ_44_ARTBOARD_SPEC.md`

## 1. Что именно генерируем

Генерируем не рекламные слайды и не «картинку телефона», а визуальные эталоны
реальных состояний адаптивного web app. Каждый экран после утверждения
воспроизводится компонентами React/CSS. Растровый mockup задаёт композицию,
свет, глубину и плотность, но не является источником данных или текста.

## 2. Неподвижные правила серии

- Один viewport `430 × 932`, без корпуса смартфона, browser chrome и полосы прокрутки.
- Safe area: сверху 24 px, снизу 24 px; боковые поля 22 px.
- Header: 64 px. Bottom navigation: 88 px, когда она нужна.
- Pearl background `#F4F2EA`; main ink `#101512`; deep jade `#0B3B32`;
  accent lime `#C9FF42`; muted ink `#68736F`; warning `#FFF2C8`.
- Радиусы: 30 px для sheet, 24 px для карточек, 18 px для control,
  полный pill для chips и главных компактных кнопок.
- Liquid glass только для плавающих controls, bottom sheet и navigation:
  полупрозрачная молочная поверхность, тонкий внутренний highlight,
  слабое размытие, мягкая полутень. Не превращать весь экран в стекло.
- Фотографии и category art остаются матовыми и редакционными; интерфейс над
  ними — точный, спокойный, без glossy-plastic эффекта.
- Современный Казахстан через людей, климат, пространство и архитектурный
  ритм; без национального костюма, юрт и декоративного фольклорного клише.
- Астана — пилот. Алматы показывается только как следующий город.

## 3. Правило против галлюцинаций

- Не впекать в изображение длинный текст, цены, время, адреса, названия
  заведений, рейтинги, количество мест, дороги и реальные афиши.
- Допустимы только короткие стабильные labels: `QETTYQ`, `Астана`, номера шага,
  названия режимов. Финальный текст накладывается кодом.
- Карта, polyline, атрибуция и геопозиция рисуются настоящим map component.
  В mockup карты оставлять нейтральный структурный слой без названий улиц.
- Фото конкретного события берётся только из разрешённого источника.
  Для дизайн-эталона используется честная category illustration.
- Unknown остаётся unknown. Нельзя рисовать вымышленную цену или наличие мест.

## 4. Общий prompt prefix

```text
Use case: ui-mockup.
Asset type: production visual reference for a responsive mobile web app screen.
Primary request: QETTYQ city leisure companion interface for Astana.
Style/medium: shippable product UI mockup, not concept art, not a presentation slide.
Composition/framing: exact 430:932 portrait viewport, full-bleed app canvas, no phone frame, no browser chrome, no scrollbar.
Visual system: winter pearl canvas, deep steppe-jade structure, one restrained acid-lime signal, tactile matte imagery, soft daylight, subtle depth and half-shadows, modern Kazakhstan without literal folklore, premium and calm.
UI materials: liquid glass only on floating controls, sheets and navigation; thin inner highlight; soft blur; restrained shadow.
Typography: bold modern grotesk hierarchy with reserved text blocks; exact copy will be rendered in React.
Constraints: practical touch targets, consistent 22 px margins, 64 px header, 24 px card radius, realistic product density, no invented facts.
Avoid: phone hardware frame, presentation layout, legible fake event data, fake map labels, fake venue, fake ticket, brand logos, watermark, purple AI gradient, generic SaaS dashboard, neon cyberpunk, glossy plastic, excessive glassmorphism, folklore cliché, clutter.
```

## 5. Двухслойный процесс

Для каждого artboard обязательны два слоя:

1. `visual reference` — PNG с композицией, глубиной и состоянием.
2. `screen contract` — точный текст, размеры, интеракции, источник данных,
   empty/loading/error states. Контракт хранится в
   `design/generated/app-screens/manifest.json` и в 44-artboard specification.

Если текст в PNG и screen contract расходятся, верен screen contract.

## 6. Порядок производства

### Волна 1 — шесть визуальных якорей

`02 home` → `05 swipe` → `14 feed` → `16 map` → `20 detail` → `24 route`.

После неё сравнить header, radius, shadows, typography, bottom navigation и
плотность на трёх viewport. Только затем продолжать.

### Волна 2 — основной P0

`03–13`, `17–19`, `21`, `25–29`, `32–34`, `42–43`.

### Волна 3 — расширение

`22–23`, `30–31`, `35–41`, `44`.

## 7. Motion contract для последующей вёрстки

- Page enter: opacity `0 → 1`, translateY `8 → 0`, 220 ms.
- Card press: scale `1 → 0.98`, 120 ms.
- Sheet: spring-like 320–420 ms, без overshoot больше 6 px.
- Swipe: карта следует за pointer; выбор после 28% ширины; rotation до 6°.
- Marker select: один ripple 450 ms, не бесконечная пульсация.
- Route draw: 750 ms; reduced-motion показывает финал без анимации.
- Loading: движется только активная стадия. Никакого бесконечного общего spinner.

## 8. Контроль качества каждого PNG

- Это экран приложения, а не рекламный постер.
- Нет корпуса телефона и scrollbar.
- Нет вымышленных фактов и нечитаемого псевдотекста в важных областях.
- Touch targets не меньше 44 px.
- Primary action визуально одна.
- Нижняя навигация и sheets не конфликтуют с safe area.
- Контраст и иерархия работают без кислотного акцента.
- Экраны выглядят одной системой, а не шестью разными концептами.

