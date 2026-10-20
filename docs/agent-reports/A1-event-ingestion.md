# A1 · События, новости и разрешённый импорт

Дата проверки: 20 октября 2026. **Исторический первый проход:** локальный конвейер был implemented + tested без live источника. Последующий live Sxodim adapter, настоящий HTTP smoke и ограничения описаны в актуальном `A1-live-afisha.md`. Изображения не скачивались; фонового cron нет. Остальной текст ниже фиксирует первоначальное исследование, а не отменяет новый live-отчёт.

## Что можно подключать сейчас

1. Существующий одобренный ограниченный OSM-импорт POI остаётся без изменений. Это справочник мест, а не расписание событий.
2. Новый событийный модуль принимает локальный JSON-LD/HTML-файл от организатора при явно разрешённых хранении и показе. Синтетический fixture доказывает работу парсера, не выдаёт себя за реальную афишу.
3. По отдельной проверенной политике есть ограниченный HTTPS-загрузчик: точный allowlist URL, публичный IPv4 с DNS pinning, без redirect/cookie/auth, таймаут 8 секунд и предел 512 KB. По умолчанию сеть выключена. Нельзя передать публичному API произвольный URL для скачивания.

## Проверенные кандидаты и ограничения

| Источник | Наблюдение и решение |
|---|---|
| Sxodim | В [официальном соглашении](https://sxodim.com/polzovatelskoe-soglashenie) разрешено некоммерческое использование с указанием авторства и ссылками. На [афише Астаны](https://sxodim.com/astana) есть даты, время, цена/«от», площадка и адрес. Условия автоматизированной частоты/robots и конкретных фото не подтверждены; auto-fetch выключен. Если используем материалы на этом основании, обязательную подпись нельзя убрать в админку. Для коммерческого использования нужно отдельное согласование. |
| Ticketon | [Договор](https://ticketon.kz/en/cms/agreement) описывает покупку билетов, не даёт проверенного разрешения выгружать/переиздавать базу. Нет подтверждённого открытого API/фида для QETTYQ. Пока внешняя покупка по ссылке, затем партнёрский feed. |
| Kino.kz | [Договор](https://kino.kz/ru/profile/p/info/info) относится к билетным услугам. На [официальной поддержке](https://kino.kz/ru/profile/support) указан контакт сотрудничества sales@kino.kz. Нужен разрешённый feed сеансов, с языком аудио и субтитров отдельно. Название фильма на русском не доказывает язык сеанса. |
| Visit Astana | На [официальном сайте](https://visitastana.kz/) видны календарь и ссылки на билетные страницы; footer сохраняет все права. Не утверждаем наличие открытого лицензированного event API. Дата выставки без времени не превращается в сеанс в 19:00. Нужны разрешение/экспорт от владельца. |
| Astana Opera | Есть [официальная афиша](https://astanaopera.kz/) и [контакты](https://astanaopera.kz/en/contacts). Путь согласования feed/постеров: marketing@astanaopera.kz. Разрешение на копирование не получено. |
| Astana Ballet | Запрос страницы афиши истёк по таймауту. На [официальных контактах](https://astanaballet.com/en/pages/kontakty) указан PR/marketing promo@astanaballet.kz. Предложение: предоставленный организатором JSON-LD/ICS/CSV и права на постеры. |
| Threads | [Официальная коллекция Meta](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api) содержит авторизованный API и поиск постов. Доступ/permissions конкретного приложения не проверялся. Только официальный OAuth/API после проверки scopes/policy; не тихий парсинг браузера/личного аккаунта. Пост — кандидат на событие, не подтверждённое мероприятие. |

Реестр исследования: `data/event-source-candidates.json`. Существующий `data/source-registry.json` не изменён: никто не получил ложный статус approved.

## Что извлекается и где хранится

`src/server/ingestion/events.ts` возвращает внутренний `ImportedEvent`:

- Заголовок, только разрешённое описание, исходный внешний ID и стабильный внутренний ID.
- Явные `startsAt/endsAt` в UTC + `Asia/Almaty`; отдельный `localDate`, если известна только дата. Строки без timezone/невалидные календарные даты — quarantine.
- Название площадки, адрес и координаты только из источника; отсутствие координат не запускает незаявленный геокодер. Астана проверяется по locality/bounding box. Алматы не подставляется в пилот.
- Стоимость в целых минимальных единицах KZT, `exact/from/range/unknown`. Неизвестное не равно 0; единица цены не угадывается.
- Язык контента RU/KK/EN только из явного `inLanguage`; наличие мест отдельно `available/sold_out/unknown`; отмена/перенос отдельно от наличия мест.
- Ссылка покупки и официальный контакт организатора. WhatsApp не изобретается по чужому номеру: добавление номера/канала требует предоставленного организатором контактного поля и согласованного адаптера.
- `provenance`: source ID/name/URL, дата чтения, срок свежести, SHA-256 и версия парсера. Это серверная/административная информация.
- URL изображения хранится только как metadata. Публичный показ и разрешение скачивания отдельно зависят от явной политики и лицензии. Бинарный downloader в эту версию намеренно не добавлен.

`toPublicEvent(event)` убирает provenance, сырой poster URL и внутренние IDs источника. Оставляет потребительские факты, freshness, предупреждения, организатора, покупку и обязательную лицензионную подпись. Изображение без разрешения не попадает на клиент.

## API для архитектора

```ts
parseEventDocument(document, reviewedSourcePolicy, exactSourceUrl, { now, dataMode })
// => { records: ImportedEvent[], rejected: { index, reason }[], documentHash }

mergeEventSnapshots(previous, incoming)
// => { records, changes }; stable source/external-id upsert; старый snapshot не обнуляется

eventIsDiscoverable(event, now)
// excludes stale, past starts, cancelled, postponed, sold-out and synthetic fixtures
// NOT a guarantee of availability or a completed time/budget feasibility check

toPublicEvent(event)
// public DTO without raw admin provenance, with any mandatory credits
```

Новый модуль сам не подключён к публичным endpoints/схеме БД. Это делает оркестратор/A3 после проверки контракта. Существующие `src/data/events.ts`, `scripts/import-events.ts` и snapshot не изменены.

## Обновление, кэш и отсутствие блокировок

Предложение пилота, **не правило донора и не запущенный процесс**: одобренный календарь организатора раз в 6 часов; срочное изменение/отмена — webhook либо ручное обновление; цена/наличие мест уточняются на билетной странице. Чаще — только по договору и лимитам. Не надо опрашивать источники на каждый свайп или чат-сообщение.

Загрузчик проверяет `minimumRefreshMinutes` с `lastSuccessAt`, прекращает работу на 429 и не повторяет автоматически. Тем самым не игнорирует server throttling. Долговечный job scheduler, backoff/Retry-After queue, ETag/Last-Modified, сохраняемое расписание следующей попытки и мониторинг — **ещё не реализованы**. Это нельзя называть действующим ежечасным агентом.

CLI сериализует импорты через sidecar lock одного policy-файла, не перезаписывает существующий output, делает merge в **новый** snapshot и сохраняет историю смены расписания. Передача старого snapshot при повторном импорте обязательна для межзапускового upsert. Политики с одним source ID должны иметь один канонический файл; глобального распределённого lock нет.

Межпровайдерные похожие события не склеиваются автоматически: совпадения названия/площадки/даты требуют нормализации и модерации. Парсер обрабатывает JSON-LD Event/подтипы, @graph и ItemList; не исполняет JavaScript. Связи через отдельные `@id`-объекты и vendor-specific HTML требуют отдельного адаптера. Новостная `datePublished` не выдаётся за начало мероприятия; новости — discovery queue до проверки человеком/организатором.

## Проверки

Команды выполнялись 20.10.2026 с Node из bundled runtime в PATH:

```sh
node_modules/.bin/vitest run tests/unit/ingestion-pilot.test.ts
node_modules/.bin/tsc --noEmit --pretty false
node_modules/.bin/eslint src/server/ingestion scripts/import-events.mjs tests/unit/ingestion-pilot.test.ts
node --import tsx scripts/import-events.mjs --help
```

- Unit: **20 passed**, 1 test file, exit 0. Синтетические fixtures; реальной сети в тестах нет.
- Typecheck всего проекта: exit 0 на момент проверки.
- Поздний повтор общего typecheck на параллельно меняющейся ветке: exit 2 только из-за ещё отсутствующего `@/components/PilotApp` в `src/app/page.tsx`; передано оркестратору. Изолированный typecheck новых ingestion-файлов с `--ignoreConfig --types node`: exit 0. Первые изолированные попытки без этих флагов сообщали о CLI/config/ambient types, не о дефекте модуля.
- Targeted ESLint: exit 0.
- CLI: первый локальный fixture import 1 запись; повторный с `--previous` — по-прежнему 1 запись; попытка записать существующий output — ожидаемый exit 2 `INVALID_OUTPUT_ALREADY_EXISTS`. Ни одного внешнего HTTP-запроса. Временные snapshots созданы в отдельном `/tmp/qettyq-ingestion-*`, не в публичной базе.
- Начальная попытка запуска без bundled Node завершилась exit 127; после добавления runtime в PATH команды выполнены успешно. Не является ошибкой модуля.

Пример локального теста (новый выходной путь обязателен):

```sh
node --import tsx scripts/import-events.mjs \
  --input tests/fixtures/ingestion/owned-event.synthetic.json \
  --policy tests/fixtures/ingestion/owned-policy.synthetic.json \
  --source-url https://organizer.example/events/test \
  --output /tmp/qettyq-events-NEW.json --synthetic-test
```

Следующий проверяемый шаг: получить разрешённый organizer feed + условия фото, записать reviewed policy с точными URL и лимитами, выполнить один bounded live import и сверить 3–5 записей вручную. Затем подключить DTO к API и только после этого scheduler. Не создавать фейковую афишу ради заполнения экранов.
