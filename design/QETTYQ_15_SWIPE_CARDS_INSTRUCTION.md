# QETTYQ — инструкция по 15 свайп-карточкам

Статус: production brief для генерации и проверки category illustrations  
Город пилота: Астана  
Назначение: первый шаг персонализации QETTYQ  
Связанные документы: `PRD.md`, `docs/PRODUCT_UI_MASTER_SPEC.md`, `design/QETTYQ_44_ARTBOARD_SPEC.md`

## 1. Что создаём

Создать 15 самостоятельных растровых иллюстраций интересов. Это **не 15 отдельных экранов** и не реальные афиши. Они используются внутри одного свайп-экрана S04 / artboards 05–07.

Пользователь свайпает карточку вправо (`like`, «Интересно») или влево (`skip`, «Не сейчас»). Влево не означает устойчивый dislike. После каждого действия профиль предпочтений пересчитывается детерминированно; LLM не интерпретирует намерение пользователя.

## 2. Формат и размещение в интерфейсе

- Мастер: вертикальный растр **3:4**, целевой размер 1536 × 2048 px.
- Runtime: WebP 720 × 960 px и, при необходимости, AVIF.
- Экран: 430 × 932 px.
- Видимая карточка: примерно 342 × 456 px, радиус 30–32 px.
- Изображение занимает всю карточку; UI добавляет поверх собственные градиент, метку «Идея» и название.
- Нижние 34% изображения должны оставаться спокойнее: без лиц, рук, мелких предметов и яркого света. Это зона читаемого UI-текста.
- Главный объект — в центральных 55–60%; верх не должен быть перегружен, чтобы crop оставался устойчивым на 360 × 800, 390 × 844 и 430 × 932.
- Никаких текстов, букв, цифр, логотипов, цен, дат, бейджей и кнопок внутри растра.

## 3. Единый визуальный язык

QETTYQ выглядит как современный городской журнал Астаны: спокойный, тактильный, объёмный и живой. Не плоский SaaS и не неоновый «AI-дизайн».

Постоянные признаки серии:

- мягкий зимний дневной свет Астаны;
- глубокий степной jade, тёплый ivory, минеральный серо-голубой;
- один небольшой acid-lime акцент;
- матовые бумажные, керамические, тканевые, каменные и металлические фактуры;
- мягкая глубина, тени и полутени; без чрезмерного glassmorphism;
- editorial photography + restrained tactile art direction;
- современный Казахстан без буквального фольклора;
- одна и та же оптика: ощущение 50 mm, естественная перспектива, умеренная глубина резкости;
- никакого узнаваемого реального заведения или обещания реально существующего события.

## 4. Люди и казахстанский контекст

Люди допустимы там, где действие важнее предмета. Они показывают живой городской досуг, а не являются объектом свайпа.

Единое описание людей:

> Contemporary residents of Astana, Kazakhstan, naturally diverse multiethnic group including Kazakh and Slavic or European-appearing adults, balanced men and women, ages approximately 22–45, modern understated urban clothing suitable for the season, authentic candid body language, natural facial features and skin texture, ordinary attractive people rather than fashion models, respectful representation, no celebrity resemblance, no national costumes, no tourist advertising poses.

Распределение:

- человек или группа — главный носитель действия: рок, бачата, армрестлинг, активный отдых, шашлык;
- люди — вторичный атмосферный слой: культура, балет, барабаны, выставка, мастер-класс, прогулка;
- предметная сцена или дальние силуэты: баня, fine dining, кофе, кино.

Запрещено:

- стилизация под dating profile;
- сексуализированные позы и романтический клише-контакт;
- одинаковые лица или искусственно собранная «витрина разнообразия»;
- национальные костюмы, этнические стереотипы и туристическая реклама;
- узнаваемые знаменитости;
- деформированные руки, лишние пальцы, повторяющиеся люди.

## 5. Общая база каждого prompt

```text
Use case: photorealistic-natural
Asset type: QETTYQ mobile preference discovery category illustration
Primary request: a portrait 3:4 editorial image representing CATEGORY as a leisure interest, not a real event or venue
Scene/backdrop: contemporary Astana-inspired urban atmosphere, modern Kazakhstan without literal folklore
Style/medium: premium natural editorial photography blended with restrained tactile set design; believable materials and people; not concept-art UI
Composition/framing: exact portrait 3:4; strong central subject; calm uncluttered lower 34 percent reserved for an interface title overlay; crop-safe at mobile sizes
Lighting/mood: calm winter daylight or restrained evening light; soft depth and half-shadows; confident but not advertising-like
Color palette: deep steppe jade, warm ivory, mineral steel-blue, one very small acid-lime detail, category accent
Constraints: no embedded UI, no text, no letters, no numbers, no logo, no watermark, no price, no date, no schedule, no map, no identifiable venue, no factual event claim
Avoid: glossy plastic SaaS render, neon cyberpunk, purple AI gradient, excessive glassmorphism, tourist collage, national costume, folklore cliché, dating-app portrait, stock-ad poses, celebrity resemblance, distorted anatomy, deformed hands, extra fingers, duplicate people, cluttered lower area
```

## 6. Пятнадцать карточек и точные задания

### 01 — Культура и история

Файл: `01-culture-history.webp`  
UI-название: «Культура и история»  
Теги: `culture`, `history`, `museum`, `architecture`

```text
Abstract museum-like interior inspired by Astana's contemporary civic architecture without reproducing a real building: monumental ivory arch, layered dark-jade stage folds, mineral blue winter light, subtle archival paper and ceramic textures. One contemporary Kazakh woman and one Slavic or European-appearing man are small secondary visitors seen candidly from three-quarter back, studying an abstract artifact with no writing. Spacious, quiet, intelligent mood. Keep the lower 34 percent dark, simple and uncluttered for UI copy.
```

### 02 — Рок и живая музыка

Файл: `02-rock-live-music.webp`  
UI-название: «Рок и живая музыка»  
Теги: `rock`, `live-music`, `concert`, `night`

```text
Intimate independent live-music atmosphere in a generic Astana creative space, no recognizable venue and no band branding. A mixed-gender, multiethnic group of contemporary young adults responds naturally to a small performance; one generic guitarist is shown in partial silhouette, not identifiable. Deep jade acoustic panels, muted cobalt shadows, one acid-lime cable detail, warm ivory stage light, authentic candid energy rather than a festival advertisement. Faces are secondary; lower 34 percent remains calm and dark.
```

### 03 — Балет и театр

Файл: `03-ballet-theatre.webp`  
UI-название: «Балет и театр»  
Теги: `ballet`, `theatre`, `performance`, `culture`

```text
Contemporary theatre atmosphere expressed through sweeping ivory fabric, a restrained dancer silhouette in motion and dark-jade stage geometry, without depicting a named ballet, performer or venue. A few diverse audience silhouettes are a quiet secondary layer. Soft steel-blue side light, refined warm highlights, realistic fabric texture and subtle motion blur. Elegant but not luxurious advertising. Calm lower 34 percent for interface copy.
```

### 04 — Бачата и социальные танцы

Файл: `04-bachata-social-dance.webp`  
UI-название: «Бачата и танцы»  
Теги: `bachata`, `dance`, `social`, `movement`

```text
Two contemporary adult social dancers in a generic modern studio in Astana, one Kazakh-appearing and one Slavic or European-appearing, captured mid-step with respectful distance and authentic technique, not a romantic or dating pose. Other mixed-gender dancers are softly out of focus. Flowing jade and warm-coral motion ribbons appear only as restrained set-light reflections. Natural faces, understated clothing, tactile wood floor, winter evening ambience. Leave lower 34 percent visually simple.
```

### 05 — Барабаны и музыка руками

Файл: `05-drums-hand-music.webp`  
UI-название: «Барабаны и ритм»  
Теги: `drums`, `rhythm`, `music`, `hands-on`

```text
Hands-on percussion session in a generic contemporary studio: one Kazakh man and one woman of Slavic or European appearance playing unbranded frame drums and abstract circular percussion forms, natural concentration and candid posture. Show hands clearly and anatomically correctly. Matte wood, clay and dark-jade acoustic surfaces, warm ivory side light, tiny acid-lime felt detail. No stage poster and no claim of a real class. Keep the lower 34 percent quiet.
```

### 06 — Армрестлинг и силовой спорт

Файл: `06-armwrestling-strength.webp`  
UI-название: «Армрестлинг и сила»  
Теги: `armwrestling`, `strength`, `sport`, `competition`

```text
Respectful amateur armwrestling practice in a clean generic urban sports club: two healthy adults, one Kazakh-appearing and one Slavic or European-appearing, balanced athletic build, focused rather than aggressive. Correct arm and hand anatomy, proper padded table, a mixed-gender friend group watching naturally in the background. Deep jade equipment, mineral gray room, warm ivory light and one tiny acid-lime wrist wrap. No logos, medals, macho advertisement or real tournament claim. Lower 34 percent uncluttered.
```

### 07 — Активный отдых

Файл: `07-active-leisure.webp`  
UI-название: «Активный отдых»  
Теги: `active`, `outdoors`, `movement`, `friends`

```text
Three contemporary friends in Astana, mixed gender and naturally multiethnic, moving through a crisp open winter urban landscape on a casual active outing, generic architecture only. Dynamic but believable stride, layered understated sportswear, visible breath and real fabric texture. A subtle dark-jade route ribbon is integrated as a physical trail element, not a map. Pale winter sky, mineral blue shadows, one tiny acid-lime accessory. No extreme sport, no tourism ad. Calm lower 34 percent.
```

### 08 — Баня и загородный отдых

Файл: `08-banya-country-retreat.webp`  
UI-название: «Баня и загородный отдых»  
Теги: `banya`, `relax`, `country`, `wellness`

```text
Quiet contemporary country-retreat atmosphere near Astana without identifying a property: warm stone, dark timber, soft steam, folded ivory textile and a small window onto a pale winter steppe. Only distant anonymous human silhouettes through frosted glass; no bodies in focus. Deep jade shadow, amber warmth and one tiny acid-lime botanical detail. Tactile, restorative and restrained, never spa advertising. Lower 34 percent simple and darker.
```

### 09 — Шашлык и компания

Файл: `09-shashlik-friends.webp`  
UI-название: «Шашлык и компания»  
Теги: `shashlik`, `friends`, `food`, `outdoors`

```text
Friendly outdoor gathering in a generic sheltered courtyard on the edge of Astana: a naturally diverse group of Kazakh and Slavic or European-appearing adults, balanced men and women, sharing the process of cooking skewered food over a safe brazier. Candid laughter and cooperation, food shown as an activity mood rather than a menu claim. Winter clothing, matte metal, timber and warm firelight against deep jade evening shadows. No alcohol focus, brand or restaurant identity. Lower 34 percent uncluttered.
```

### 10 — Fine dining

Файл: `10-fine-dining.webp`  
UI-название: «Fine dining»  
Теги: `fine-dining`, `gastronomy`, `restaurant`, `special-evening`

```text
Refined contemporary table setting in an anonymous Astana restaurant-like interior, clearly distinct from the group barbecue card. Sculptural ivory plate, restrained seasonal composition that is not a claim about a real menu, dark-jade linen, brushed metal and mineral glass. Only two natural hands entering the frame, no identifiable people. Soft controlled evening light, subtle half-shadows, one tiny acid-lime herb accent. No logo, menu text, Michelin reference, champagne advertising or fake price. Calm lower 34 percent.
```

### 11 — Кофе и спокойный вечер

Файл: `11-coffee-quiet-evening.webp`  
UI-название: «Кофе и спокойный вечер»  
Теги: `coffee`, `quiet`, `reading`, `evening`

```text
Calm anonymous city-cafe mood in Astana: one contemporary Kazakh woman seated in profile reading an unbranded book beside a ceramic coffee cup, naturally candid and not posing. Window shows only soft winter light and abstract city shapes, not a recognizable venue. Warm ivory tabletop, deep jade upholstery, mineral blue dusk, low-amplitude steam and one tiny acid-lime bookmark. Real skin and fabric texture, quiet personal space. Lower 34 percent dark and simple.
```

### 12 — Выставка и современное искусство

Файл: `12-exhibition-contemporary-art.webp`  
UI-название: «Выставка и современное искусство»  
Теги: `exhibition`, `contemporary-art`, `gallery`, `culture`

```text
Generic contemporary gallery atmosphere with an original non-representational light portal and tactile mineral installation, not copied from a known artwork. A diverse pair of visitors is shown small and candid from behind, giving scale without becoming the subject. White-ivory architecture, deep jade shadow plane, muted cobalt glow, one tiny acid-lime reflected edge. No labels, artist names, venue identity or fake exhibition poster. Open lower 34 percent.
```

### 13 — Кино

Файл: `13-cinema.webp`  
UI-название: «Кино»  
Теги: `cinema`, `film`, `screening`, `evening`

```text
Posterless cinematic atmosphere: a clean projection beam crossing dark-jade acoustic volumes toward an abstract ivory screen, a few anonymous audience silhouettes seen from behind. No movie character, title, studio logo, ticket, film frame or recognizable cinema. Mineral cobalt shadows, soft warm reflected light and one tiny acid-lime seat marker. Premium city-culture mood, calm lower 34 percent reserved for UI.
```

### 14 — Мастер-класс и творчество

Файл: `14-workshop-creativity.webp`  
UI-название: «Мастер-класс и творчество»  
Теги: `workshop`, `craft`, `creativity`, `hands-on`

```text
Hands-on creative workshop in a generic Astana studio: two contemporary adults, one Kazakh-appearing and one Slavic or European-appearing, shaping clay and thread-based objects at a shared table. Hands anatomically correct, concentration natural, no posed smiles. Matte clay, paper, fiber and warm timber, deep jade background, ivory daylight and one tiny acid-lime tool detail. No real studio identity, product brand, schedule or class claim. Lower 34 percent clear.
```

### 15 — Прогулка и архитектура

Файл: `15-walk-architecture.webp`  
UI-название: «Прогулка и архитектура»  
Теги: `walk`, `architecture`, `city`, `outdoors`

```text
Contemporary architectural walk in Astana without reproducing a landmark: broad steppe-scale geometry, curved civic volumes, pale winter atmosphere and a dark-jade path ribbon. A naturally diverse small group of adults walks through the scene as a secondary element, dressed for the season, candid and unposed. Mineral stone, brushed metal, long soft shadows and one tiny acid-lime wayfinding detail. No map, signage, tourist pose or specific building claim. Keep lower 34 percent calm.
```

## 7. Runtime-слои, которые не генерируются в картинке

Код добавляет поверх изображения:

- вертикальный затемняющий градиент только в нижней трети;
- метку «Идея»;
- название категории, максимум две строки;
- во время drag — «Интересно» или «Не сейчас»;
- прогресс `N из 15` находится в header экрана, а не в растре;
- controls X, undo, heart находятся под карточкой и не входят в изображение.

## 8. Motion и доступность

- Drag по горизонтали: угол не более 5–7°.
- Порог: 28% ширины либо достаточная скорость жеста.
- Возврат: 220 ms, low-bounce spring.
- Уход: 220–280 ms.
- Следующая карточка: scale 0.97 → 1 и подъём на 8 px.
- Подпись реакции плавно проявляется по мере drag; не мигает.
- Кнопки X/heart полностью дублируют свайпы.
- При `prefers-reduced-motion` нет вращения и spring-перелёта.

## 9. Проверка каждой картинки

Карточка принимается только если:

1. Она читается как заданный интерес без текста.
2. Не похожа на конкретную афишу или реальное заведение.
3. Не содержит букв, цифр, логотипов и водяных знаков.
4. Люди, лица и руки естественны; нет dating-подачи.
5. Казахстанский контекст современный и ненавязчивый.
6. Нижние 34% пригодны для белого UI-текста.
7. Отличается от остальных по сюжету, но совпадает по свету, материалам и палитре.
8. При crop 342 × 456 главный смысл не теряется.
9. Нет выдуманного факта о цене, времени, наличии мест, площадке или событии.
10. Файл сохранён в workspace и зарегистрирован в manifest.

## 10. Данные и provenance

Каждый файл получает `media_type = category_illustration`, `data_mode = synthetic_visual`, генератор и дату создания. Такие изображения используются только для выбора идеи. В ленте реальных мест и событий они не выдаются за фотографии площадки. Если иллюстрация временно используется как placeholder, UI явно показывает «Иллюстрация».
