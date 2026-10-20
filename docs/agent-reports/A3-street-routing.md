# A3: пешеходный путь по улицам

20 октября 2026. Scope: MapCanvas, RoutePlan, новый серверный adapter, `/api/routing` и их собственные тесты. PilotApp, общий контракт плана, package/config, биллинг и deployment не изменялись.

## Провайдеры и условия

- Google Routes не используем поверх MapLibre: [официальная политика](https://developers.google.com/maps/documentation/routes/policies) требует показывать маршрутные результаты на Google Map. Внешняя ссылка на Google Maps остаётся отдельным пользовательским переходом.
- Для пилота выбран выделенный **FOSSGIS OSRM Foot**, а не автомобильный OSRM. [Официальная конфигурация frontend](https://github.com/fossgis-routing-server/osrm-frontend/blob/master/src/leaflet_options.js) явно сопоставляет Foot с `/routed-foot/route/v1`. [Оператор](https://routing.openstreetmap.de/about.html) подтверждает всемирный пешеходный профиль. Используется `/routed-foot/route/v1/foot/…`.
- Краткая [политика оператора](https://routing.openstreetmap.de/about.html): атрибуция, ссылка «исправить карту», идентифицирующий User-Agent, максимум один запрос в секунду, без scraping/heavy usage. Оператор сообщает о журналировании запросов. Полная немецкая страница условий ответила Anubis Access Denied. Обхода не выполняли. Это не заключение о разрешённости коммерческого массового использования и не обещание SLA. Перед коммерческим масштабированием нужна полная проверка условий или собственный сервер.
- [Valhalla](https://valhalla.github.io/valhalla/valhalla-intro/) имеет публичное FOSSGIS demo. Официальный README просит уведомить проект через GitHub Discussions перед публикацией приложения и указать X-Client-Id. Никакое сообщение не отправлялось. Адаптер использует `pedestrian`, не `auto`. Публичное включение этого demo отдельно закрыто до проверки условий.
- Подготовлен ORS-адаптер `foot-walking/geojson`, только серверный ключ `OPENROUTESERVICE_API_KEY`. [Официальное объявление миграции](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912) перенесло API на `api.heigit.org/openrouteservice`; старый хост не используется. [FAQ](https://giscience.github.io/openrouteservice/frequently-asked-questions.html) описывает стандартный пример 2 000 directions в сутки и 40 в скользящую минуту. Фактическую квоту нужно смотреть в своём аккаунте. [Формат GeoJSON](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types) даёт метры, секунды и отдельные сегменты. Ключ не получали, запросы ORS не выполняли.

## Контракт

`GET /api/routing` возвращает безопасный status: available, provider, label, reason, localDemo. Координат и ключей в нём нет.

`POST /api/routing`:

```json
{"points":[{"lat":51.1282,"lon":71.4304},{"lat":51.133,"lon":71.428}],"provider":"fossgis_foot","consent":true}
```

Разрешены 2–8 конечных числовых точек внутри ограниченной зоны Астаны. Требуются сессия, same-origin и буквальное `consent:true`, привязанное к текущему провайдеру. Никакого endpoint URL от клиента.

Успех: `{route:StreetRoute,dataMode:'live'}`. StreetRoute содержит `quality:'street'`, `profile:'foot'`, provider, fetchedAt, GeoJSON LineString, distanceMeters, durationSeconds, legs с теми же единицами, атрибуцию и предупреждения. Отказ: `{route:null,error:<safe-code>}` с HTTP 400/401/429/503. Никакой линии-заглушки, нулевых замен неизвестных данных или автоматического переключения провайдера.

Для Sites экспортирован:

```ts
handleRouting(request: Request, options?: {
  reserve?: (sessionId: string) => Promise<boolean>;
  publicEnabled?: boolean;
  env?: Record<string, string | undefined>;
}): Promise<Response>
```

Он обслуживает GET и POST. Публичный env-флаг без внедрённой функции reserve не открывает маршрутизацию. Отказ/ошибка reservation блокирует внешний вызов. Общий D1 limiter и Sites wrapper реализует оркестратор, не этот агент. Локальный adapter дополнительно ограничивает процесс одним одновременным запросом и паузой 5 секунд. Эта защита не выдаётся за распределённый лимитер. Публичная доступность должна проверяться после связывания D1 и deployment, а не только по наличию файлов.

## UI и карта

- Сохранили ivory/jade/lime glass и существующую типографику. Отдельный компактный блок в прокручиваемом листе маршрута объясняет получателя координат и возможные технические журналы. Чекбокс по умолчанию выключен. Только затем активируется «Рассчитать путь по улицам».
- Координаты передаются лишь после клика. Изменение точек сбрасывает согласие и скрывает устаревшую геометрию. Дата/время меняют временную шкалу без повторного запроса маршрута. Автообновления, polling и автоматических provider retries нет.
- Один HTTP 401 может открыть новую эфемерную сессию и повторить запрос с тем же явным согласием. Первый 401 отсекается до provider traffic. 429/503/timeout не повторяются автоматически.
- Геометрия рисуется только из проверенного ответа маршрутизатора: jade 5 px с ivory halo 9 px. Слой лежит под подписями карты. Camera fit учитывает лист маршрута. Нет нарисованного пунктиром «дорожного» Haversine-пути.
- `MapCanvas` принимает optional `routeGeometry?:LineString|null` и `routeAttribution?:{text,url}|null`. Старые вызовы совместимы. При Leaflet fallback линия не имитируется, показано ограничение. Атрибуция провайдера и OSM, а также ссылка исправления карты остаются видимыми.
- Шкала времени использует секунды каждого дорожного сегмента. Расстояние и дорожное время показываются отдельно от приближений по прямой. Время посещений и запас остаются проектной оценкой. Стоимость и наличие мест не становятся известными от расчёта дороги.
- Внутренняя дорожная геометрия и согласие живут только в состоянии этого экрана. В БД/браузерное постоянное хранилище этот adapter их не пишет. Публичная ссылка общего плана не получает GPS от этого компонента. Внешняя навигация имеет отдельное пояснение передачи старта.
- Убраны non-null assertions для MapCanvas host в callback. Queued resize/render/load проверяют disposed/failed, подключённость контейнера и актуальность instance до работы. Это устраняет наблюдавшийся путь `null.getBoundingClientRect` при уходе с экрана.

## Реальный smoke, без пользовательского GPS

Выполнен **один** реальный вызов adapter к опубликованному `/routed-foot/route/v1/foot/` на двух общедоступных тестовых точках Астаны. Без ключа, биллинга или обхода ограничений. Результат: success, provider fossgis_foot, profile foot, **708.5 м, 567.2 с, 58 вершин**, один сегмент. Исходный ответ/координаты человека не сохранялись. Это свидетельство одного успешного ответа, не гарантия доступности всех маршрутов.

## Проверки

- `vitest run tests/unit/street-routing.test.ts tests/unit/routing-api.test.ts`: **19 PASS**. Все provider responses в этих unit-тестах синтетические. Проверены city/range/finite limits, профиль, геометрия, суммы/единицы сегментов, consent, CSRF, auth, missing key, public gate без hook, reservation denial/error, timeout, rate limiting и отсутствие автоматического fallback.
- `tsc --noEmit`: PASS после API/компонентов и 401 recovery.
- Scoped ESLint новых/изменённых TSX/TS и тестов: PASS.
- `PORT=3000 playwright test tests/e2e/street-routing.spec.ts tests/e2e/map-route-budget.spec.ts --workers=1`: **4 PASS**. E2E проверил explicit consent, один 401 recovery, метрики fixture-ответа, готовую MapLibre canvas/route state, очистку линии, отсутствие автоматического повтора при provider failure, уход с карты/resize без `getBoundingClientRect` pageerror, регрессию бюджета и времени Астаны.
- Street E2E использует **synthetic_test geometry**, а не внешний реальный маршрут. Его успех нельзя выдавать за live street-routing smoke; реальный единичный adapter smoke описан выше отдельно.
- Финальный отдельный прогон street E2E: **2 PASS, 4.9 s**. Сохранены и визуально просмотрены `exports/screenshots/routing-synthetic/foot-{360,390,430}.png` при высоте 932 px. Переполнения по ширине нет, CTA выше нижней навигации, атрибуция видна. На изображениях явно указан synthetic_test; их нельзя использовать как снимки реальной дорожной выдачи или конкурсные доказательства маршрута.

Полная новая сборка, весь E2E-suite, реальные публичные вызовы через D1 и production cleanup требуют проверки интегратором. Никакой push/deploy не выполнялся этим агентом.

### Совместимость Sites / Cloudflare

По выявленным интегратором конфликтам глобальных DOM/Response типов исправлены только общие `MapCanvas.tsx` и `RoutePlan.tsx`: три `append` заменены стандартным `appendChild`; результаты `Response.json()` считаются `unknown` и проходят явные runtime type guards до записи в состояние. Проверяются поля status, допустимый провайдер, геометрия, единицы/сегменты, дата и разрешённый HTTPS attribution URL. `any`, подавление диагностик и отключение проверок не добавлены. Общий Next typecheck и scoped lint после изменения PASS. Проверку `tsc` в Sites checkout и финальную синхронизацию выполняет оркестратор.

### Публичный provider failure и безопасная диагностика, 21:44

Оркестратор сообщил о публикации нового UI и существующих D1-таблицах. Публичный GET routing сообщает available, но фактический POST из Cloudflare возвращает 503 `ROUTING_PROVIDER_UNAVAILABLE`. Поэтому публичный путь по улицам **не считается работающим**, несмотря на предыдущий успешный локальный smoke. Возможная блокировка адресов Cloudflare пока лишь гипотеза, причина не установлена.

В adapter добавлен только безопасный `providerHttpStatus` при полученном HTTP response. API передаёт число либо `null`, если HTTP response не получен. Координаты, URL запроса, заголовки ключа, response body и challenge content не возвращаются. Добавлен корректный Referer опубликованной страницы и честная идентификация QETTYQ в User-Agent. Для GET Foot убран ненужный Content-Type, X-Client-Id оставлен только Valhalla. Это обычное соблюдение политики, без имитации браузера, смены IP, обхода 403/Anubis, retry или переключения провайдера.

`vitest` после изменения: **21 PASS** на двух routing unit-файлах, scoped lint и общий typecheck PASS. Все ответы провайдера в этих тестах mocked. Агент не выполнял новых внешних или production HTTP запросов. Оркестратор выполнит один контролируемый запрос после deployment. Если подтвердится отказ публичного сервера, следующий вариант — собственный сервер или ORS с собственным разрешённым ключом, а не обход блокировки.

### Причина pre-response отказа найдена: Worker redirect mode

Read-only осмотр фактического `dist/server/wrangler.json` показал compatibility date `2026-05-15` и `nodejs_compat`. Поэтому `cache:'no-store'` поддерживается: [Cloudflare включает его по умолчанию с 11.11.2024](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-cache-no-store-http-standard-api). AbortController/signal и обычные идентифицирующие заголовки также допустимы.

Конкретная несовместимость — `redirect:'error'`. [Официальная документация Request](https://developers.cloudflare.com/workers/runtime-apis/request/) прямо сообщает, что Workers не реализует этот режим и выбрасывает TypeError при конструировании Request ещё до сети. Это отличается от Node fetch.

Подтверждено установленным **Miniflare 4.20260515.0 / workerd**, с теми же compatibility date/flag. Локальная Worker-функция только конструировала `Request('https://example.invalid/')`; никаких внешних fetch не выполняла. Результаты:

- `redirect:'error'`: constructor TypeError, `Invalid redirect value, must be one of "follow" or "manual"`.
- `redirect:'manual'`: Request успешно создан вместе с `cache:'no-store'`, AbortSignal, User-Agent и Referer.

После отдельного разрешения оркестратора изменён только routing adapter: используется `manual`, а существующая проверка `!response.ok` отклоняет любой 3xx. Location не читается и не используется, повторного fetch нет. Новый unit-test проверяет 302 и ровно один вызов с manual. Это исправление совместимости runtime, а не обход отказа провайдера. Причина локально воспроизведена, но успешный публичный HTTP маршрут всё ещё требует одного контролируемого smoke после следующего deployment оркестратором.

После исправления redirect: **22 routing unit PASS**, общий `tsc --noEmit` PASS, scoped ESLint PASS. Внешний routing не вызывался.

## Данные и собственный hosting

Код adapter может находиться в репозитории. Массовое скачивание маршрутов/тайлов публичного demo для хранения в Git не выполнялось. Для собственного маршрутизатора подходят OSS Valhalla или OSRM с **пешеходным** профилем и региональным OSM extract. Это отдельный сервер/процесс построения графа и обновлений, не браузерный пакет. Данные OSM требуют ODbL-атрибуции и проверки обязанностей при распространении базы. Лицензию своего кода нельзя автоматически распространить на сторонний граф данных.
