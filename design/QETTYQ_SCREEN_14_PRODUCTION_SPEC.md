# QETTYQ · Screen 14 production specification

Экран: `14 — Для тебя`  
Viewport reference: `430 × 932 CSS px`  
Роль: главный production-эталон основного приложения  
Статус: спецификация вёрстки; PNG `design/generated/app-screens/14-feed.png` — визуальный референс, не готовый слой интерфейса.

## 1. Назначение

Экран показывает персональную ленту проверенных кандидатов после onboarding. Он не является рекламной витриной и не обещает наличие мест. Пользователь должен за несколько секунд понять:

1. какие условия сейчас применены;
2. что предлагается;
3. почему это может подойти;
4. какие факты подтверждены, а какие нужно уточнить;
5. как открыть детали, сохранить, перейти к поиску или посмотреть на карте.

Визуально экран наследует удачные качества screen 14: крупная редакционная карточка, тёплый зимний свет, jade-структура, lime только на текущем действии, белые матовые поверхности, мягкая глубина. Полноэкранный городской raster, skeleton-текст и нарисованный dock из PNG в production не используются.

## 2. Информационная архитектура

Утверждённый bottom dock:

1. `Для тебя` — home icon, активен на screen 14.
2. `Поиск` — magnifier, единый текстовый поиск и assistant thread.
3. `Карта` — map icon, не ticket.
4. `Профиль` — person.

`Настройки` — gear отдельно справа сверху. `Планы` не находятся в dock: сохранённые планы открываются из профиля, текущий план — из route/plan context.

## 3. Вертикальный контур 430 × 932

Размеры — reference для 430 px, а не фиксированная высота DOM.

| Y | Высота | Слой | Поведение |
|---:|---:|---|---|
| 0–24 | 24 | safe area | `env(safe-area-inset-top)` |
| 24–88 | 64 | app header | sticky; непрозрачность повышается при scroll |
| 88–136 | 48 | context rail | горизонтально прокручивается, не переносится в две строки |
| 136–162 | 26 | heading row | `Для тебя`, optional result count не показывать без данных |
| 162–702 | 500–540 | hero candidate | медиа сверху, факты снизу; высота зависит от текста |
| 718–810 | ≥92 visible | next section peek | начало `Ещё по вашему настроению`; страница прокручивается |
| 816–916 | 72 + safe | bottom dock | fixed/floating; content имеет равный bottom padding |
| 916–932 | 16 reference | safe bottom | `env(safe-area-inset-bottom)` |

При высоте 800 px hero не сжимается до нечитаемого состояния: документ прокручивается, а dock остаётся доступным. Header + context не должны одновременно занимать больше 128 px после начала scroll; context rail может свернуться в одну кнопку `Условия`.

## 4. Слои сверху вниз

### 4.1. Background

CSS, не raster:

```css
background:
  radial-gradient(circle at 85% 8%, rgba(185,218,222,.20), transparent 32%),
  linear-gradient(145deg, #f4f6f2 0%, #edf3f5 100%);
```

Допустим монохромный noise 1–2%. Никакой карты или skyline на фоне всей страницы: такой raster конкурирует с реальными карточками и не масштабируется.

### 4.2. Header · 64 px

Grid: `1fr auto auto`.

- слева: QETTYQ SVG wordmark, 116–132 × 28–32, ссылка на начало ленты;
- затем city button `Астана`, min-height 44, location icon 20, chevron;
- справа: gear button 44 × 44, accessible name `Настройки`.

Город открывает screen 03 как sheet. Gear открывает profile settings; Back возвращает в прежнюю позицию ленты. В header нет profile icon: профиль уже доступен в dock.

### 4.3. Context rail · 48 px

Горизонтальный список code-native chips:

- время: фактическое значение контекста либо `Время не выбрано`;
- бюджет: форматированное значение, `Бюджет не указан` или явное `Только бесплатно`;
- география: `Рядом` / `По пути` / короткое безопасное название точки;
- действие `Изменить условия`.

Нельзя показывать точные координаты. Chips min-height 40, padding 12–14, gap 8. Active не означает фильтр-on; это информация о текущем контексте.

### 4.4. Heading row

- H1: `Для тебя`, 28 px / 1.1 / 700;
- optional status только при необходимости: `Обновлено …` или `Данные на …`;
- не писать `AI-подборка`, `98% совпадение` или выдуманный count.

### 4.5. Hero candidate

Container width `calc(100% - 44px)` = 386 px при viewport 430; radius 28; background white; border `#DCE4DF`; shadow `0 22px 50px rgba(11,51,45,.16)`.

#### Media · 386 × 320–350

- `<img>` или licensed media component, `object-fit: cover`;
- alt описывает реальное изображение; category illustration получает `Иллюстрация категории: …` только если смысл нужен, иначе пустой alt;
- media badge code-native: `Событие`, `Место` или `Иллюстрация`;
- save icon 44 × 44 справа сверху — DOM button, не часть фото;
- если фото недоступно, category asset; никакой вымышленной venue-фотографии.

#### Content · min 180

Padding 20. Порядок:

1. entity title, 24–28 px, max 2 строки; полное название доступно screen reader и detail;
2. category + district/city, если подтверждено;
3. максимум четыре facts: начало/режим, длительность отдельно от дороги, цена state, язык;
4. `Почему подходит`: одна короткая причина из предпочтений и контекста, не маркетинговая оценка;
5. unknown/warning row, если нужна: `Наличие мест уточняйте у организатора`;
6. actions.

#### Actions

- primary `Подробнее`, height 48, jade surface;
- secondary icon `Сохранить`, 48 × 48;
- optional text `На карте` только если координаты валидны; в этом случае min-height 44.

Нажатие на свободную область card также открывает details. Nested buttons вызывают `stopPropagation` и не должны одновременно открывать detail.

### 4.6. Следующая подборка

Под hero: H2 `Ещё по вашему настроению`, затем horizontal cards шириной 224–248. Это реальные кандидаты того же response, не декоративные snapshots. У карточки видны media, title и два факта; остальное — в detail.

### 4.7. Bottom dock

Outer inset 16, width 398, min-height 72 + safe bottom, floating capsule radius 28. Surface `rgba(255,255,255,.82)`, blur 22, border white 72%, shadow `0 12px 28px rgba(11,51,45,.15)`.

Четыре равные зоны. Каждая min 48 × 48:

| Label | Icon | Screen | Screen 14 state |
|---|---|---|---|
| Для тебя | home | 14 | active, `aria-current=page` |
| Поиск | magnifier | 27/current query | inactive |
| Карта | map | 16 | inactive |
| Профиль | person | 32 | inactive |

Active icon jade, lime surface 38 × 38, label ink. Inactive opacity не ниже 64%. Ticket, bookmark, history и menu icon запрещены как замены этим четырём IA-пунктам.

## 5. Semantic DOM overlay

```html
<main class="feed-page">
  <header class="app-header">
    <a aria-label="QETTYQ — в начало ленты">…wordmark…</a>
    <button aria-haspopup="dialog">Астана</button>
    <button aria-label="Настройки">…gear…</button>
  </header>

  <section aria-labelledby="feed-title">
    <div role="list" aria-label="Текущие условия">…chips…</div>
    <h1 id="feed-title">Для тебя</h1>
    <article aria-labelledby="candidate-title">…real text and controls…</article>
    <section aria-labelledby="more-title">…more candidates…</section>
  </section>

  <nav aria-label="Основная навигация">…four links…</nav>
  <div aria-live="polite" class="sr-only">…save/result status…</div>
</main>
```

PNG screen не присутствует в DOM. Растровый asset помещается только внутрь media container.

## 6. Точная UI-копия

Статические тексты:

- H1: `Для тебя`;
- context action: `Изменить условия`;
- hero reason label: `Почему подходит`;
- primary: `Подробнее`;
- save default: `Сохранить`;
- save loading: `Сохраняем…`;
- save success: `Сохранено`;
- save error: `Не удалось сохранить. Повторить`;
- map action: `На карте`;
- next section: `Ещё по вашему настроению`;
- unknown availability: `Наличие мест уточняйте у организатора`;
- unknown price: `Цена не указана`;
- unconfirmed schedule: `Расписание не подтверждено`;
- empty: `По этим условиям вариантов не нашли`;
- empty primary: конкретная допустимая рекомендация, например `Увеличить время` только если она рассчитана;
- empty secondary: `Изменить условия`.

Dynamic title, date, price, language, source and route facts приходят из typed data. В макете нельзя вписывать пример так, будто это live-факт.

## 7. Button/state contract

### City

- default `Астана`;
- pressed scale .98 / 120 ms;
- opens city sheet;
- disabled только если список городов реально недоступен; выбранный город остаётся текстом.

### Settings gear

- default/pressed/focus-visible;
- loading не требуется для открытия локального route;
- accessible label `Настройки`.

### Details

- default `Подробнее`;
- pressed 120–160 ms;
- loading только если detail fetch нужен: `Открываем…`, single submit lock;
- error inline: `Не удалось открыть подробности. Повторить`.

### Save

- default `Сохранить`, `aria-pressed=false`;
- loading `Сохраняем…`, `aria-busy=true`, повтор disabled;
- success `Сохранено`, `aria-pressed=true`, live announcement;
- undo after saved may be available as `Убрать из сохранённых`;
- error returns to unsaved state.

### Dock

- tab navigation does not wait for network;
- active link has `aria-current=page`;
- search/map may show their own loading inside destination, not spinner in nav;
- no badges without a real unseen change.

## 8. Motion

- page entry: opacity + y 6 px, 180–220 ms;
- hero media does not auto-parallax;
- card press: scale .995 max, 120 ms;
- save: icon morph to check 160–220 ms, no confetti;
- horizontal cards use native controlled scroll + snap; no auto-scroll;
- dock indicator slides 180–220 ms;
- reduced motion: instant layout, opacity ≤160 ms, no indicator travel.

No blinking or perpetual glow. Lime highlight is a state, not an animation loop.

## 9. Data contract

Screen uses a typed feed response. Names below describe required meaning, not a mandate for a particular backend shape.

```ts
type FeedCandidate = {
  candidateId: string;
  entityType: 'place' | 'activity' | 'event';
  title: string;
  city: string;
  categoryLabel: string;
  media: null | {
    url: string;
    kind: 'licensed_photo' | 'category_illustration';
    alt: string;
    attribution?: string;
  };
  occurrence: null | {
    startAt: string;
    endAt: string | null;
    status: 'confirmed' | 'unconfirmed' | 'cancelled';
  };
  durationMinutes: number | null;
  price: {
    state: 'exact' | 'from' | 'range' | 'free' | 'unknown';
    currency: 'KZT';
    minMinor: number | null;
    maxMinor: number | null;
    basis: 'person' | 'group' | 'unknown';
  };
  languages: string[];
  routeSummary: null | {
    mode: 'network' | 'estimated';
    travelMinutes: number | null;
  };
  why: string[];
  warnings: string[];
  source: {
    label: string;
    url: string;
    checkedAt: string | null;
    dataMode: 'live' | 'snapshot' | 'link_only' | 'synthetic_test';
  };
};
```

Rules:

- unknown is rendered as unknown, never zero;
- cancelled occurrence is not a normal candidate;
- `why` cannot introduce facts absent from candidate/evidence;
- `travelMinutes` labelled approximate when mode is estimated;
- `synthetic_test` visibly marked and never mixed with live demo.

## 10. Transitions for every control

| Control | Destination/result | History |
|---|---|---|
| QETTYQ wordmark | top of current feed | no new entry |
| city `Астана` | 03 city sheet | overlay; Back closes |
| gear | settings/profile settings | push; Back restores scroll |
| context chip | relevant edit section 08/09/10 | push with return target 14 |
| `Изменить условия` | context editor | push |
| hero free area | 20 event or 21 place | push with candidateId |
| `Подробнее` | 20/21 | push with candidateId |
| `Сохранить` | local/API save | same screen state |
| `На карте` | 17 sheet over 16 | push map + overlay selected candidate |
| horizontal card | 20/21 | push |
| dock `Для тебя` | 14/top | active; repeated tap scrolls to top |
| dock `Поиск` | 27/current query | tab switch, preserve feed state |
| dock `Карта` | 16 | tab switch, same candidate set/context |
| dock `Профиль` | 32 | tab switch |
| empty `Изменить условия` | 08/09/10 editor | push |
| retry | repeat failed request with same context | same screen, no duplicate history |

## 11. Responsive and accessibility

- Test 360×800, 390×844, 430×932, 1440×900 split view.
- Width ≤390: horizontal padding 18; card width `100%`; action labels must not truncate.
- Desktop ≥1024: feed column max 520, optional map companion only when both remain useful; do not stretch card full width.
- 200% text: hero content grows; no fixed card height; dock may increase label line box but keeps 44 target.
- Keyboard order: header actions → context → hero actions → further cards → dock.
- Focus ring 2 px `#175CC2`, offset 2.
- Save result and feed refresh announced via polite live region.
- Media alt is factual; decorative atmosphere has empty alt.
- Swipe is not required on this screen.
- Contrast must be tested against the actual media/surface, not assumed from tokens.

## 12. Acceptance checklist

- [ ] No full-screen `14-feed.png` in rendered page.
- [ ] Four-item dock has exact labels and icons.
- [ ] Gear is separate in header; no fifth tab.
- [ ] Plans absent from dock and reachable from profile/route context.
- [ ] Hero content is real DOM and grows with text.
- [ ] Unknown and source freshness render honestly.
- [ ] Save states can be demonstrated.
- [ ] Map transition preserves candidateId and context.
- [ ] Back restores scroll position.
- [ ] Keyboard, 200% text and reduced motion pass.
- [ ] Screenshots are captured from code at required viewports.
