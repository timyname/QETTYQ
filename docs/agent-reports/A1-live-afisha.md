# A1 · Live афиша Астаны

20 октября 2026. **Implemented + tested live; not a POI-only substitute.** Этот отчёт обновляет ранний `A1-event-ingestion.md`: источник событий теперь действительно получен по HTTP и подключён к API.

## Фактический результат

`GET http://127.0.0.1:3000/api/events` вернул HTTP 200, `dataMode=live`, `freshness=fresh`, `cacheStatus=refresh`, **7 будущих occurrences**; `fetchedAt=2026-10-20T11:06:43.870Z`. Первый локальный запрос занял около 4,6 секунды. Повторный запрос вернул `cacheStatus=hit`, ту же дату чтения и 7 записей без нового обновления.

Реальные записи: встреча с Канатом Нуровым 22 октября; лекция Дархана Жагипарова 23 октября; «Мама!» и «Өліара» 29 октября; Dizngo carnival 31 октября; «Комики решают проблемы» 7 ноября; IntroVert 13 декабря. Это подтверждённые JSON-LD даты источника в Астане, не придуманный календарь. Длительности, свободные места и языки там, где не указаны, остаются неизвестными.

Сохранённый настоящий снимок: `data/livedata/sxodim-astana-2026-10-20.json`, первый fetch 11:02:28.509Z. Он используется только как явно помеченный snapshot fallback, не как live при недоступном источнике.

## Основание и границы использования

Выбран [Sxodim · Астана](https://sxodim.com/astana). В [официальном соглашении](https://sxodim.com/polzovatelskoe-soglashenie) разрешено некоммерческое использование материалов с упоминанием автора и ссылкой. `robots.txt` фактически получен HTTP 200: общий User-agent, пустой Disallow. Это не лицензия само по себе, а дополнительная проверка технической политики.

Ограниченный фактологический импорт для некоммерческого пилота — наша узкая трактовка этого разрешения. Коммерческое использование/реклама/монетизация требуют отдельного согласования. Обязательный `requiredCredit={text:"Давай Сходим",url:<event page>}` сохраняется в каждом публичном объекте: скрыть его только в админке нельзя. Фотографии, сторонние тексты/отзывы и личные аккаунты не копируются; `image=null`. Это не партнёрство с издателем и не разрешённый билетный API.

При каждом реальном обновлении проверяются текущие robots и фраза-разрешение в публичных terms. Изменение политики закрывает импорт и показ до проверки; fallback не публикуется при таком отказе. Обычный сетевой отказ может показать последний сохранённый снимок с `freshness=stale`, никогда как live.

## Реализация

- `src/server/ingestion/sxodim-live.ts`: Worker-compatible adapter, только standard `fetch`, `Response`, streams, AbortController. Без Node DNS/TCP/fs, браузерной авторизации, private endpoints и исполнения JS.
- `src/server/ingestion/live-events.ts`: один in-flight refresh на isolate/process; module cache; Cloudflare `caches.default` при наличии; неизменённый dated fallback.
- `src/app/api/events/route.ts`: `GET /api/events?city=astana&date=YYYY-MM-DD&q=...`. Параметры фильтруют локально общий кэш, не создают отдельные запросы донору. Другой город/невалидная дата дают 400. URL для скачивания пользователь передать не может.
- `tests/unit/live-events.test.ts`: тесты адаптера, полей, failure/expiry, cache и API. Все внешние ответы в unit-тестах синтетические; live smoke выполнен отдельно.

Один refresh: robots + terms + index + **не более 8 последовательных detail pages**, максимум 11 subrequests. Каждая страница ограничена 512 KB и 8 секундами; redirect запрещён, MIME проверяется, изображения не загружаются. Сохраняются только нормализованные факты. Parser index используется для bounded same-origin discovery; время принимается только из `schema.org/Event` с явным UTC offset. Не выводим реальное время из заголовка/новостной даты/модели.

`maxAge=1 час`; обновление выполняется по следующему входящему запросу после истечения срока. При отсутствии трафика фоновый cron не работает. После ошибки действует часовой retry floor в данном isolate. Публичные ответы `no-store`; Cache API хранит last-good payload до суток для честного stale fallback, но `expiresAt` и возраст `fetchedAt` не позволяют выдавать его как live дольше часа.

Cloudflare Cache API локален дата-центру, module single-flight локален isolate. Это **не глобальная блокировка/квота** для всех cold starts и регионов. На production при росте трафика нужен один согласованный ingestion job/KV/Durable Object, а не более частые обращения. Свойства Cache API сверены с [официальной документацией Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/cache/).

## Достоверность полей

- Индекс: 25 candidates; запрошено 8 detail pages; 7 будущих записей, одна прошлой датой исключена. Покрытие ограничено первой пачкой, не всей афишей города.
- Один явно бесплатный event: ноль только из блока «Бесплатно», не из отсутствующей цены.
- У двух спектаклей индекс содержит «от 3000», а JSON-LD — 5000. Противоречие даёт `price.kind=unknown`, `priceFromKzt=null`, `priceQuality=conflicting`, `PRICE_CONFLICT`, а не гарантию одной из цен.
- «От» остаётся `from`; покупательские сборы могут добавляться. Стоимость на человека/группу не угадывается (`basis=unknown`).
- Все 7 проверенных страниц не содержат координат: `lat=null, lon=null`. **Не рисовать фиктивные маркеры.** Live лента и notice «адрес есть, координаты не подтверждены» допустимы; дальнейшее разрешённое геокодирование — отдельная работа.
- Язык — только явное `inLanguage`; казахское название не доказывает язык спектакля.
- `availability=unknown`; существующая билетная ссылка не означает свободные места и не является бронью.
- Детальные источники/диагностика могут жить в админке, но минимальный обязательный credit, ticket link и notice остаются публичными.

## Проверки

Фактически выполнены:

```sh
node_modules/.bin/vitest run tests/unit/live-events.test.ts tests/unit/ingestion-pilot.test.ts
node_modules/.bin/tsc --noEmit --pretty false
node_modules/.bin/eslint src/server/ingestion/sxodim-live.ts src/server/ingestion/live-events.ts src/app/api/events/route.ts tests/unit/live-events.test.ts
```

Итоговый запуск: **44 теста PASS (24 live + 20 generic)**, exit 0; project tsc — PASS; targeted ESLint — PASS. Покрыты fail-closed при изменении разрешения и обязательный `from` для fallback из `data-minprice`, даже без слова «от». JSON-LD Offer.price=9900 для встречи Нурова дополнительно прочитан из настоящей страницы: это известная опубликованная цена, но не общий бюджет/per-person total. Отдельно HTTP smoke живого API и повторного cache hit — PASS, как описано выше.

Ограничения: ещё не проверен actual deployed Worker fetch; root должен повторить `GET /api/events` на публичном URL и сверить `dataMode/fetchedAt`, а не считать локальный smoke доказательством хостинга. UI интеграция и публичный deploy принадлежат оркестратору. Остальные источники (Ticketon/Kino.kz/организаторы) не объявляются подключёнными.
