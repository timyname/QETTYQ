# A20. Проверяемый конвейер событий Astana pilot

Дата проверки источников: 19 октября 2026 года
Принцип: только официальные страницы, открытые наборы с подтверждёнными условиями или договорной feed. Scraping, reverse engineering и копирование медиа без прав не используются.

## Решение на текущий момент

Для Astana pilot нет подтверждённого общегородского event API, который одновременно даёт расписание, цену, площадку, статус и право на автоматическое хранение. Поэтому честный P0 состоит из двух слоёв:

1. `manual_curated_snapshot`: несколько будущих occurrence, вручную проверенных на официальных event-specific страницах, с минимальными фактами, `checked_at` и ссылкой. Это не live feed.
2. `partner_feed` или `open_dataset`: подключается только после получения ключа/разрешения и проверки условий конкретного источника.

Ticket marketplace может быть ссылкой для покупки, но не становится первоисточником всех фактов и не даёт права копировать каталог.

`manual_curated_snapshot` здесь является технической моделью ограниченной редакционной фиксации минимальных фактов, а не юридическим заключением о правах конкретного источника. Если условия владельца страницы запрещают такое использование или остаются неоднозначными, до письменного разрешения сохраняются только внешний URL, `checked_at` и внутренние заметки проверки, а пользователю предлагается `link_only` переход.

## Сверка с текущим `src/data/events.ts`

На дату аудита текущие четыре записи остаются демонстрационным snapshot и не проходят publish gate этого документа:

- все `sourceUrl` ведут на общую главную/городскую страницу Visit Astana или Ticketon, а не на event-specific evidence;
- отсутствуют `status`, `end_at`, `valid_until` и field-level provenance;
- координаты площадок и переводы RU/KK/EN не имеют отдельного источника в модели;
- `priceFrom=2000` не доказывает верхнюю границу 5 000 ₸, поэтому membership `under_5000` нельзя считать подтверждённым бюджетным фильтром;
- Ticketon является внешним ticket marketplace, а общая страница города не подтверждает occurrence и не даёт права на импорт каталога.

До исправления эти записи можно показывать только как `snapshot / нужно перепроверить`, без `live`, `verified`, гарантии бюджета, языка, наличия билетов и точного времени пути.

## Статусы доступа

| Статус | Значение |
|---|---|
| `approved_for_scope` | Условия допускают конкретный импорт и хранение в заданном объёме |
| `needs_key` | Нужен ключ, аккаунт, тариф или техническое одобрение |
| `link_only` | Можно ссылаться и вручную проверять событие, но нет права на автоматический импорт |
| `needs_permission` | Нужна письменная лицензия/feed agreement |
| `rejected` | Не использовать для ingestion |

## Реестр официальных источников

| Источник | Роль | Что подтверждает | Доступ | Ограничение | Начальная частота |
|---|---|---|---|---|---|
| [Visit Astana, календарь](https://visitastana.kz/ru/about-city/where-to-go/) | Aggregator / tourism portal | Название, период, иногда venue и ticket link | `link_only` | Не найден documented API/RSS/ICS или публичное право массового хранения; не копировать тексты/фото | Ручная проверка раз в 24 ч для опубликованных pilot events; T−6 ч перед рекомендацией |
| [Visit Astana, главная](https://visitastana.kz/ru/) | Витрина ближайших событий | Ближайшие карточки и даты | `link_only` | Витрина не заменяет event-specific evidence | Только discovery; факты подтверждать карточкой/организатором |
| [Астана Опера, афиша](https://astanaopera.kz/ru/afisha) | Organizer / venue | Конкретные показы, дата/время, зал, длительность, age rating | `link_only` | API/feed и право автоматического импорта не найдены | Ручная проверка раз в 24 ч; T−6 ч; сразу после сообщения о переносе |
| [Астана Опера, event page example](https://astanaopera.kz/ru/afisha/689) | Event-specific evidence | Один спектакль и его occurrence | `link_only` | Описание/фото не копировать без права | На ingestion, T−24 ч и T−6 ч |
| [Astana Ballet](https://www.astanaballet.com/ru) | Organizer / venue | Анонсы, адрес, контакты | `link_only` | Structured feed и storage rights не подтверждены | Ручная проверка раз в 24 ч при наличии pilot occurrence |
| [Astana Ballet, билеты](https://astanaballet.com/ru/buy-tickets) | Organizer ticket entry | Переход к официальному ticket flow | `link_only` | Страница может не содержать полные occurrence fields | Проверять при создании/перед рекомендацией |
| [Управление культуры Астаны](https://www.gov.kz/memleket/entities/astana-madeniet?lang=ru) | Government confirming source | Городские анонсы и организатор | `link_only` | Пресс-центр не полный календарь и не feed | Ручной обзор 1 раз в сутки в pilot window |
| [Акимат Астаны, пресс-центр](https://www.gov.kz/org/astana/press/news/3?lang=ru) | Government confirming source | Разовые городские программы, переносы, открытые события | `link_only` | Большие статьи требуют ручного разделения на occurrences; не считать исчерпывающими | Ручной обзор 1 раз в сутки и перед массовыми праздниками |
| [Open Data API](https://data.egov.kz/proxy/aisoip?apiKey=yourApiKey) | Машиночитаемые госнаборы | Данные конкретного опубликованного dataset | `needs_key` | Ключ из кабинета разработчика; проверять паспорт, лицензию, схему и периодичность каждого набора | По `updated_at`/паспорту набора, не чаще разрешённого |
| [Набор учреждений культуры №729](https://data.egov.kz/datasets/view?index=madeniet_uiymdary) | Venue supplement | Учреждения, адреса, контакты | `needs_key` / `candidate` | Ежегодный справочник, не афиша и не live schedule | После обновления dataset; monthly metadata check |
| Ticket marketplace URL, указанный официальным источником | External booking handoff | Доступ к покупке на момент открытия | `link_only` | Не найден public event catalog API с правом импорта; цена/наличие динамичны | Не ingest; открыть внешне, попросить пользователя перепроверить |

Проверенные факты о доступности источника не означают разрешение на массовое копирование. До договора Visit Astana, сайты театров и gov.kz остаются `link_only`.

## Что запросить у владельцев источников

Письмо Visit Astana и площадкам должно спрашивать конкретно:

- доступен ли JSON/CSV/ICS/RSS/feed или webhook;
- какие поля разрешено хранить и как долго;
- можно ли показывать название, краткое описание, цену, расписание и venue;
- разрешено ли передавать поля в LLM для краткого объяснения;
- разрешено ли хранить и трансформировать изображения;
- обязательная attribution и deep link;
- rate limits, refresh interval и уведомления об отмене/переносе;
- стабильные event/occurrence IDs;
- тестовая и production-среда;
- контакты для исправления данных.

Пока ответы не получены, pipeline не должен обращаться к внутренним endpoints сайтов.

## Модель данных

Событие и occurrence раздельны:

```text
Event
  id
  canonical_title
  organizer_id
  category_ids[]

EventOccurrence
  id
  event_id
  venue_id|null
  start_at|null
  end_at|null
  timezone
  doors_at|null
  status: scheduled|postponed|cancelled|ended|unknown
  price_min|null
  price_max|null
  price_currency|null
  price_basis: person|group|unknown
  ticket_url|null
  official_url
  language_tags[]
  age_rating|null
  source_id
  source_url
  retrieved_at
  source_updated_at|null
  checked_at
  valid_until
  ingest_mode: manual_curated_snapshot|official_feed|open_dataset
  quality_status: observed|derived|estimated|unknown|conflicting
  review_status: draft|verified|quarantined|published|stale|removed
```

Каждое существенное поле имеет field-level provenance. Один `source_url` у карточки не доказывает все поля сразу.

## Ограниченный P0 workflow после rights review

### 1. Discovery

Редактор находит событие только на официальной странице Visit Astana, организатора, площадки или gov.kz. Marketplace допустим только как переход, если на него ведёт официальный источник.

### 2. Rights gate

- Если есть договорной feed/open dataset с подходящими правами: продолжить как `official_feed`/`open_dataset`.
- Если доступна только публичная страница и её условия не запрещают редакционную фиксацию минимальных фактов: `manual_curated_snapshot`, минимальные факты и ссылка. Иначе только `link_only`.
- Если права/источник сомнительны: quarantine; в публичную выдачу не включать.

### 3. Capture

После rights review сохранять только необходимые факты: title, occurrence time/range, venue, price semantics, status, official URL, ticket URL, checked-at. Не копировать длинное описание, отзывы или изображение без отдельного права.

### 4. Normalize

- Локальное время преобразуется в ISO с явным timezone Astana pilot.
- Дата без времени остаётся без времени.
- Диапазон дат не превращается в ежедневный сеанс.
- `от 2 000 ₸` хранится как `price_min=2000`, `price_max=null`, не exact.
- Отсутствие цены хранится `unknown`, не free.
- Язык события не выводится из языка страницы или названия.
- Venue без точного адреса остаётся unresolved.

### 5. Validate

Блокирующие проверки:

- start раньше end;
- occurrence не завершён;
- URL HTTPS и принадлежит ожидаемому домену/организатору;
- venue связан с координатой или помечен unknown;
- цена имеет currency и basis либо unknown;
- нет запрещённых категорий и приватных мероприятий;
- нет claim о доступности билета/места без runtime evidence;
- изображение имеет manifest и право показа;
- источник не является поисковой выдачей или social repost.

### 6. Deduplicate

Сначала stable provider ID. Если его нет, candidate key:

```text
normalized organizer + normalized title + venue + local start
```

Не сливать события автоматически при разных датах, площадках или языковых версиях. Сомнительные совпадения переходят в manual review.

### 7. Publish

Публикуются только `verified` occurrences, для которых `valid_until` не истёк. UI показывает режим `snapshot` и время проверки. Карточка не получает бейдж `Проверено`, если проверен только формат URL.

### 8. Revalidate

Перед попаданием в финальные 1–3 варианта:

- проверить occurrence status и время;
- проверить, успевает ли пользователь прибыть до начала;
- проверить весь интервал посещения;
- обновить цену/наличие только при разрешённом источнике;
- при сетевой ошибке сохранить `last_success_at`, пометить stale и не превращать unknown в false/zero.

## Freshness policy

Это внутренняя политика QETTYQ, не обещание источника.

| Поле/сущность | TTL | Дополнительная проверка | Поведение после TTL |
|---|---:|---|---|
| occurrence status/start/end | 24 ч | T−6 ч для рекомендаций сегодня | `stale`, убрать из основных результатов |
| перенос/отмена | Немедленно после обнаружения | Перед финальной рекомендацией | `cancelled/postponed`, не рекомендовать |
| ticket availability | Не кэшировать как гарантию | Только во внешнем ticket flow | `unknown`, текст `проверьте наличие` |
| price | 24 ч для snapshot | Перед рекомендацией, если доступ разрешён | `unknown/stale`, не считать бюджет соблюдённым |
| venue address/coordinate | 7 дней | При конфликте источников | `conflicting`, не строить строгий маршрут |
| duration | 7 дней | При новой редакции event page | `unknown` при отсутствии |
| event language/age rating | 7 дней | Только event-specific source | `unknown` при отсутствии |
| government festival program | 12 ч в период проведения | T−3 ч для события сегодня | скрыть при неразрешённой неоднозначности |
| eGov venue dataset | По паспорту dataset | Metadata check раз в месяц | показывать дату набора, не live |

После `end_at` occurrence автоматически перестаёт быть кандидатом. Историческая запись может сохраняться для аудита, но не показывается как доступное событие.

## Состояния pipeline

```text
discovered
  -> rights_checked
  -> normalized
  -> validated
  -> verified
  -> published
  -> stale | postponed | cancelled | ended | removed

Любая стадия
  -> quarantined(reason)
```

Причины quarantine: ambiguous date, missing source, venue conflict, price parse error, unsupported language claim, media rights missing, source terms unclear, unsafe/private activity.

## UI contract

Карточка события обязана показывать:

- конкретный occurrence или честный date range;
- `Проверено [дата, время]` только как freshness, не как гарантию;
- цену exact/range/from/unknown;
- площадку и адрес либо `место уточняется`;
- длительность отдельно от дороги;
- source link и external ticket link;
- предупреждение о возможном изменении билетов/расписания;
- `Нужно уточнить`, если критичное поле unknown;
- `snapshot`, если нет разрешённого live feed.

Запрещённые UI-утверждения:

- `билеты есть`, если источник не дал runtime availability;
- `бесплатно`, если цена отсутствует;
- `RU / KZ`, если язык не указан event-specific источником;
- `12 минут пешком`, если нет routing response;
- `официальный партнёр`, если договор отсутствует;
- `события обновляются автоматически`, пока работает manual snapshot;
- `проверено`, если URL просто открылся.

## Failure modes

| Сбой | Системное действие | UI |
|---|---|---|
| Источник недоступен | Не удалять last good snapshot; записать error | Дата последней успешной проверки, stale |
| Парсер не понимает дату | Quarantine | Событие отсутствует в выдаче |
| Источники конфликтуют | Field `conflicting`, manual review | `Нужно уточнить` или исключение |
| Event исчез со страницы | `removed_candidate`, проверить отмену/перенос | Не рекомендовать |
| Ticket link сломан | Удалить CTA покупки, сохранить official source | `Проверить у организатора` только с рабочей ссылкой |
| Нет координат venue | Не строить маршрут | Адрес/место уточняется |
| Нет права на фото | Не загружать | Posterless/category illustration |
| Key quota exhausted | Остановить feed fetch, сохранить snapshot | Provider unavailable, без подмены данных |

## Контроль качества на каждый выпуск

- Все опубликованные events будущие относительно frozen release time.
- У каждого occurrence есть event-specific source URL или documented dataset row.
- `checked_at` и timezone заполнены.
- Unknown price не попал в фильтр `Бесплатно`.
- Date range не размножен в фиктивные ежедневные сеансы.
- Язык и age rating не выведены косвенно.
- Время пути не взято из Haversine как точное.
- Event image имеет разрешение; иначе placeholder.
- Ссылки organizer/ticket открываются и различаются в UI.
- Отменённые, перенесённые и завершённые occurrence исключены.
- Source registry и пользовательская страница `/sources` совпадают.

## Что можно сделать без нового доступа

1. Поддерживать небольшой `manual_curated_snapshot` с event-specific URL и ежедневной ручной проверкой.
2. Показывать Visit Astana, Astana Opera, Astana Ballet и gov.kz как источники/внешние переходы.
3. Использовать существующий OSM POI snapshot для площадок, не смешивая его с event facts.
4. Открывать Google Maps URL или 2GIS deep link для внешней навигации.
5. Показывать posterless card вместо копирования афиши.

## Что требует действия владельца

1. Получить письменные условия feed у Visit Astana и выбранных площадок.
2. Получить eGov developer key через доверенный secret setup и проверить паспорт конкретного dataset.
3. Согласовать право хранения/показа медиа и передачу минимального evidence в LLM.
4. Назначить редактора и окно ежедневной проверки, если pilot остаётся manual snapshot.

До выполнения этих шагов официальный статус event layer: **малый вручную проверяемый snapshot, не live city calendar**.
