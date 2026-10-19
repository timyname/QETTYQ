# A19. Пресеты визуальных ассетов QETTYQ

Дата: 19 октября 2026 года
Назначение: Astana pilot, мобильные экраны 360–430 px

## Визуальный принцип

QETTYQ выглядит как современный городской журнал Астаны: спокойный, светлый, с глубоким зелёным, одним лаймовым акцентом и точной информационной иерархией. Атмосфера создаётся типографикой, геометрией и качественными category illustrations. Реальные места и события показываются только проверенными фотографиями с правами и атрибуцией.

Нельзя использовать AI-изображение как доказательство вида конкретного места, блюда или события. Сгенерированный ассет всегда имеет тип `category_illustration` и визуально отличается от `real_place_photo`.

## Аудит существующих референсов

| Файл | Можно взять | Нельзя переносить в продукт как факт |
|---|---|---|
| `iphone-onboarding-v1.png` | Композицию колоды, крупный CTA, зелёно-лаймовую иерархию | Синтетическую панораму Астаны и здания как реальные фотографии; claim `2 минуты` как измеренную метрику |
| `iphone-map-v1.png` | Идею map-first и bottom sheet | Нарисованную карту, названия, цены, время, события и маршрут без источников |
| `iphone-route-chat-v1.png` | Последовательность плана и связь карты с шагами | Бейджи `Проверено`, фотографии, длительности и маршрут без evidence |

Эти три файла остаются mood references, не production media.

## Реестр типов ассетов

| Тип | Назначение | Разрешённый источник | Хранение и attribution | Fallback |
|---|---|---|---|---|
| `category_illustration` | Идеи и категории | Собственная генерация или собственная графика | Хранить prompt/version; подпись не обязательна, но тип виден в данных | Геометрический gradient preset |
| `real_place_photo` | Конкретное место | Владелец/организатор с разрешением, допустимый API, конкретный Commons asset | Автор, source page, license, retrieved-at, allowed use | Category illustration с меткой `Иллюстрация` |
| `real_event_photo` | Конкретное occurrence/event | Официальный organizer media kit с правом использования | Event ID, автор/правообладатель, URL, valid scope | Posterless event layout |
| `real_dish_photo` | Конкретное блюдо | Подтверждённое меню/владелец с правом | Связь с venue/menu revision | Нейтральная food illustration |
| `map_tiles` | Географический фон | Выбранный лицензированный provider | Видимая attribution, cache policy | Список результатов |
| `venue_marker` | Маркер POI | Собственный SVG/CSS | Без внешних прав | Номер в круге |
| `ui_icon` | Системное действие | Lucide из установленного пакета | ISC/MIT license сохраняется в dependency | Текстовая подпись |
| `brand_pattern` | Атмосфера | Собственный SVG/CSS | Без внешних прав | Однотонный фон |

## Production-пресеты

### P01. Idea card hero

- Размер master: `1536×2048`, 3:4.
- Кропы: `1200×1600`, `960×1280`, `720×960` WebP/AVIF.
- Safe text zone: нижние 34% без ключевых деталей.
- Стиль: редакционная 3D-бумага или тактильная архитектурная абстракция, мягкий дневной свет, один предметный символ, без текста и логотипов.
- Контрастный overlay создаётся CSS, не запекается в изображение.
- Максимальный вес mobile: 180 KB для 720×960.
- `alt`: описывает идею, не стиль генерации.

Базовый prompt:

```text
Editorial urban activity illustration for QETTYQ, Astana-inspired geometry without depicting a specific real venue, tactile paper and matte ceramic forms, calm winter daylight, deep jade and warm ivory palette with one acid-lime detail, generous lower negative space for UI copy, premium mobile magazine composition, no text, no logos, no people identifiable, 3:4 portrait.
```

Negative prompt:

```text
real venue claim, recognizable trademark, fake map, legible text, event poster, ticket price, glossy plastic SaaS render, neon cyberpunk, excessive glassmorphism, dating app imagery, faces, watermark.
```

### P02. Category variants

Использовать одну систему света и материалов. Менять только главный символ и мягкий category tint.

| Category ID | Символ | Accent | Не изображать |
|---|---|---|---|
| `culture` | Арка, сценическая складка | `#A8B8E8` | Реальный театр/экспонат |
| `music` | Волна, струна, акустический объём | `#C0A7DD` | Артиста или афишу |
| `exhibition` | Рама, световой портал | `#86C9C2` | Реальную работу художника |
| `food` | Тарелка как абстрактный рельеф | `#F2BE83` | Конкретное блюдо ресторана |
| `coffee` | Пар и круг чашки | `#C7A27F` | Логотип кофейни |
| `walk` | Лента маршрута без карты | `#91C89A` | Ложную route geometry |
| `parks` | Слоистый лист/ландшафт | `#78B984` | Конкретный парк |
| `architecture` | Силуэт-абстракция степной геометрии | `#9CB8C8` | Копию известного здания |
| `active` | Динамическая дуга | `#F0A48E` | Опасный трюк |
| `workshop` | Глина, нить, инструмент | `#D1A27C` | Обещание свободного сеанса |
| `family` | Модульные фигуры | `#E7C875` | Изображения детей без оснований |
| `indoor` | Мягкий световой купол | `#A5B4C8` | Конкретный интерьер |
| `free` | Открытая рамка | `#C9E766` | Символ денег с обещанием 0 ₸ |
| `new` | Неожиданное сочетание форм | `#E2A6B6` | Бейдж `новое`, если это не факт |
| `quiet` | Волна низкой амплитуды | `#A8C4BE` | Утверждение о тишине места |

### P03. Honest placeholder

- Формат: SVG/CSS, без растра.
- Фон: `surface` + category tint 12%.
- В центре: один контурный glyph 40 px.
- Подпись внутри медиазоны: `Иллюстрация категории`.
- Не использовать иконку камеры с крестом: отсутствие фото не является ошибкой.

### P04. Event posterless card

- Соотношение: 4:3 или горизонтальный блок 16:9.
- Содержимое: крупная дата, category glyph, название и площадка на типографическом фоне.
- Никаких AI-сгенерированных артистов, сцены, билетов или логотипов.
- Цена, язык, возраст и время только в data area, не запечены в изображение.

### P05. Real photo treatment

- Фотография не содержит UI-текста.
- Crop focal point задаётся метаданными, не destructive edit.
- Overlay: `linear-gradient(180deg, transparent 45%, rgba(10,29,25,.72))` только если поверх фото есть короткий заголовок.
- В деталях доступна attribution: автор, источник, лицензия.
- Если право хранения не подтверждено, хранится URL страницы, но не скачанный файл; в UI используется placeholder.

### P06. Map marker set

- Marker base: 36×44 px; selected: 44×52 px.
- Номер результата, не emoji.
- Цвета: default `#143A34`, selected `#D7F77B`, uncertain `#FFF0C2`, unavailable `#B9C1BE`.
- Status не выражается только цветом: uncertain содержит `?`, unavailable скрывается из основных результатов.
- Cluster показывает количество, а не рейтинг.

### P07. Route and feasibility

- `network`: сплошная линия 4 px + направления, только из routing provider.
- `estimated`: никакой линии по дорогам; круг радиуса или пунктир между точками с подписью `по прямой`.
- `unknown`: только точки A/POI/B без соединения.
- `feasible`: check + текст `Подходит по расчёту`.
- `uncertain`: alert + конкретная причина.
- Не использовать зелёную «галочку проверки» для просто загруженного поля.

### P08. Brand atmosphere

CSS/SVG, без тяжёлого видео:

- `steppe-grid`: редкая точечная сетка 18 px, opacity 8%;
- `city-orbit`: две тонкие эллиптические линии вокруг hero;
- `q-arch`: собственная абстрактная арка, не копия здания;
- `snow-light`: мягкий ivory-to-blue gradient, без анимированных частиц;
- motion: только переходы состояния 180–280 ms; reduced motion убирает вращение и параллакс.

## Токены ассетов

```text
canvas          #F5F8FA
surface         #FFFFFF
ink             #142D35
muted           #536B74
brand           #126C60
brand-deep      #0F3D35
brand-soft      #E2F3ED
accent-lime     #D7F77B
warning-soft    #FFF0C2
danger          #A62D38
line            #D9E4E8
```

Радиусы: control 12, panel 18, discovery 28. Тени используются только для слоя выбора и bottom sheet, без постоянного стеклянного размытия.

## Имена файлов и manifest

```text
assets/
  ideas/{category}/{variant}-{width}.avif
  placeholders/{category}.svg
  events/{source-id}/{event-id}/{asset-id}.webp
  places/{source-id}/{place-id}/{asset-id}.webp
  brand/{pattern}.svg
```

Обязательные поля manifest:

```yaml
id:
type: category_illustration | real_place_photo | real_event_photo | real_dish_photo
entity_id: null
source_page: null
author: null
license: owned | permission | cc-by | cc-by-sa | api-display-only
allowed_use: local_store | hotlink | runtime_only
retrieved_at:
valid_until: null
prompt_version: null
content_hash:
alt_ru:
alt_kk: null
focal_point: 0.5,0.5
review_status: approved | pending | rejected
```

## QA перед использованием

- Ассет не выдаёт иллюстрацию за фотографию реального объекта.
- Для реального фото есть source page и конкретная лицензия/permission.
- Название файла и metadata не содержат секретов или персональных данных.
- На фото нет неподтверждённой цены, даты или языка события.
- Кроп работает на 360×800 и 430×932, текст не перекрывает главный объект.
- WebP/AVIF имеет JPEG fallback только при реальной необходимости.
- `alt` описывает содержимое, а декоративный ассет имеет пустой `alt`.
- Motion имеет reduced-motion вариант.
- Карта не является AI-изображением.
- Lucide license остаётся в dependency notices.

## Минимальный пакет P0

1. 15 category illustrations по P01/P02.
2. 15 SVG placeholders по P03.
3. Один posterless event template P04.
4. Marker set P06 со всеми состояниями.
5. Route/status language P07.
6. Два brand patterns P08.
7. Ни одного неподтверждённого real-place asset до заполнения manifest.
