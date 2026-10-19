# QETTYQ — спецификация 44 дизайн-макетов для генерации и вёрстки

**Дата:** 20 октября 2026 года

**Основа:** `docs/PRODUCT_UI_MASTER_SPEC.md`

**Пилот:** Астана

**Следующий город:** Алматы

**Основной canvas:** 430 × 932 px

## 1. Сколько экранов нужно нарисовать

В продукте описано **26 функциональных экранных модулей S00–S25**. Одного макета на каждый модуль недостаточно: свайп, контекст, карта, чат, маршруты, кино и создание события имеют визуально разные состояния.

Поэтому минимальный комплект для качественной передачи в разработку — **44 отдельных artboard**:

| Блок | Artboard |
|---|---:|
| Первый контакт и настройка | 13 |
| Лента, карта и детали | 10 |
| Маршруты, чат и планы | 8 |
| Память, источники и организатор | 10 |
| Системные состояния и следующий город | 3 |
| **Всего** | **44** |

Для полной QA-библиотеки позже добавляются ещё 7 технических состояний: `loading`, `offline`, `stale`, `permission denied`, `provider unavailable`, `session expired`, `delete failed`. Их можно собирать из готовых компонентов без новой арт-дирекции.

## 2. Правило против галлюцинаций

### 2.1. Что можно генерировать моделью изображений

- 3:4 category illustrations для 15 свайпов;
- нейтральные background/hero-изображения без фактических данных;
- абстрактные Astana/Almaty atmosphere assets;
- posterless графику без текста;
- визуальные референсы композиции.

### 2.2. Что нельзя запекать в сгенерированную картинку

- русский, казахский и английский UI-текст;
- цены, даты, время, язык события;
- адреса и контакты;
- логотипы Ticketon, Kino.kz, Google, 2GIS и Яндекс;
- карту улиц и маршрут;
- маркеры событий;
- кнопки и системные иконки;
- фото конкретного реального места без подтверждённого источника;
- афишу реального мероприятия без права использования.

Все эти элементы собираются кодом или в Figma поверх ассета. Иконки — code-native SVG. Карта — реальный map provider. Текст — настоящие текстовые слои.

## 3. Общая арт-дирекция

**Направление:** спокойный редакционный городской помощник Астаны с крупными тактильными карточками, настоящей картой, мягкой глубиной и ограниченным liquid glass.

### 3.1. Цвета

```text
Зимний фон              #F4F6F2
Холодный край градиента #EDF3F5
Белая поверхность       #FFFFFF
Основной текст          #101915
Вторичный текст         #68746F
Разделитель             #DCE4DF
Основной зелёный        #0B6E5D
Тёмный зелёный          #0B332D
Мягкий зелёный          #DCEFE8
Лаймовый акцент         #CFFC55
Коралловый warning      #FF715B
Мягкий warning          #FFF2C8
Ошибка                  #A9343E
```

Лайм используется только для текущего выбора, выбранного маркера и следующего главного действия. Коралловый — только для реального предупреждения.

### 3.2. Фон

Базовый фон большинства экранов не требует изображения:

```css
background:
  radial-gradient(circle at 85% 8%, rgba(185,218,222,.20), transparent 32%),
  linear-gradient(145deg, #F4F6F2 0%, #EDF3F5 100%);
```

Поверх можно добавить 1–2% monochrome noise и редкую точечную сетку 18 px с opacity 4–6%. Это CSS/SVG, а не raster background.

### 3.3. Liquid glass

- Header chip: radius 18 px, blur 18 px.
- Bottom sheet: radius сверху 28–32 px, blur 24 px.
- Floating action: круг 56–64 px.
- Обычная карточка с длинным текстом должна быть белой или непрозрачной на 92–96%.
- Glass не используется как фон всей страницы.

### 3.4. Тени

```text
Карточка выбора: 0 22 50 rgba(11,51,45,.16)
Bottom sheet:    0 -12 42 rgba(11,51,45,.12)
Floating button: 0 12 28 rgba(11,51,45,.15)
Обычный блок:    0 8 20 rgba(11,51,45,.07)
```

### 3.5. Типографика

- Screen title: 36–40 px / 0.98–1.05 / weight 700.
- Section title: 24–28 px / 1.1 / weight 650.
- Card title: 22–30 px в зависимости от размера.
- Body: 16 px / 1.42.
- Meta: 13–14 px / 1.3.
- Button: 16 px / weight 650.
- Minimum legible text: 12 px, только для attribution и timestamps.

Шрифт обязан поддерживать `Ә Ғ Қ Ң Ө Ұ Ү Һ І`.

### 3.6. Постоянная сетка 430 × 932

```text
0–24 px      системная safe area
24–88 px     header
88–838 px    основная рабочая область
838–932 px   bottom navigation + safe area
```

На onboarding/swap экранах bottom navigation отсутствует, а рабочая область продолжается до 916 px.

## 4. Общий prompt prefix

Начинать каждый prompt для визуального ассета с этого блока:

```text
QETTYQ visual system, Astana modern urban editorial mood, winter pearl and cool mist palette, deep steppe jade structure, one restrained acid-lime detail, tactile matte materials, soft daylight, subtle depth and half-shadows, modern Kazakhstan without literal folklore, premium but calm, no text, no logos, no factual map.
```

Общий negative prompt:

```text
legible text, letters, numbers, UI buttons baked into image, real venue claim, fake map, fake event poster, fake ticket, brand logos, watermark, neon cyberpunk, purple AI gradient, generic SaaS illustration, glossy plastic, dating app people, yurt cliché, national costume, clutter, excessive glassmorphism.
```

## 5. Первый контакт и настройка — 13 artboard

### Artboard 01 — Bootstrap

**Модуль:** S00.

**Задача:** короткое восстановление сессии.

**Расположение:**

- Центр экрана: QETTYQ wordmark 112–132 px шириной.
- Под ним абстрактная маршрутная дуга шириной 96 px.
- Нижняя подпись появляется только после 500 мс: «Восстанавливаем твои настройки».

**Кнопки:** после двух секунд — «Продолжить без восстановления», высота 48 px, текстовая secondary button.

**Эффект:** маршрутная дуга прорисовывается один раз за 450 мс. Никакого бесконечного spinner.

**Изображение:** не нужно. Дуга рисуется SVG.

### Artboard 02 — Главный экран

**Модуль:** S01.

**Header 64 px:** QETTYQ слева; chip «Астана» и профиль справа.

**Основная область:**

- Заголовок 38 px: «Как проведём свободное время?».
- Четыре плитки 2 × 2, каждая примерно 187 × 132 px на canvas 430 px.
- Категории: «Поесть», «Погулять», «Заняться чем-то», «Попробовать новое».
- Под сеткой mini-composer 386 × 58 px: «Расскажи, что хочется сегодня».

**Низ:** primary button 386 × 56 px «Настроить подборку»; text button «Посмотреть пример».

**Свойства кнопок:** primary — тёмно-зелёная с лаймовым inner highlight; press scale 0.98 за 120 мс.

**Изображения:** четыре category crops. Они не должны изображать конкретные заведения.

**Prompt ассета:**

```text
Four coordinated square editorial activity illustrations for a premium Astana city companion: food as an abstract ceramic plate landscape, walking as a flowing route ribbon, creative activity as tactile clay and drum forms, discovery as an unexpected architectural portal. Same winter daylight and matte material system, no text, no recognizable venue, 1:1 crops.
```

### Artboard 03 — Выбор города

**Модуль:** S02.

**Формат:** full-height sheet с верхним radius 30 px.

**Верх:** drag handle, заголовок «Выбери город», close 44 × 44.

**Центр:**

- Астана — большая доступная карточка 386 × 180 px.
- Алматы — карточка 386 × 112 px с меткой «Следующий город».
- Строка «Текущее местоположение» отдельно.

**Низ:** «Продолжить с Астаной» 386 × 56 px.

**Изображение:** две абстрактные city-atmosphere полосы, не skyline-фотография.

**Prompt Astana:**

```text
Abstract Astana winter city atmosphere, broad open sky, light futuristic civic geometry, wind-shaped route arc and river-like reflection, ivory, pale blue and jade, no recognizable building, no text, horizontal 2:1 crop.
```

**Prompt Almaty:**

```text
Abstract Almaty foothill city atmosphere, layered pale stone slopes and cool blue-green air, restrained mountain geometry, same QETTYQ material system, no recognizable building, no text, horizontal 2:1 crop.
```

### Artboard 04 — Перед началом 15 выборов

**Модуль:** S03.

**Header:** «Шаг 1 из 2», справа «Пропустить».

**Центр:** заголовок 36 px; текст 16 px; демонстрационная 3:4 карточка 300 × 400 px.

**Низ:** primary «Начать 15 выборов» 386 × 56; text «Сразу перейти к карте».

**Изображение:** одна нейтральная category illustration и две размытые карты позади.

**Prompt:**

```text
Single 3:4 editorial activity illustration for onboarding, abstract cultural architecture and rhythmic stage folds inspired by Astana without showing a real venue, soft winter daylight, strong lower negative space for UI overlay, tactile paper and matte ceramic, no text, no people.
```

### Artboard 05 — Свайп: спокойное состояние

**Модуль:** S04.

**Header:** QETTYQ, `4 из 15`, close.

**Карточка:** 342 × 456 px, центрируется от y=126 до y=582. Следующие карты выступают по 16–24 px с боков и сверху.

**Нижняя треть карточки:** CSS-gradient overlay; метка «Идея»; заголовок до двух строк.

**Действия:** X 64 × 64, undo 44 × 44, heart 64 × 64; «Уже пробовал» text button.

**Низ:** четыре progress segments; после пяти реакций кнопка «Показать варианты сейчас».

**Эффект:** фоновые карты scale 0.96/0.93; тень главной карты выраженнее.

**Изображение:** 3:4 category asset.

**Prompt:**

```text
3:4 QETTYQ category illustration for “Культура и история”, abstract monumental arch and layered stage curtain geometry, Astana winter light, matte stone and paper texture, muted steel-blue category accent, clean lower third, no real monument, no text, no logo.
```

### Artboard 06 — Свайп вправо

**Модуль:** S04 state `like`.

**Отличие:** карта смещена вправо на 96–120 px, rotation +6°. На левом верхнем участке карточки lime-outline stamp «Интересно», но текст добавляется интерфейсом.

**Эффект:** heart button получает один specular pass и scale 1.06 → 1.00. Фоновые карты расходятся на 4 px.

**Изображение:** то же, что на Artboard 05. Новый asset не генерируется.

### Artboard 07 — Свайп влево

**Модуль:** S04 state `skip`.

**Отличие:** карта смещена влево на 96–120 px, rotation −6°. Справа нейтральный stamp «Не сейчас».

**Цвет:** stamp не красный; muted grey-green. Left swipe не равен dislike.

**Изображение:** то же, что на Artboard 05.

### Artboard 08 — Контекст: время

**Модуль:** S05, раскрыт блок времени.

**Header:** «Шаг 2 из 2».

**Центр:**

- Заголовок «Сколько свободного времени?».
- Крупное значение `120 мин` 36 px.
- Slider 386 × 48 px.
- Presets 30 / 60 / 90 / 120.
- Segmented control «Сейчас / Позже».
- Бюджет и география ниже свернуты в строки по 64 px.

**Низ:** «Дальше».

**Изображение:** не нужно.

### Artboard 09 — Контекст: бюджет

**Модуль:** S05, раскрыт бюджет.

**Центр:** крупное поле суммы; быстрые значения; отдельные chips «Не знаю» и `0 ₸`; selector «На человека / На всех»; stepper участников.

**Важно:** zero и unknown визуально разные. `0 ₸` получает подпись «Только подтверждённо бесплатное».

**Низ:** «Дальше».

**Изображение:** не нужно.

### Artboard 10 — Контекст: география

**Модуль:** S05, раскрыта география.

**Центр:**

- Строка A «Откуда начинаем?».
- Кнопки «Моя геопозиция» и «Указать вручную».
- Secondary «Добавить точку B».
- Toggle «Вернуться сюда».

**Низ:** primary «Собрать варианты».

**Изображение:** только очень бледная абстрактная карта-сетка как CSS, не фактическая карта.

### Artboard 11 — Запрос геолокации

**Модуль:** S06 permission.

**Задний план:** реальная карта в приглушённом состоянии, без user marker.

**Sheet:** 386 px шириной, 420–500 px высотой. Иконка location 48 px, заголовок, два абзаца, primary «Разрешить один раз», secondary «Указать вручную».

**Эффект:** locate button делает один pulse через 800 мс; системный permission появляется только после нажатия.

**Изображение:** не генерировать. Использовать настоящий map component.

### Artboard 12 — Ручной выбор точки

**Модуль:** S06 manual picker.

**Верх:** search 386 × 52 px; back.

**Карта:** занимает 640–680 px. В центре фиксированный pin; карта движется под ним.

**Низ:** sheet 156 px с текстом выбранной точки и кнопкой «Использовать эту точку».

**Эффект:** при остановке карты pin опускается на 4 px; адрес обновляется после debounce.

**Изображение:** не нужно.

### Artboard 13 — Поиск и проверка

**Модуль:** S07.

**Центр:** вертикальный блок 320–380 px высотой с тремя стадиями. Между стадиями тонкая route-line.

**Состояния:** первая done, вторая active, третья pending.

**Низ:** «Отменить». При timeout рядом появляется «Повторить».

**Эффект:** только active-stage показывает движущуюся точку. Процента нет.

**Изображение:** не нужно.

## 6. Лента, карта и детали — 10 artboard

### Artboard 14 — Персональная лента

**Модуль:** S08 main.

**Header:** город/дата; context chips; аватар.

**Контент:**

- Hero recommendation 386 × 500–540 px.
- Изображение 3:4 занимает верхние 330–350 px.
- Под ним факты и «Почему тебе».
- Ниже горизонтальный ряд карт шириной 224–248 px.

**Bottom navigation:** 84–94 px.

**Кнопки:** heart/save 44; «Подробнее» 48; card tap.

**Prompt hero asset:**

```text
3:4 editorial event-category hero for QETTYQ Astana, contemporary indoor cultural evening expressed as abstract light, acoustic curves and architectural folds, no performer faces, no real venue, calm cinematic daylight-to-evening transition, safe lower negative space, no text.
```

### Artboard 15 — Лента: «Нужно уточнить»

**Модуль:** S08 uncertain bucket.

**Отличие:** светлый warning surface `#FFF2C8`, icon `?`, заголовок «Можно рассмотреть, но нужно уточнить». Карточки показывают конкретный unknown: цена, время или наличие мест.

**Не делать:** красный error и alarm animation.

### Artboard 16 — Карта: обзор

**Модуль:** S09 overview.

**Карта:** 100% рабочей области.

**Top controls:** search 330 × 52; рядом filter 52 × 52; ниже date chips.

**Markers:** 32–36 px; clusters 40–48 px; attractions visually quieter than events.

**Bottom:** collapsed sheet 156 px; segment `Карта / Список`; attribution видима.

**Изображение:** не генерировать. Настоящая карта.

### Artboard 17 — Карта: выбранное событие

**Модуль:** S09 selected + S10 preview.

**Marker:** 48 px + lime halo 64 px.

**Preview sheet:** 220–260 px; image 96 × 96; title; time; price; language; `12 мин пешком`; buttons «Подробнее» и plus.

**Эффект:** один ripple; карта pan так, чтобы marker оставался в верхней половине над sheet.

**Asset:** квадратный crop реального разрешённого фото или category placeholder.

### Artboard 18 — Карта как список

**Модуль:** S09 list parity.

**Header:** тот же search и filters.

**Контент:** вертикальные компактные карты 386 × 132 px; square image 112 px; те же candidate IDs, что на карте.

**Низ:** bottom navigation.

**Свойство:** выбор карточки и маркера синхронизирован.

### Artboard 19 — Фильтры

**Модуль:** S12.

**Sheet:** почти full-screen, radius 30 px.

**Порядок:** дата → категория → цена → язык → путь → доступность → скрыть attractions.

**Низ:** sticky «Показать 18 вариантов» 386 × 56 и text «Сбросить».

**Эффект:** число меняется только после расчёта; selected chips получают лаймовый внутренний слой, не яркий border.

### Artboard 20 — Детали события

**Модуль:** S11 event.

**Hero:** 430 × 410–440 px, crop из 3:4. Back/save/share поверх.

**Content:** белая поверхность с radius 30 px перекрывает hero на 24 px. Внутри title, start/end, venue, price, language, age, source, why, unknowns.

**Sticky bar:** «Маршрут» + external contact/ticket.

**Prompt hero:**

```text
Rights-safe 3:4 editorial illustration for a city event detail page, abstract stage light, fabric folds and audience-space geometry, no identifiable artist, no real poster, no text, premium Astana cultural mood, top visual focus and clean lower transition area.
```

### Artboard 21 — Детали постоянного места

**Модуль:** S11 place.

**Отличие от события:** вместо времени начала — hours status; вместо ticket — «Открыть сайт / Позвонить / Маршрут»; виден `Источник координат` и `Расписание занятий не подтверждено`, если это студия.

**Hero:** реальное licensed photo или honest category illustration с label.

**Prompt fallback:**

```text
3:4 honest place-category illustration for a creative studio in Astana, tactile clay tools and warm neutral interior abstraction, no real venue claim, no people, no logo, no schedule, no text, editorial daylight, lower zone clear for interface label.
```

### Artboard 22 — Кино: список сеансов

**Модуль:** S16 list.

**Верх:** heading «Кино сегодня»; filter chips `RU / KK / EN`, audio/subtitles clarification.

**Карточка:** 386 × 168 px; poster 108 × 144; film title; cinema; session chips; language; price state.

**Важно:** постер только при разрешении. Fallback — типографический posterless template, собранный кодом.

**Prompt fallback art:**

```text
Abstract cinematic light and projection composition for a posterless movie card, dark jade, muted cobalt and warm ivory light beam, premium Kazakh city-culture mood, no film characters, no title, no typography, 3:4.
```

### Artboard 23 — Кино: детали сеанса

**Модуль:** S16 detail.

**Hero/poster:** 3:4, 300–340 px видимой высоты.

**Факты:** film, original title, cinema, hall, exact session time, audio language, subtitles, age, price, source checked-at.

**Низ:** «Построить маршрут» и «Открыть билеты» external.

## 7. Маршруты, чат и планы — 8 artboard

### Artboard 24 — Конструктор маршрута: network

**Модуль:** S13 network.

**Карта:** верхние 62–66% рабочей области.

**Точки:** A, 1, 2, B; 36–44 px.

**Polyline:** jade 4 px + lime halo 9 px; arrows на длинном участке.

**Sheet:** 270–310 px с breakdown и drag handles для остановок.

**Низ:** «Сохранить план» и «Открыть навигацию».

**Эффект:** route draw 750 мс. Новая stop появляется scale 0.86 → 1.00.

**Изображение:** не генерировать.

### Artboard 25 — Конструктор маршрута: estimated

**Модуль:** S13 fallback.

**Отличие:** нет road polyline. Точки соединены тонким пунктиром только как абстрактная связь; badge «Оценка по прямой»; CTA «Проверить во внешней карте».

**Цвет:** warning soft, но не error red.

### Artboard 26 — Готовый план

**Модуль:** S14.

**Верх:** summary 386 × 96 px.

**Центр:** timeline с сегментами дорога → ожидание → событие → дорога → запас.

**Низ:** provider buttons Google Maps / 2GIS / Яндекс Go как текстовые внешние действия без самодельных логотипов, если brand assets не подключены по правилам.

**Эффект:** активный шаг получает один pulse; timeline не прокручивается сама.

### Artboard 27 — Помощник: пустой старт

**Модуль:** S15 empty.

**Header:** «Помощник» + data mode.

**Центр:** три example prompts, не chat bubbles: «Что сегодня вечером?», «Кино на английском», «Маршрут на два часа».

**Низ:** composer 386 × 58 px, расположен над safe-area/navigation.

**Изображение:** не нужно. Можно использовать одну тонкую route arc SVG.

### Artboard 28 — Помощник: уточнение

**Модуль:** S15 clarification.

**Сообщение пользователя:** один нейтральный bubble.

**Assistant:** короткий текст и editable condition chips `Сегодня после 19:00`, `до 5 000 ₸`, `английский`.

**Вопрос:** «Нужна английская озвучка или подойдут субтитры?».

**Кнопки:** два ответа 100% ширины внутри thread; «Изменить условия».

**Эффект:** chips появляются как одна grouped-layout animation.

### Artboard 29 — Помощник: карточки результатов

**Модуль:** S15 results.

**Thread:** короткое объяснение; одна большая inline event card 338 × 420 px; две compact alternatives.

**Actions:** «На карте», «В маршрут», «Источник».

**Изображение:** используется тот же asset/entity photo, что в ленте. Не генерировать отдельную версию.

### Artboard 30 — Сохранённые планы

**Модуль:** S17 list.

**Header:** «Планы».

**Cards:** 386 × 148–176 px; date; city; stops; total; status. Stale plan имеет visible warning strip.

**Actions:** открыть, обновить, share, menu.

**Empty state:** можно включить внизу artboard как component variant, но отдельный full-screen макет не обязателен.

### Artboard 31 — Поделиться маршрутом

**Модуль:** S20.

**Sheet:** route summary, privacy toggles, expiry selector, copy link, system share.

**Ключевой текст:** «Точная стартовая точка не войдёт в ссылку».

**Эффект:** после copy icon меняется на check на 1,5 секунды; без confetti.

## 8. Память, источники и организатор — 10 artboard

### Artboard 32 — Профиль и память

**Модуль:** S18.

**Header:** profile name `Гость` или account name; storage badge.

**Sections:** interests chips, tried, language preferences, assistant memory, saved defaults.

**Actions:** edit each, clear chat, delete all.

**Визуал:** никаких charts и personality scores.

### Artboard 33 — Источники

**Модуль:** S19 sources.

**Rows:** source name, mode `snapshot / link-only / live`, last checked, coverage, open link.

**Top info:** map provider, route provider, event sources.

**Status:** выражен текстом и иконкой, не только цветом.

### Artboard 34 — Приватность и удаление

**Модуль:** S19 privacy.

**Blocks:** хранится / не хранится / передаётся provider / retention.

**Danger zone:** «Удалить все мои данные», белая кнопка с danger text, не залитая красным до confirmation.

**Confirmation sheet:** название действия, перечень удаляемого, cancel, confirm 56 px.

### Artboard 35 — Стать организатором

**Модуль:** S21.

**Hero:** abstract event-making 3:4 crop, 220–260 px высотой.

**Content:** требования, steps, current eligibility, «Подать заявку».

**Prompt:**

```text
Abstract 3:4 event-creation scene for QETTYQ, modular stage blocks, calendar plane, contact ribbon and audience-space circles, no people, no logos, no real venue, modern civic Astana design, matte materials, jade and warm ivory, one lime connector.
```

### Artboard 36 — Создание события: основное

**Модуль:** S22 step 1.

**Fields:** title, category, organizer; progress 1/4; autosave state.

**Layout:** один focused field за раз, не длинная CRM-форма.

**Button:** «Дальше».

### Artboard 37 — Создание события: дата и место

**Модуль:** S22 step 2.

**Fields:** date, start, end/duration, timezone, existing venue/manual point.

**Map mini-picker:** 386 × 220 px; настоящий map component.

**Validation:** past date and end-before-start shown inline.

### Artboard 38 — Создание события: цена, язык, контакт

**Модуль:** S22 step 3.

**Price selector:** exact/range/from/free/unknown.

**Language:** spoken/audio/subtitles/instruction.

**Contact:** site, WhatsApp, phone, ticket URL.

**Important:** free is explicit, empty price is unknown.

### Artboard 39 — Создание события: медиа и preview

**Модуль:** S22 step 4.

**Top:** 3:4 media preview or posterless template.

**Rights checkbox:** «У меня есть право использовать это изображение».

**Preview:** title, occurrence, venue, price, contact, unknowns.

**Button:** «Отправить на проверку».

**Изображение:** загружает организатор. AI fallback только category illustration с label.

### Artboard 40 — Статус модерации

**Модуль:** S22 submitted.

**State timeline:** draft → submitted → review → published/changes.

**Actions:** edit allowed fields, view comments, withdraw.

**Motion:** current node gets one subtle pulse when screen opens.

### Artboard 41 — Кабинет организатора

**Модуль:** S23.

**Tabs:** published, review, drafts, ended.

**Cards:** title, occurrence, status, views/contact transitions only if measured.

**Quick actions:** cancel, reschedule, update price, contact settings.

**No charts:** пока нет проверяемых данных, не рисовать аналитику.

## 9. Системные состояния и следующий город — 3 artboard

### Artboard 42 — Нет результатов / unknown

**Модуль:** S24 empty.

**Center:** heading, exact reason, one recommended change.

**Example:** «За 30 минут подходящих вариантов не нашли» + «Увеличить до 60 минут».

**Secondary:** «Изменить условия».

**Background asset:** не нужен. Можно использовать SVG route ending before target.

### Artboard 43 — Offline / provider error state board

**Модуль:** S24 degraded.

Один design-system artboard показывает четыре component variants:

1. Offline + last snapshot.
2. Map tiles unavailable + list remains.
3. Routing unavailable + estimated mode.
4. LLM unavailable + deterministic explanation.

Каждый variant содержит конкретное действие. Это не один продуктовый экран одновременно; это библиотека состояний.

### Artboard 44 — Алматы: следующий город

**Модуль:** S25.

**Screen:** тот же city shell, но Almaty locked/coming-next. Показаны будущие категории покрытия и button «Сообщить о запуске» только если notification flow реально будет создан. Иначе simple informational state.

**Prompt:**

```text
Abstract Almaty expansion artwork for QETTYQ, layered foothill planes, crisp morning air, pale mineral stone, cool blue-green mist, one deep-jade route ribbon, same tactile editorial material as Astana assets, no real skyline, no text, no tourist clichés, vertical 3:4.
```

## 10. Bottom navigation

Bottom navigation используется на artboard 14–23 и 27–34:

- Width: 398 px при внешнем отступе 16 px.
- Height: 72 px + safe area.
- Background: rgba(255,255,255,.76), blur 22 px.
- Radius: 24 px сверху или floating capsule 28 px.
- Five items: Для тебя, Карта, Помощник, Планы, Профиль.
- Icon 22–24 px; label 11–12 px.
- Active item получает тёмно-зелёный icon и лаймовую подложку 36–40 px.
- Неактивные не имеют opacity ниже 58%.
- Badge показывается только для реального изменения, не для привлечения внимания.

## 11. Map marker system

| Состояние | Размер | Цвет | Содержание |
|---|---:|---|---|
| Event default | 36 × 44 | deep jade | category glyph или номер |
| Place default | 34 × 40 | white/jade border | number |
| Attraction | 30 × 36 | muted grey-green | landmark glyph |
| Selected | 44 × 52 | lime + jade | number + halo |
| Uncertain | 36 × 44 | warning soft | `?` |
| Cluster | 40–48 circle | jade | count |

Marker text не генерируется растром. Это SVG/CSS component.

## 12. Карточки

### 12.1. Preference card

- 342 × 456 px.
- Radius 30–32 px.
- Full-bleed 3:4 image.
- Bottom gradient occupies 34%.
- Title max two lines.
- No facts, prices or event time.

### 12.2. Feed event card

- 386 × 500–540 px.
- Image 386 × 340 px.
- Content 160–200 px.
- Radius 28 px.
- Facts limited to 4 high-value rows.

### 12.3. Map preview

- Sheet width 430 px.
- Content padding 18–22 px.
- Image 96 × 96 px, 20 px radius.
- Two primary facts + route summary.

### 12.4. Inline chat card

- Width 338 px.
- Image ratio 4:3 or 3:4 crop, max height 250 px.
- Actions 44 px.
- Same candidate data as feed; no chat-generated facts.

## 13. Motion specification

| Interaction | Duration | Curve | Notes |
|---|---:|---|---|
| Tap feedback | 120–160 ms | ease-out | scale max 0.98 |
| Card return | 220 ms | spring low bounce | no rubber overshoot |
| Card dismiss | 220–280 ms | cubic-bezier | one reaction only |
| Screen transition | 180–240 ms | ease-in-out | shared header where possible |
| Sheet snap | 260–340 ms | spring | preview/half/full |
| Marker select | 180 ms | ease-out | one 600 ms ripple |
| Route draw | 650–900 ms | linear/ease-out | network geometry only |
| Toast | 180 ms in, 140 ms out | ease | remains readable 4–6 sec |

## 14. Правила генерации 15 карточек интересов

Нужно создать 15 самостоятельных 3:4 assets в единой системе света:

1. Культура и история — abstract arch/stage fold.
2. Рок и живая музыка — acoustic wave/string volume.
3. Балет и театр — fabric motion and stage geometry.
4. Бачата и социальные танцы — paired motion ribbons without people.
5. Барабаны и музыка руками — circular percussion forms.
6. Армрестлинг и силовой спорт — two opposing structural arcs, no bodies.
7. Активный отдых — dynamic route loop.
8. Баня и загородный отдых — warm stone/steam abstraction.
9. Шашлык и компания — fire/plate geometry without a real dish claim.
10. Fine dining — refined table landscape, deliberately distinct from card 9.
11. Кофе и спокойный вечер — cup circle and low-amplitude steam.
12. Выставка и современное искусство — frame/light portal.
13. Кино — projection beam and dark acoustic volume.
14. Мастер-класс — clay/thread/tool composition.
15. Прогулка и архитектура — route ribbon around abstract steppe geometry.

Общий prompt template:

```text
QETTYQ 3:4 mobile discovery card for CATEGORY, SYMBOL_DESCRIPTION, Astana-inspired abstract urban leisure without depicting a specific venue or event, tactile matte paper and ceramic forms, calm winter daylight, deep jade and warm ivory palette with CATEGORY_ACCENT and one tiny acid-lime detail, strong central subject, uncluttered lower 34 percent for UI title, premium editorial composition, no text, no logo, no identifiable people.
```

## 15. Передача в генерацию

Для каждого artboard генератор получает:

1. Номер artboard.
2. Canvas 430 × 932.
3. Layout-зоны в px.
4. Список компонентов.
5. Exact UI copy отдельным JSON или Figma text layer.
6. Asset prompt только для изображения.
7. Source of truth для карты/события.
8. Negative prompt.
9. Ссылку на один предыдущий approved artboard для сохранения стиля.

Генератор не должен самостоятельно менять названия кнопок, добавлять показатели, придумывать цены, создавать новые tab bar items или рисовать карту. Любая новая деталь сначала появляется в спецификации и только затем в макете.

## 16. Порядок отрисовки

### Волна 1 — зафиксировать стиль

Нарисовать artboard 02, 05, 14, 16, 20 и 24. Это шесть главных типов поверхности: home, swipe, feed, map, detail, route.

### Волна 2 — собрать основной P0

Artboard 03–13, 17–19, 21, 25–29, 32–34, 42–43.

### Волна 3 — P1

Artboard 22–23, 30–31, 35–41, 44.

После каждой волны проверять 360 × 800, 390 × 844 и 430 × 932. Не продолжать массовую генерацию, если card radius, header, shadows, fonts или bottom navigation расходятся между первыми шестью эталонами.
