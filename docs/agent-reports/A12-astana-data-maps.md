# A12: источники данных Астаны и интеграция карт

Дата проверки: 19 октября 2026 года. Проверены официальные документы и страницы, доступные на эту дату. API-вызовы Google, eGov и сайтов площадок не выполнялись. Ключи не запрашивались, не читались и не создавались.

## Краткий вывод

Google Maps Platform нельзя считать подключённым к QETTYQ. Для production-режима Maps JavaScript API, Routes API и Places API нужны настроенный Google Cloud project, billing и ограниченные credentials. Текущий репозиторий содержит только общие переменные `MAP_PROVIDER` и `ROUTING_PROVIDER`; специальных Google credentials и map/routing-адаптера в `src` нет.

Без ключа сегодня можно сохранить честный рабочий режим:

1. Использовать существующий OSM snapshot как базу POI.
2. Показывать расстояние по прямой и приблизительное время только как `estimated`.
3. Открывать внешний маршрут через Google Maps URLs, которым не нужен API key.
4. Не рисовать route geometry и не подтверждать строгий ETA внутри QETTYQ.

Для встроенной Google-карты и рассчитанного walking route нужны действия владельца Google Cloud аккаунта. Для автоматического импорта событий с официальных сайтов Астаны нужны документированный feed/API либо письменное разрешение владельца источника.

## Фактический статус репозитория

| Область | Статус | Доказательство |
|---|---|---|
| POI | `snapshot` | В `data/source-registry.json` зарегистрирован `osm-overpass-poi`; текущая документация проекта указывает 80 записей |
| Встроенная карта | Не реализована | Нет map-компонента или Google Maps credential в конфигурации |
| Маршрут | `estimated` | Приложение использует расстояние по прямой и не заявляет route geometry |
| Google Maps JS | Не подключён | API не включался и browser key не настраивался в рамках исследования |
| Google Routes API | Не подключён | Запрос `computeRoutes` не выполнялся |
| Google Places API | Не подключён | Places results не используются как база QETTYQ |
| События | Не подключены | Официальные страницы найдены, но документированный machine feed и разрешение автоматического импорта не подтверждены |

## Google Maps Platform

### Maps JavaScript API

[Официальная инструкция Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/get-api-key) указывает два режима:

- Maps Demo Key предназначен только для тестирования и прототипирования отдельных функций без billing. Google прямо не позиционирует его как production credential.
- Стандартный production key требует Google Cloud project, включённый Maps JavaScript API и billing.

Browser key неизбежно виден в загружаемом клиентском коде. Его безопасность строится не на сокрытии строки, а на ограничениях:

- application restriction типа **Websites / HTTP referrers** только для точных production, staging и localhost-origin;
- API restriction только на **Maps JavaScript API** и действительно используемые JS-сервисы;
- отдельный key для browser map, не общий с Routes/Places web services;
- контроль usage и удаление неиспользуемых credentials.

Google описывает эти меры в [API security best practices](https://developers.google.com/maps/api-security-best-practices). Публичный browser key нельзя использовать для server-to-server Routes или Places запросов.

### Routes API

[Официальная настройка Routes API](https://developers.google.com/maps/documentation/routes/get-api-key) требует account/billing, включённый API и API key либо OAuth. Каждый запрос должен быть аутентифицирован и выполняться по HTTPS.

Для QETTYQ безопасная граница выглядит так:

- браузер отправляет origin/destination и выбранный режим в собственный backend QETTYQ;
- backend проверяет город, диапазоны координат, rate limit и размер запроса;
- backend вызывает Routes API с серверным credential;
- key хранится вне Git и вне клиентского bundle;
- key ограничен Routes API и, если инфраструктура имеет стабильный egress, IP-адресами сервера;
- наружу возвращаются только нужные поля, режим `walk`, provenance, качество и warnings.

Для сервера Google рекомендует защищать web-service keys и по возможности использовать OAuth там, где сервис это поддерживает. Нельзя отправлять server key в `NEXT_PUBLIC_*`, HTML, клиентский JavaScript, API response, логи, видео или screenshots.

[Политика Routes API](https://developers.google.com/maps/documentation/routes/policies) требует публичные Terms of Use и Privacy Policy, корректную атрибуцию и соблюдение ограничений хранения. Если Routes content показан не на Google Map, рядом нужна атрибуция Google Maps. Routes content нельзя совмещать с non-Google map как будто это один картографический продукт. Большинство content нельзя сохранять произвольно; place ID является отдельно разрешённым исключением.

### Places API (New)

Places API полезен для поиска, autocomplete и деталей места, но его нельзя использовать как свободно копируемую постоянную базу QETTYQ.

[Политика Places API](https://developers.google.com/maps/documentation/places/web-service/policies) требует:

- публичные Terms of Use и Privacy Policy со ссылками на условия и privacy Google;
- не prefetch, не массовое кеширование и не постоянное хранение Places content за пределами разрешённых исключений;
- `place_id` можно хранить без ограничения по сроку, но остальные поля подчиняются caching restrictions;
- Places results на карте показываются на Google Map;
- при показе Places content без карты нужна атрибуция Google Maps;
- photo/review/details должны сохранять авторские и сторонние attributions, которые вернул API.

[Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) отдельно указывают, что Places и Routes content нельзя использовать вместе с non-Google map; latitude/longitude из этих сервисов допускается временно кешировать до 30 дней, а place ID регулируется отдельной policy.

[Places API billing guide](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) рекомендует использовать FieldMask для Place Details, Nearby Search и Text Search. Это одновременно минимизирует передаваемые данные и определяет задействованный SKU. Цены и бесплатные лимиты меняются, поэтому в проекте не следует фиксировать сумму по памяти; перед включением нужно сверить [актуальную pricing table](https://developers.google.com/maps/billing-and-pricing/pricing).

### Billing, quotas и защита от расходов

Google Maps Platform использует pay-as-you-go SKUs. [Cost management guide](https://developers.google.com/maps/billing-and-pricing/manage-costs) различает:

- budgets и alerts, которые уведомляют, но **не останавливают** расходы;
- API quotas, которые могут ограничить число запросов;
- Cloud Billing dashboard, который остаётся источником фактических начислений, но может обновляться с задержкой.

Минимальная конфигурация для QETTYQ:

1. Отдельный Google Cloud project для QETTYQ.
2. Только Maps JavaScript API, Routes API и Places API (New), если каждый действительно используется.
3. Раздельные browser и server credentials.
4. Низкие quotas для pilot, alerts на нескольких порогах и прикладной `SPEND_CAP`.
5. Rate limits и request deduplication на backend.
6. FieldMask только для полей, показанных пользователю.
7. Usage monitoring по credential ID и немедленное расследование неожиданного трафика.

Budget alert нельзя описывать как hard cap. Жёсткий предел достигается API quotas и прикладным отключением провайдера при достижении согласованного лимита.

### Локация и privacy

[Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms) требуют заранее объяснить пользователю, какие location data собираются и как они объединяются с другими источниками. Получение или кеширование локации требует предварительного, явного и отзываемого согласия.

Для QETTYQ это означает:

- не запускать геолокацию при первом открытии страницы;
- ручной выбор точки остаётся равноправным;
- не включать точные координаты в URL, аналитику и публичные логи;
- не отправлять Places/Routes больше location context, чем нужно для расчёта;
- добавить Google terms/privacy disclosures до публичного запуска интеграции.

## Keyless fallback

### Рекомендуемый режим на сегодня

1. Оставить текущую базу OSM snapshot с provenance и датой получения.
2. Показывать список/план без встроенной route geometry.
3. Рассчитывать Haversine distance только как прямое расстояние. Приблизительное время всегда помечать `estimated` и переводить строгую feasibility в `uncertain`, если она зависит от реальной дорожной сети.
4. Добавить «Открыть маршрут» через [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started). Для Maps URLs API key не нужен; URL может открыть search или directions в приложении Google Maps либо браузере.
5. Не считывать обратно ETA или route geometry из внешнего Google Maps окна и не выдавать факт открытия ссылки за посещение.

Это даёт пользователю навигацию без Google Cloud credential, но не закрывает P0-критерий проверенного маршрута внутри сервиса.

### Встроенная keyless-карта на OSM

Технически можно отобразить OSM raster tiles через MapLibre GL JS или Leaflet. Для маленького локального демо разрешён обычный интерактивный просмотр standard tiles при соблюдении [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/):

- видимая атрибуция `© OpenStreetMap contributors` со ссылкой на лицензию;
- корректный URL tiles, Referer и кеширование по HTTP headers;
- никакого bulk download, offline pack или headless prefetch;
- отсутствие SLA, возможность блокировки и обязательная возможность быстро сменить provider.

OSMF прямо отмечает, что open data не означает бесплатный безлимитный tile backend. Для публичного production нужен подходящий OSM-derived provider либо self-hosted tiles с проверенными условиями. Лицензия исходных OSM data описана на [официальной copyright page](https://www.openstreetmap.org/copyright): ODbL и обязательная атрибуция.

Важное ограничение: Google Places/Routes content нельзя накладывать на OSM map. Если выбран OSM fallback, карточки и route geometry должны происходить из OSM/другого совместимого источника, а Google можно оставить только внешней Maps URL ссылкой.

## Официальные источники Астаны

Наличие публичной страницы подтверждает источник факта, но не даёт автоматическое разрешение на регулярный scraping, хранение, перепубликацию, отправку в LLM или использование фотографий. Пока нет документированного API/feed либо письменного разрешения, статус источника для ingestion должен оставаться `candidate` или `link_only`.

| Источник | Что подтверждено | Потенциальные поля | API/права автоматизации | Рекомендуемый статус |
|---|---|---|---|---|
| [Visit Astana: события](https://visitastana.kz/ru/) | На официальном туристическом портале есть актуальный календарь с названиями и датами | Название, период, venue, ticket link, карточка | Публичный documented API/feed и условия массового хранения не найдены | `link_only`, запросить feed/разрешение |
| [Visit Astana: достопримечательности](https://visitastana.kz/ru/about-city/what-to-see/) | Карточки POI содержат адреса, описания, иногда часы и контакты | POI, адрес, часы, контакты, официальный URL | Автоматическое копирование текста и медиа не разрешено самим фактом публикации | `link_only`; использовать для ручной верификации |
| [Visit Astana: интерактивная карта](https://visitastana.kz/ru/map/) | Портал публикует маршруты и POI-карточки | План визита, адреса, часы, транспорт | Не подтверждён экспортируемый dataset/API | `candidate`, связаться с оператором |
| [Астана Опера: афиша](https://astanaopera.kz/ru/afisha) | Официальная афиша даёт конкретные постановки; страницы содержат дату, время, зал, длительность и age rating | EventOccurrence, venue, duration, age rating, source URL | Public API/feed и разрешение на автоматический импорт не найдены | `link_only`, запросить официальный feed |
| [Астана Балет](https://www.astanaballet.com/ru) | Официальный сайт театра публикует постановки, новости, адрес и контакты | EventOccurrence, venue, contact, source URL | Public API/feed и права автоматизации не подтверждены | `link_only`, запросить разрешение |
| [Управление культуры Астаны](https://www.gov.kz/org/astana-madeniet?lang=ru) | Официальный госорган публикует новости, календарь и анонсы | Разовые городские события, organizer, venue, date | Это пресс-центр, не гарантированно полный event feed | `link_only`, использовать как подтверждающий источник |
| [eGov dataset №729](https://data.egov.kz/datasets/view?index=madeniet_uiymdary) | Официальный dataset учреждений культуры Астаны; страница указывает ежегодное обновление и обновление 03.07.2026 | Название, адрес, телефон, сайт, владелец | API портала требует developer API key; конкретные license/redistribution условия набора нужно подтвердить | `candidate`, получить ключ и проверить правила набора |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Открытая POI/географическая база, уже используется в проекте | Название, координаты, категории, часть адресов | ODbL разрешает reuse с атрибуцией и share-alike obligations | `approved_for_scope` для текущего bounded snapshot |

[Официальное сообщение акимата о Visit Astana](https://www.gov.kz/memleket/entities/astana/press/news/details/373798?lang=ru) описывало портал как платформу культурно-развлекательных услуг и предлагало организациям обращаться для интеграции. Это подтверждает разумный путь: запросить у оператора партнёрский feed или разрешение, а не reverse-engineer внутренние endpoints.

### eGov API

[Официальная страница API Open Data Kazakhstan](https://data.egov.kz/proxy/aisoip?apiKey=yourApiKey) сообщает, что доступ к наборам через API требует developer API key из кабинета разработчика. Такой key не нужно отправлять в чат или Git. Если владелец выберет этот источник, credential следует передать через доверенный secret setup, после чего проверить:

- актуальную версию dataset;
- полный schema и наличие стабильных IDs;
- license/redistribution и attribution для конкретного набора;
- лимиты, pagination и условия хранения;
- фактическую полноту Астаны и качество адресов/координат.

Набор №729 годится как дополнительный официальный справочник учреждений культуры, но не заменяет POI-каталог, события или расписания.

## Что можно реализовать сегодня без ключа

- Сохранить OSM snapshot как фактическую POI-базу и явно показывать дату данных.
- Добавить keyless Google Maps URL для открытия внешнего пешего маршрута.
- Отобразить OSM map для локального малонагруженного демо при соблюдении tile policy и атрибуции.
- Сохранить текущий Haversine fallback без route line, со статусом `estimated`.
- Добавить `/sources` со ссылками на Visit Astana, Астана Опера, Астана Балет, Управление культуры и eGov dataset.
- Создать source registry записи `candidate`/`link_only`, не запуская scraping.
- Сформировать запрос оператору Visit Astana и театрам на официальный feed, условия хранения, LLM use и медиа.

Это не даёт права говорить, что Google Maps, Routes, Places или события уже интегрированы.

## Что требует действий владельца аккаунта

### Google Cloud

1. Выбрать или создать отдельный Google Cloud project QETTYQ.
2. Подключить billing и подтвердить допустимый месячный/пилотный бюджет.
3. Включить только реально нужные APIs: Maps JavaScript API, Routes API, при необходимости Places API (New).
4. Создать отдельный browser key и server credential.
5. Ограничить browser key по HTTP referrers и Maps JavaScript API.
6. Ограничить server key по Routes/Places API и IP, либо выбрать OAuth для server-to-server там, где это поддерживается.
7. Настроить quotas, usage alerts, billing alerts и прикладной spend cap. Помнить, что budget alerts не являются hard cap.
8. Передать credentials только через доверенный secret setup. Не вставлять ключи в чат, issue, README или screenshot.
9. Утвердить production/staging domains для referrer restrictions.
10. Принять Terms, подготовить публичные Terms/Privacy и согласие на геолокацию.

### Источники Астаны

1. Получить eGov developer key, если решено использовать официальный dataset через API.
2. Запросить у Visit Astana официальный feed/API либо письменное разрешение на ограниченный импорт.
3. Запросить у Астана Опера и Астана Балет расписание в machine-readable формате и условия обновления.
4. Получить отдельное разрешение на хранение и показ фотографий; URL страницы события не даёт права копировать media.
5. Утвердить production OSM tile provider или self-hosting, если встроенная карта остаётся не-Google.

## Рекомендуемая последовательность

1. Сегодня: OSM snapshot + estimated distance + Google Maps URL.
2. Затем: официальный data.egov POI supplement после получения developer key и проверки license.
3. Параллельно: договориться о feed с Visit Astana или отдельной площадкой.
4. После согласования бюджета: Routes API server adapter с walking profile, quota и fallback.
5. Places API добавлять только для конкретного доказанного use case. Не использовать его как постоянную копию городской базы.

## Непроверенное и запрещённые утверждения

- Не проверялась работа Google APIs с аккаунтом владельца.
- Не проверялись цены конкретного SKU, фактические free usage thresholds и доступные credits аккаунта.
- Не получены API keys, OAuth credentials или billing permissions.
- Не найден официальный открытый events API Visit Astana, Астана Опера или Астана Балет.
- Не подтверждены права на автоматический scraping или хранение фотографий этих сайтов.
- Нельзя писать «Google Maps подключён», «маршруты точные», «события live» или «есть партнёрство».

