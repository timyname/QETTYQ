# QETTYQ Data Hub v1

Статус: **реализован, подключён к VPS/API и проверен offline**, Node24 + существующая
SQLite, без новых зависимостей. Production credential hash и deploy выполняет
оркестратор отдельно. Наличие этих модулей **не означает**, что endpoint уже
опубликован или что Threads стал разрешённым источником.

## Назначение и границы

Внешний сборщик на другом компьютере присылает **нормализованные факты**, а не URL
для парсинга. Hub не открывает эти URL, не скачивает картинки, не исполняет HTML,
не запускает LLM и не меняет реестр разрешений источников. Место, событие,
конкретный сеанс, денежное предложение и права фотографии разделены.

Источники с неизвестными правами, включая начальный Threads-кандидат, попадают в
карантин. При отсутствии `data_sources.allow_persist=1` полный нормализованный
payload **не сохраняется**: только producer/source IDs, внешний ID/revision, hash,
allowlisted URL для проверки, время и reason codes. Ни текст поста, ни авторский
профиль не являются входными полями. У неизвестного источника нет автоматического
доступа в публичную афишу или AI-контекст.

## Подключение на сервере — только trusted startup

Файлы и exports:

- `src/server/data-hub/schema.ts`: `DATA_HUB_SCHEMA_V1` — полный additive DDL;
  вызывает **root-controlled migration/startup**, не request handler.
- `repository.ts`: `createDataHubRepository(db, clock?)`, `hubHash`, `hubEntityId`.
- `service.ts`: `createDataHubService(repository).handle(request)`.
- `contracts.ts`: Zod schemas, `HubRecord`, `HubProducer`, `HubBatchResult`, лимиты.
- `public-feed.ts`: отдельные `HubPublicFeed/HubPublicPlace/HubPublicEvent`;
  `createPublicDataHubFeed(repository, clock?).get({cityId,forLlm?})`.
- `events-bridge.ts`: `createHubEventsBridge`, `hubEventToLiveEvent` — мост к
  существующим карте/афише/чату без новой загрузки источников.

```ts
db.exec(DATA_HUB_SCHEMA_V1); // существующий durable DB, установленная базовая схема
const repository = createDataHubRepository(db);
repository.registerProducer({
  id: 'threads-collector',
  tokenHash: trustedConfig.tokenHash, // SHA-256; не plaintext-token
  sourceIds: ['threads-candidate'],
  sourceHosts: { 'threads-candidate': ['www.threads.com', 'www.threads.net'] },
  cities: ['astana'], enabled: true,
  maxBatchesPerMinute: 10, maxRecordsPerDay: 1000,
  maxBytesPerDay: 5 * 1024 * 1024,
});
const inbox = createDataHubService(repository);
// HTTP route POST: return inbox.handle(request)
```

VPS controlled startup транзакционно применяет DDL. Конфигурация
`QETTYQ_HUB_THREADS_TOKEN_SHA256` принимает **только lowercase SHA-256 hex**, не
plaintext token. Валидный hash регистрирует `threads-analyzer`,
`sourceIds:['threads-candidate']`, четыре exact hosts `threads.com`,
`www.threads.com`, `threads.net`, `www.threads.net`, scopes Astana/Almaty. При этом
`data_sources` для Threads **не создаётся** и прав не получает. Missing/invalid hash
выключает `runtime.dataHub` и ранее зарегистрированного producer. Route503 не
раскрывает credential details. Node-free `HostedRuntime.dataHub?` содержит только
`handle(request)` и `getFeed({cityId,forLlm?})`, не DB/repository/token.

Cleanup запускается на startup и затем каждую минуту; unref interval очищается
при `runtime.close()`. AI ledger, память, source cache и routing quota не
сбрасываются. DDL предназначен для **первой установки Hub v1**; при изменении уже
развёрнутой схемы в будущем нужна отдельная миграция, не надежда на IF NOT EXISTS.

Приведённые hosts — пример **администраторского allowlist**, не подтверждение
разрешения Meta на API, сбор, хранение, публикацию или LLM. Конкретный источник,
его source ID и реальные разрешения проверяются отдельно. Exact hostname match:
поддомены/wildcards не подразумеваются. Проверяются primary source URL, URLs
каждого provenance fact, coordinate provenance и source page фотографий.
Booking/organizer links и image candidates не скачиваются.

Случайный opaque bearer-token создаёт root доверенным локальным механизмом и
передаёт сборщику **вне чата, публичного Git, фронтенда и отчётов**. Сервер хранит
только hash; разные сборщики получают разные producer IDs/tokens/scopes.
Изменение tokenHash отзывает старый token, `enabled:false` отключает producer.
`registerProducer`, `registerMediaGrant` и изменение `data_sources` не доступны
через machine endpoint. Пользовательская cookie не заменяет machine token.

Не логировать Authorization, тело batch, SQL parameters и credential config.
Серверу нужен HTTPS; reverse proxy также должен ограничить размер/скорость тела.
Сам service читает stream с проверкой фактических bytes и отменяет oversized body.

## HTTP contract

Реализованный endpoint: `POST /api/internal/data-hub/batches`.

```http
Authorization: Bearer <opaque producer token supplied out of band>
Content-Type: application/json
```

Запросы с Origin или cross-site fetch metadata запрещены: это M2M, не CORS/UI API.
Никаких admin/publication/source-approval flags в body нет. Не больше **50 записей
и 256KiB UTF-8 на весь body**. Не передавать raw HTML/posts, user GPS, cookies,
ключи, base64-картинки или неизвестные дополнительные поля.

Минимальный запрос, заведомо не дающий прав Threads:

```json
{
  "schemaVersion": 1,
  "batchId": "collector-batch-20261021-001",
  "records": [{
    "kind": "place",
    "sourceId": "threads-candidate",
    "externalId": "provider-stable-place-id",
    "revision": 1,
    "sourceUrl": "https://www.threads.com/@example/post/example",
    "fetchedAt": "2026-10-21T10:00:00Z",
    "expiresAt": "2026-10-21T11:00:00Z",
    "dataMode": "snapshot",
    "facts": {
      "cityId": "astana", "name": "Название из разрешённого источника",
      "category": null, "address": null, "coordinates": null,
      "openingHours": null, "tags": []
    },
    "provenance": [{
      "field": "name", "quality": "observed", "method": "source", "methodId": null,
      "sourceUrl": "https://www.threads.com/@example/post/example",
      "fetchedAt": "2026-10-21T10:00:00Z", "expiresAt": "2026-10-21T11:00:00Z"
    }],
    "media": []
  }]
}
```

Это **иллюстрация формата**, не реальная площадка/пост, не живые данные и не
готовое сегодняшнее событие. Timestamp должен соответствовать реальному сбору.

Первичная загрузка: **202** с результатами каждой записи; replay неизменного
producer+batchId: **200**, `replay:true`, исходные счётчики. Пример:

```json
{
  "schemaVersion": 1, "batchId": "collector-batch-20261021-001", "replay": false,
  "accepted": 0, "quarantined": 1, "duplicate": 0,
  "records": [{
    "recordId": "server-generated-id", "externalId": "provider-stable-place-id",
    "kind": "place", "revision": 1, "status": "quarantined",
    "reasons": ["SOURCE_PERSIST_NOT_APPROVED", "SOURCE_DISPLAY_NOT_APPROVED"]
  }]
}
```

Другие ответы:400 invalid JSON/envelope/version;401 bad/disabled token;403 source
scope или browser origin;409 изменённый уже использованный batchId;413 body limit;
415 content type;429 durable budget;503 unavailable DB/capacity. SQL/provider/stack
details в ответ не выходят. Невалидный **record** обычно quarantined, а не 400 всего
batch; source-scope нарушение отклоняет batch целиком до записи. Город вне scope
отправляет конкретную запись в карантин, не разрешает расширение покрытия.

## Поля и нормализация

Общая оболочка каждой записи:

| Поле | Правило |
|---|---|
| `sourceId`, `externalId`, `revision` | source из scope; стабильный provider ID; монотонный positive integer revision |
| `kind` | `place`, `event`, `occurrence`, `offer` |
| `sourceUrl` | public HTTPS metadata URL, разрешённый hostname; никогда не fetch |
| `fetchedAt`, `expiresAt` | ISO datetime с явным offset/Z; expires после fetched и ещё не истёк |
| `dataMode` | только `live`/`snapshot`; строка не повышает достоверность сама по себе |
| `provenance` | максимум32 typed facts; field, quality, method, methodId, sourceUrl, timestamps |
| `media` | максимум8 metadata candidates; binaries/URLs не загружаются |

`quality`: observed/derived/estimated/unknown/conflicting. `method`:
source/algorithm/llm. LLM-derived factual records требуют review и quarantined;
LLM не назначает деньги, даты, наличие, часы или язык. Unknown/conflicting
provenance не подтверждает заполненное поле. Для каждого существенного
непустого поля требуется provenance с покрывающим сроком актуальности. Имя,
расписание, денежный aggregate `price`, часы, язык и наличие требуют
`observed + source`. Неизвестные поля передаются **явно null/unknown**, не нулём.

Типы `facts` (полные точные схемы — `contracts.ts`):

- **place**: cityId, name, category/address/openingHours nullable, tags[],
  coordinates nullable. Координаты `{lat,lon,quality:'observed'|'derived',
  sourceUrl,methodId}`. Для derived обязателен метод алгоритма в coordinates и
  provenance. Range/city box проверяет код. Отсутствующие координаты не геокодятся
  и не подменяются центром города. Часы — raw reported string, не обещание open now.
- **event**: cityId, name, category nullable, venueExternalId nullable,
  organizerUrl/bookingUrl/description nullable. Без даты это ещё не occurrence.
- **occurrence**: cityId, eventExternalId, venueExternalId nullable, startsAt,
  endsAt nullable, `timeZone:'Asia/Almaty'`, status, languages[], availability.
  Начало без времени/offset или null → quarantine. End обязан быть позже start;
  неизвестный end не выводится из типа события. `languages:['und']` — неизвестно,
  не язык интерфейса. starts/end в SQL нормализуются в UTC, source timezone хранится.
  Status: unknown/scheduled/cancelled/postponed/rescheduled. Отменённые/перенесённые
  occurrence не возвращаются из active feed, история ревизий сохраняется.
- **offer**: cityId, appliesTo `{kind,externalId}`, priceKind, minMinor/maxMinor,
  currency, basis, validFrom/validUntil nullable, availability, bookingUrl nullable.
  Деньги — integer minor KZT. unknown: min/max/currency null; exact: max=min;
  from: max null; range: max≥min. Basis person/group/unknown. Для заполненной цены
  provenance field=`price` покрывает денежный aggregate. Нет возможности вывести
  бесплатность, финальную цену или наличие мест из отсутствующего значения.

Связи разрешаются **внутри того же source ID** по external ID. Batch сначала
обрабатывается place→event→occurrence→offer, поэтому порядок элементов во входном
массиве произвольный; результаты возвращаются в исходном порядке. Не найденная,
другогородняя или истёкшая ссылка → quarantine. Межисточниковая fuzzy-склейка,
слияние филиалов и автоматическая генерация повторов отсутствуют.

## Идемпотентность, квоты и хранение

Вся загрузка — одна SQLite `BEGIN IMMEDIATE` transaction: last-good данные не
обнуляются из-за bad record, а DB failure откатывает batch. Неизменный record
дедуплицируется по source/kind/externalId/revision + canonical SHA-256. Изменение
контента при том же revision → quarantine `REVISION_CONFLICT`, не overwrite.
Новая revision должна быть выше accepted head и не старее его fetchedAt.
Quarantine не продвигает head и не заменяет последнюю accepted revision.
После получения новых прав producer присылает новую revision: старый карантин не
публикуется автоматически после изменения разрешений.

Durable limits (ни один из них не относится к AI/Google financial ledger):

- default producer:10 batches/minute,1000 records/UTC day,5MiB/UTC day;
- global:60 batches/minute,10000 records/UTC day,50MiB/UTC day;
- одноразовый hard ceiling100000 stored record metadata rows → fail closed503;
- records/quarantine payload retention7days; expired quarantine rows удаляются;
  accepted head сохраняет минимальные hash/revision metadata без payload;
- batch idempotency metadata30days; неизменные replays не тратят новую квоту;
- source applicability TTL: до7days для place, до24h для остальных, но source
  policy может потребовать меньший срок. Это наш предел, не SLA поставщика.

`purgeExpired()` исполняется при authenticated ingestion до новой transaction.
VPS startup вызывает purge и запускает управляемый minute interval с dispose.
Остановленный процесс не обещает физическое удаление ровно в момент TTL;
следующий startup выполнит очистку. Истёкшие данные **немедленно
исключаются при чтении**, независимо от выполнения cleanup. SQL normalized entity
tables содержат последнюю accepted версию с expiry; публичный код должен читать
только gated helper, не эти таблицы напрямую. Не обещается forensic-удаление из
WAL/backup: отдельная retention/backup политика остаётся за root.

## Отдельные права изображений

Producer `media` содержит externalId, url, sourceUrl, type, author/license/evidenceUrl
nullable. Заявление producer о лицензии **не даёт** права показа/скачивания/LLM.
Новая фотография получает все права false, а событие может остаться без фотографии.

Только trusted root вызывает `registerMediaGrant({sourceId,assetUrl,license,
evidenceUrl,credit,allowDisplay,allowDownload,allowLlm,expiresAtMs})` для **точного
asset URL**. Helper повторно проверяет актуальный grant; revoke/expiry не требует
повторного импорта. При показе использует актуальные root-approved license,
evidenceUrl и credit, а не неподтверждённую подпись producer. Сам модуль файлы не
скачивает даже при `allowDownload:true`.

## Чтение accepted feed и карантина

```ts
repository.readAcceptedRows({
  kind: 'occurrence', cityId: 'astana', now: Date.now(), limit: 50,
  // sourceId / externalId optional exact filters
  forLlm: false,
});
repository.listQuarantined(50); // trusted admin/CLI only, metadata/reasons без payload
```

Accepted feed повторно проверяет `allow_persist`, `allow_display`, freshness и
status, для AI также `allow_llm`; медиа имеют отдельный grant. Чужой producer не
может сам изменить эти разрешения. Возвращается нормализованная запись, стабильный
server ID, source credit и только разрешённые media. `public-feed.ts` соединяет
event/occurrence/place/offer IDs; отдельный `priceEvidence` хранит URL/time **offer**,
а не приписывает цену странице occurrence. Несколько применимых offers дают
conflicting/unknown цену, не искусственно выбранную минимальную стоимость.

`GET /api/data-hub/catalog?city=astana` отдаёт только этот source-approved feed;
в нём нет количества карантина, producer IDs, token hashes, raw payload или scopes.
Вне настроенного VPS runtime —503. Алматы в публичном route пока400. Контракт
города/producer scopes предусмотрен для будущего этапа, не означает новое покрытие.

`runtime.events.get()` сначала получает существующую hourly-cached афишу, затем
добавляет текущие разрешённые hub occurrences без дополнительных HTTP-вызовов.
У mixed result общие source/coverage=null; каждая карточка сохраняет source credit,
fetchedAt, индивидуальный dataMode/freshness и честный parserVersion
`qettyq-data-hub-v1`, а не притворяется Sxodim. Текущая политика источника проверяется
при каждом чтении: revoke немедленно исключает запись, unknown Threads не попадает
в карту/чат. После этого существующий deterministic retrieval проверяет дату,
деньги, интересы/исключения; Hub не заменяет эти проверки генерацией модели.

Legacy-карточка поддерживает exact/from/unknown: reported range остаётся в новом
Hub DTO, а в legacy превращается в unknown с явным warning, **не** в free/from.
Availability legacy остаётся unknown; координаты имеют observed/derived качество
и метод/source provenance, без угадывания центра города. Media в legacy остаётся
null до совместимого approved-image renderer. Source-approved hub places видны
в новом catalog endpoint; старый static POI каталог автоматически ими не заменён.

Accepted означает разрешённый factual feed, **не бронь, не гарантированное наличие
и не завершённую независимую модерацию**. Факты одобренного источника могут быть
доступны через существующую афишу; кандидат без разрешений не публикуется.

## Read-only CLI администратора

Команды выполняются в рабочей копии с Node24 и **уже установленным** repo `tsx`.
Новых установок/сетевых запросов не требуется. CLI открывает explicit DB readonly,
не загружает `.env`, не читает tokens и не меняет grants:

```sh
node --import tsx src/server/data-hub/cli.ts readiness --db /absolute/path/qettyq.sqlite
node --import tsx src/server/data-hub/cli.ts quarantine --db /absolute/path/qettyq.sqlite
node --import tsx src/server/data-hub/cli.ts feed --db /absolute/path/qettyq.sqlite
node --import tsx src/server/data-hub/cli.ts review-source /absolute/path/review.json
```

`review-source` только валидирует proposal: schemaVersion1, sourceId, policyUrl,
reviewedAt, approvalReference, sourceHosts[], allowedUses{persist,display,sendToLlm},
mediaApproved:false. Результат всегда `applied:false`,
`requiresSeparateOwnerApproval:true`. Эта команда **не подтверждает подлинность
разрешения** и не включает источник. До изменения `data_sources` root обязан
получить отдельное разрешение владельца с документированным основанием/границами;
для Threads оно не подставляется автоматически. Quarantine output — только для
trusted admin/CLI, не общий публичный dashboard.

## Проверки и передача

Проверены настоящая SQLite и временная persistent DB с явно synthetic fixtures,
фиксированным временем; provider calls не выполнялись. Проверены dependencies,
replay/conflict, monotonic heads,
unknown Threads/no payload, token/scopes/revocation/browser denial, host spoof,
ambiguous dates, unknown/free/LLM money, exact-media grant, expiry, cancellation,
repository restart, provenance/derived coordinates, byte/record budgets, actual
child-process readonly CLI, protected API, неизвестный Threads после restart,
accepted feed→map/chat bridge, price source evidence, revoke/expiry и ошибки
без SQL leaks. Последние фактические команды/результаты — ниже.

Общая базовая схема/конфиги/зависимости/финансовые ledger не менялись. Новые Hub DDL,
VPS/host bridge, две API routes и additive generic event DTO подключены по отдельному
разрешению root. Реальные tokens, внешние события, фотографии и deploy этим агентом
не создавались. Следующий проверяемый шаг root: deployment с trusted hash config
→ authenticated synthetic smoke в изолированном namespace → quarantine unknown
Threads/no payload/no public leak. Источник и media permissions — отдельное решение.

Финальная проверка этого этапа:

- `vitest run tests/unit tests/integration`: **386/386 PASS**,38 files.
- `tsc --noEmit`: PASS.
- Scoped ESLint для Hub, VPS/host bridge, generic event additions, routes и тестов: PASS.
- Последний целевой run `data-hub + vps-runtime + event-evidence + hosted-api +
  backend-pilot`:71/71 PASS до финального полного прогона.
- Live ingestion, реальный machine token, billing calls, публичный deployment и
  post-deploy smoke этим агентом не запускались.
