# Источники ежедневной афиши: Астана → Алматы

Дата исследования: **20 октября 2026**. Это фактический аудит доступности/полей и проектное предложение контрактов, не отчёт о подключении новых провайдеров или VPS. Изменены только этот отчёт и `data/event-source-candidates.json`. Сервер, UI, секреты, аккаунты, публикация и расписания задач не менялись. Платных вызовов и обращений к площадкам не было.

## Короткий вывод

Нельзя собрать достоверную большую афишу только из карты организаций. Нужны три независимых контура: **места и часы работы**, **конкретные события/сеансы**, **медиа с правами**. Сейчас работает ограниченный Sxodim-адаптер и отдельный OSM snapshot. Остальные проверенные сайты — кандидаты/внешние ссылки, не подключённые API.

Три наиболее применимых источника для следующего ограниченного этапа:

| Приоритет | Источник | Почему | Что разрешено/не готово |
|---|---|---|---|
| 1 | Sxodim Astana | Уже есть проверяемые Event JSON-LD и текущий адаптер; много категорий | Только действующий некоммерческий scope с credit; расширение beyond max8 требует отдельного fetch/policy review; афиши не лицензированы автоматически |
| 2 | Национальный музей РК | Надёжно прочитаны выставочные периоды, часы и объявления-исключения | Хороший первый официальный партнёр для нормализации посещений; permission/feed для постоянной автоматизации ещё не получены |
| 3 | Astana Ballet | Публичная афиша показывает отдельные даты, время, адрес и Ticketon booking links | Узкое, полезное покрытие площадки; текущий raw HTTP нестабилен, права/год/надёжный feed необходимо подтвердить |

Для большого охвата кино и билетных мероприятий параллельно нужен **официальный партнёрский feed Kino.kz или Ticketon**. В этом исследовании открытый лицензированный API не подтверждён. «Партнёрская программа существует» не означает, что QETTYQ уже имеет доступ.

## Метод и границы доказательств

Читались 1–2 основные публичные страницы на источник, документация/условия и ограниченная поисковая выдача для обнаружения официальных URL. Отдельный переход Kino.kz в переключатель языка не дал данных сеансов. Доступа к кабинетам, cookies и ключам не использовалось. За 403/429 не следовали повторные попытки, смена IP, приватные endpoints или обход.

Навык Defuddle прочитан полностью; CLI не установлен. Глобальные установки/настройки не менялись; использован встроенный web reader. Его cached/indexed content ниже явно отделён от прямого HTTP. Два ограниченных raw HTTP GET тех же известных страниц выполнялись только для проверки формата/доступности, без скачивания картинок. Поисковые snippets не импортировались как реальные occurrences.

Для большинства новых кандидатов robots в этом проходе **не проверен**. Это не `allow` и не `disallow`: регулярный сбор остаётся выключенным до проверки robots, условий и допустимого объёма. Robots сам по себе не выдаёт авторскую лицензию. Предложенные интервалы ниже — наши стартовые настройки для согласованной интеграции, не обещанные лимиты поставщика и не созданный cron.

## 1. Sxodim

Прочитаны [афиша Астаны](https://sxodim.com/astana) и [условия](https://sxodim.com/polzovatelskoe-soglashenie). Есть категории, даты, времена, названия площадок/адреса, минимальные цены и ссылки на подробности/покупку. Верх страницы содержит продвигаемые карточки, а не строгую хронологию. Наличие в index не означает, что конкретный сеанс ещё впереди.

Действующий адаптер использует public HTML + `schema.org/Event`, фиксированные source URLs, robots/terms guards и max8 detail pages. В отдельном ранее выполненном bounded live run `2026-10-20T16:15:55.319Z` получены 8 будущих occurrences. Это измерение конкретного run, не текущее гарантированное количество или полная афиша города. В текущем исследовании новый массовый импорт не выполнялся.

Наблюдаемые поля: numeric card ID; canonical event URL; title/category; ISO start с offset; nullable end; адрес/venue; JSON-LD Offer или data-minprice; booking URL; image candidate metadata. JSON-LD geo, organizer URL, language/end могут отсутствовать. В ранее проверенных восьми occurrences organizer URL отсутствовал, поэтому агрегатор не назван официальным сайтом организатора. Структурированное `InStock` не трактуется как подтверждение доступного места сейчас.

Условия дают основание для **некоммерческого** использования с указанием автора и ссылкой. Это не approval коммерческого сервиса и не проверенная цепочка прав на каждую стороннюю афишу. Credit нельзя убрать из публичных карточек только потому, что источники хотелось оставить в админке. Условия расширенного crawling/описаний/отправки больших текстов в LLM нужно согласовать отдельно. Текущий hourly on-request cache сохраняется; предложенное расширение не включать автоматически.

## 2. Ticketon

Проверены [городская страница](https://ticketon.kz/astana) и [официальная оферта](https://ticketon.kz/en/cms/agreement). Первая не загрузилась в web reader; вторая дала **403** при прямом чтении. Поиск показал индексированный текст этой официальной оферты: документ регулирует покупку билетов и описывает event/venue/date/time/price/seat category. Это описание сделки, не факт чтения текущего списка мероприятий и не разрешение распространять данные/фотографии.

Доступный в поиске официальный документ также различает платформу и организатора; наличие карточки не гарантирует проведение события. Не использовались URL служебного gateway, найденные в выдаче: опубликованный документ на таком хосте не делает соседние API разрешёнными.

Статус: `link_only`, API не подключён. Нужен партнёрский договор/feed, включая provider IDs, отмены/переносы, временные зоны, price kind, availability freshness, media rights и право отображения/хранения/LLM-контекста. Предложение после договора: refresh metadata раз в час либо точнее по SLA, короткая перепроверка наличия только перед booking и только разрешённым API. Не считать такую частоту сейчас разрешённой.

## 3. Kino.kz

Прочитаны [главная](https://kino.kz/) и [публичный договор](https://kino.kz/ru/profile/p/info/info). Главная перенаправила на `/en` и показала выбранный **Almaty**: это нельзя незаметно записать как Astana. Видны title, жанры/age labels, event dates, venue labels, from-prices и detail links. Наличие фильма в каталоге не доказывает конкретный сеанс в нужном кинотеатре.

В footer есть официальный [Become a partner](https://partners.kino.kz/) link; кабинет не открывался, заявка не отправлялась. Договор относится к покупателям и информационно-техническим услугам, не даёт подтверждённой лицензии на API/export/афиши. Документированных разрешённых методов для QETTYQ в этом проходе не найдено.

Нужны отдельные данные на каждый screening: cinema/hall ID, local start/end или runtime с понятным основанием, audio language, subtitle language, формат показа, конечная/минимальная цена, ограничения, booking URL и policy на media. Язык интерфейса/названия фильма **не равен** языку сеанса. Предложение после договора: расписание 30–60 минут, sold-out/цена — по SLA и перед переходом к покупке. Сейчас только внешняя ссылка, без импорта.

## 4. Национальный музей Республики Казахстан

[Главная музея](https://nmrk.kz/ru/) сейчас показывает обычные часы **вторник–воскресенье 10:00–18:00**, понедельник выходной. Там же есть отдельное датированное объявление о более позднем открытии 13 октября: исключение нельзя заменять обычным недельным правилом или применять ко всем последующим дням.

[Статья о выставке](https://nmrk.kz/ru/press/news/973/) содержит период **13 октября 2026 — 13 января 2027**, адрес площадки и публичные контакты. Прямой ограниченный GET этой статьи вернул HTTP200; в полученном article HTML не обнаружены JSON-LD или `<link>` advertised RSS/Atom/ICS. Это не доказательство отсутствия feeds на всём сайте.

Выставочный период — не единый непрерывный 24/7 occurrence. Доступное окно посещения получается из пересечения exhibition date range, weekly opening hours и конкретных exception notices. Цена выставки, ticket inventory, язык экскурсии и координаты из этой статьи не подтверждены. Часы здания не доказывают расписание экскурсии.

Повторное использование описаний/фото и постоянный automated export пока не согласованы: license unknown, не allowed. Предложение для партнёра: афиша/exception notices каждые 6 часов, базовые часы раз в сутки, срочные исключения webhook/ручное подтверждение. Для low-volume разрешённого пилота можно быстрее вручную согласовать небольшой JSON/CSV, чем строить хрупкий универсальный scraper.

## 5. Astana Ballet и Astana Opera

[Astana Ballet / афиша](https://astanaballet.com/ru/posters) в web reader показала четыре ближайших строки с разными датами/временем, единый venue address, descriptions, detail links и Ticketon booking links. Год в извлечённой подписи day/month не указан. Две постановки с одинаковым названием и разными датами — разные occurrences, не дубль для удаления. В footer есть copyright reservation; blanket photo/data reuse grant не найден.

Один bounded raw GET той же страницы вернул **HTTP500**. Его HTML не является валидной event page; отсутствие JSON-LD в error body ничего не доказывает о нормальном сайте. До надёжного feed/API/согласованного HTML режима это кандидат, не готовый ежедневный адаптер. Year/timezone/end/language/price/coordinates/inventory нужно подтвердить, не достроить из сезона и адреса. Предложение после разрешения: metadata каждые 6 часов, отмены быстрее по feed.

[Astana Opera](https://astanaopera.kz/) дала timeout. Для известной [официальной страницы афиши](https://astanaopera.kz/ru/afisha/678) прямой reader показал generic support/donation shell, тогда как официальная поисковая индексация содержала title, hall, даты/время, duration, age и языки представления. Это важное противоречие доступности: индексированные слова полезны для обнаружения источника, но не доказательство живого сеанса. Стабильный licensed JSON/ICS/CSV предпочтительнее переноса stale snippets. Нового API не выдумано.

## 6. Visit Astana и городские календари

Прочитан официальный [календарь](https://visitastana.kz/ru/about-city/where-to-go/). Он отдаёт навигацию upcoming/past, локали и календарную оболочку, но в текущем ответе usable event records отсутствовали; year selector показывал 2025. В footer явно reserved rights. Открытая страница не равна пригодному актуальному dataset.

Поиск на официальном домене обнаружил старые календарные страницы: там встречаются title, date ranges, иногда time/from-price/description/detail links. Эти старые результаты **не предлагаются как события сегодня**. Общедоступного стабильного licensed RSS/ICS/JSON API в пределах этого прохода не подтверждено. Следующий путь — официальный export/calendar feed и разрешение reuse. Предложение после этого: 6–24 часа для metadata, отдельные отмены по SLA.

## 7. Часы кафе и ресторанов: OSM, затем договорённые данные владельца

Изучены [opening_hours](https://wiki.openstreetmap.org/wiki/Key:opening_hours) и [лицензия OSM](https://www.openstreetmap.org/copyright). Формат поддерживает недельные правила, несколько интервалов, ночные переходы, public/school holiday selectors и датированные исключения. Нужен настоящий parser и корректная календарная база Казахстана: отсутствие поддержанных holiday definitions — unknown, не «открыто».

Существующие 80 POI проекта — snapshot; у пяти заполнен адрес, известных цен нет. Hours evaluator и свежая коллекция opening_hours **не подключены**. Для следующего экспорта нужно запросить OSM type/id/version/timestamp, name, amenity, addr tags, opening_hours, website/contact при наличии; node coordinates — observed, derived area centroid — derived. Не заполнять отсутствующий адрес или цену догадкой.

ODbL data reuse требует атрибуции/условий распространения; правила конкретного Overpass/export provider отдельно обязательны. OSM image/website tag не лицензирует найденную внешнюю фотографию. Не использовать чужие Google/2ГИС значения как свободно сохраняемые «OSM enrichment». Предложение: разрешённый небольшой POI/hours export раз в сутки или реже с conditional updates, а изменения владельца заведения — отдельным подтверждённым источником. Часы кафе не создают событие «живая музыка сегодня».

Для меню/среднего чека лучший источник — датированное меню/предложение владельца с разрешением. «Средний чек» требует определённой методики/единицы, не вычисляется из категории или красивой фотографии.

## 8. Google Places: отдельные права и экономика

Проверены [policies Places API](https://developers.google.com/maps/documentation/places/web-service/policies) и [официальное описание Place](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places). Provider даёт потенциально opening-hours и price fields, но эти данные сейчас не подключены к QETTYQ; paid API не вызывался.

`priceLevel` — категориальный уровень, не средний чек в ₸. `priceRange`, если реально возвращён, — reported money range с валютой и возможно без upper bound, не статистический средний чек и не гарантированная стоимость визита. Missing field остаётся null. `currentOpeningHours` описывает ближайший период с special hours; это не вечное weekly правило.

Google content нельзя по умолчанию складывать в постоянную независимую POI-базу или переносить на OpenFreeMap как собственные открытые сведения. Нужны совместимый режим отображения/атрибуция, проверка field-specific storage restrictions, разрешённые API/SKUs и бюджет. `place_id` и производные лицензируемые поля не смешивать без provenance. Не подразумевается разрешение будущего платного провайдера.

## 9. Threads

Официальная [Meta documentation page](https://developers.facebook.com/docs/threads/keyword-search/) вернула **429**; повторов/обхода не было. Прочитан [официальный Meta Postman overview](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api): подтверждены app setup, пользовательская авторизация, OAuth/token и scope configuration. Обзор прямо предупреждает, что collection не покрывает все последние features.

Актуальная доступность keyword-search permission, quota, app review и доступ конкретного аккаунта **не подтверждены**. App ID не равен access token или разрешённой search capability. Никакие значения credentials не читались. Не подключать private profile scraping, browser-session harvesting или «тихий» обход.

Даже при approved API пост — discovery lead: timestamp публикации не есть начало события, geotag не гарантирует venue, слова про цену/места не являются инвентарём. Нужны разрешённое хранение/удаление, права автора, модерация и/или подтверждение организатора, после чего создаётся нормализованное событие с собственной доказательной цепочкой. Proposal polling зависит от фактических approved limits; пример часа в registry не является установленной квотой.

## Контракт следующего адаптера и RAG

Согласовано сообщением с backend/RAG агентом: существующий EventEvidence сохраняется; здесь только proposal, без shared-schema edits.

```ts
type SourceRecord = {
  sourceId: string; providerId: string | null; canonicalSourceUrl: string;
  fetchedAt: string; sourceUpdatedAt: string | null; expiresAt: string | null;
  rights: { fetch: 'approved_for_scope' | 'unknown' | 'blocked';
    persist: boolean; display: boolean; sendToLlm: boolean;
    requiredCredit: string | null; scopeReference: string };
};
type FieldFact<T> = {
  value: T | null; quality: 'observed' | 'derived' | 'estimated' | 'unknown' | 'conflicting';
  sourceUrl: string; fetchedAt: string; expiresAt: string | null;
};
type ProposedOccurrence = SourceRecord & {
  cityId: 'astana' | 'almaty'; title: FieldFact<string>;
  description: FieldFact<string>; // only licensed excerpt, never raw page instructions
  startsAt: FieldFact<string>; endsAt: FieldFact<string>; timeZone: FieldFact<string>;
  venueId: string | null; venueName: FieldFact<string>; address: FieldFact<string>;
  coordinates: FieldFact<{ lat: number; lon: number }>;
  audioLanguages: FieldFact<string[]>; subtitleLanguages: FieldFact<string[]>;
  price: FieldFact<{ kind: 'exact' | 'from' | 'range';
    minMinor: number; maxMinor: number | null; currency: string;
    basis: 'person' | 'group' | 'ticket' | 'unknown' }>;
  availability: FieldFact<'available' | 'sold_out' | 'cancelled' | 'postponed'>;
  organizerUrl: FieldFact<string>; contactUrl: FieldFact<string>; bookingUrl: FieldFact<string>;
  recurrence: FieldFact<{ rrule: string; exdates: string[] }>;
  media: { sourcePage: string; candidateUrl: string | null;
    author: string | null; license: string | null; grantReference: string | null;
    displayApproved: boolean; storageApproved: boolean; revokedAt: string | null }[];
};
// PlaceOpeningHours is separate from Occurrence:
// rawRule + parserVersion + timezone + calendar/holiday version + dated exceptions + provenance.
```

Если final price неизвестна, её не заменяют нулём. Фото сначала metadata candidate, затем grant review и file validation; кандидатский URL не передаётся модели как доказательство и не означает разрешённый hotlink. Если recurrence/год неизвестны, не генерировать будущие повторы. Свой expiry вычисляет policy adapter; не приписывать его поставщику.

Минимальная схема исполнения: reviewed source allowlist → bounded fetch с conditional requests/Retry-After → parse без JS execution → field validation/quarantine → source-level IDs + occurrence dedup → отдельное venue resolution с provenance → permitted storage → время/бюджет/статусы проверяет код → компактный evidence с source URL → AI объясняет выбранные IDs → UI строит факты и ссылки из server records. RAG не принимает URL произвольно от модели/пользователя и не поднимает confidence чужой картинки до подтверждённого факта.

Для VPS позднее: отдельная очередь ingestion с per-source concurrency/rate budget, lock, backoff, журналом без PII, durable last-good snapshots и takedown/media revocation. Это предложенная архитектура, **не развёрнутый VPS, не зарегистрированный cron и не новая автоматизация**. Увеличение охвата сначала требует условий источников, потом инфраструктуры, а не наоборот.

## Изменения реестра и проверка

Устаревший Sxodim status исправлен с `candidate/fetchApproved:false` на `approved_for_scope` для существующего узкого некоммерческого адаптера. Новые страницы/другой город/коммерческое использование не получили разрешение автоматически. Добавлены National Museum и OSM-hours, реальные ошибки доступа, separate observed/indexed fields и proposal-only intervals.

Локальная проверка: JSON parse, уникальность source IDs, report reference. Сетевые unit/интеграционные тесты и новые адаптеры не запускались, поскольку scope — исследование, не реализация.
