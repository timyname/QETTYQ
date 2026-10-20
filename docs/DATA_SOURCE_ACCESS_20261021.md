# QETTYQ: источники данных, права и доступ

Проверено **21 октября 2026**. Пилот — Астана; Алматы требует отдельного набора данных и проверки разрешений.

Это читаемый реестр фактического состояния и кандидатов, а не объявление новых интеграций или юридическое заключение. Публичный сайт: [qettyqapp.anamai.kz](https://qettyqapp.anamai.kz). Письма для согласования — в [SOURCE_OUTREACH_20261021.md](SOURCE_OUTREACH_20261021.md).

## Коротко

Сейчас собственная база мест и афиша — разные вещи. После отдельно разрешённого импорта в локальных файлах проекта **749 OSM-мест, 265 записей с исходным opening_hours, 222 с cuisine, 29 517 адресных точек/центров зданий, 7 событий в датированном fallback от 20 октября, 0 одобренных афиш организаторов**. Все прежние 80 ID мест сохранены и обновлены по новому extract. Это проверка локальных файлов, не новый замер production или живого источника. Данные OSM — до **19 октября 2026, 20:21:11 UTC**, не «онлайн-часы сегодня».

Работает ограниченный Sxodim-адаптер; OSM-каталог — снимок; карта и маршрутизатор — отдельные сервисы. Нельзя выдавать весь этот набор за подключённые Ticketon, Kino.kz, 2ГИС или полную ежедневную афишу города.

Три наиболее готовых адресата для запроса разрешения: **Sxodim, Национальный музей РК, Astana Ballet**. Ticketon нужен для широкого билетного покрытия, но прямое чтение сейчас отвечает 403. Visit Astana требует дополнительной проверки: текущая страница партнёрства дала посторонний контент.

## Как читать статусы

- **Подключено ограниченно** — соответствующий адаптер существует, с указанным scope. Это не гарантия успешного запроса сейчас.
- **Снимок** — сохранённые сведения с исходной датой, не онлайн-расписание.
- **Подготовлен адаптер** — есть код; текущие ключ, лимит, включение и успешный запрос этим исследованием не проверены.
- **Кандидат** — источник полезен, но feed, доступ или права не согласованы. «Публичная страница» не означает открытую лицензию.
- **Приостановить до проверки** — наблюдались отказ, несогласованность или подозрительный контент; импорт не включать.

## Все используемые и рассматриваемые источники

| Источник | Для чего | Реальное состояние | Что нужно до расширения |
|---|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright), локальный Geofabrik-снимок | Названия, координаты, категории, адрес, кухня и часы при наличии | 749 POI, 265 исходных opening_hours, отдельный индекс 29 517 адресов; все 80 прежних ID обновлены | ODbL, атрибуция, дата исходного extract; часы/адрес не дополнять догадкой, centroid не считать входом |
| [Sxodim / Астана](https://sxodim.com/astana) | Датированные мероприятия, ссылка на подробности/запись | Подключён ограниченный некоммерческий адаптер; в bundled fallback 7 occurrences | Видимый credit и ссылка; согласовать квоту, коммерческий scope, фотографии и расширенное использование |
| [OpenFreeMap](https://openfreemap.org/) / OpenMapTiles | Подложка интерактивной карты | Используется в интерфейсе; не источник событий | Сохранять обязательную атрибуцию; не считать геометрию подтверждением события |
| [FOSSGIS / OSRM Foot](https://routing.openstreetmap.de/about.html) | Пеший путь по улицам | Код и consent-flow имеются; новый реальный запрос здесь не делался | Только явное согласие на передачу точек, соблюдение правил сервиса; оценка по прямой не дорога |
| [Google Places](https://developers.google.com/maps/documentation/places/web-service/policies) | Отдельный поиск заведений/часов | Адаптер подготовлен; activation/key/production success не проверялись | Ключ, доступный бюджет, отдельный consent; no-store и отдельная атрибуция; не переносить результаты на OSM как открытые данные |
| [Ticketon](https://ticketon.kz/astana) | Билетные события и киносеансы | Не подключён; 21 октября direct reader получил 403 | Официальный партнёрский feed/API, права на поля и медиа, отмены/цены/языки, разрешённая частота |
| [Kino.kz](https://kino.kz/) / [партнёры](https://partners.kino.kz/) | Киносеансы | Не подключён. Предыдущее исследование подтвердило партнёрский вход, но не лицензию на export | Сеанс: кинотеатр/зал, начало, язык звука/субтитров, цена и booking URL. Локаль сайта не язык фильма |
| [Национальный музей РК](https://nmrk.kz/ru/) | Выставки, часы здания, исключения, экскурсии | Официальная главная прочитана; кандидат на согласованный feed | Разделить период выставки, часы здания и конкретную экскурсию; согласовать поля/фото/обновления |
| [Astana Ballet](https://astanaballet.com/ru/posters) | Спектакли и повторные показы | Контакты доступны, афиша ответила 500; адаптера нет | Надёжный CSV/JSON/ICS или согласованный HTML, год/часовой пояс/язык/стоимость, фото-права |
| [Astana Opera](https://astanaopera.kz/) | Опера, балет, концерты | Кандидат; прежнее исследование обнаружило несогласованность direct/indexed page | Официальный feed и разрешение; не импортировать устаревшие поисковые snippets как живые сеансы |
| [Visit Astana](https://visitastana.kz/ru/partnership-program/) / Astana Tourism | Городской календарь, туристические места, экскурсии | **Приостановить до проверки**: direct content не соответствует старой индексированной странице | Независимо подтвердить официальный контакт/домен, затем экспорт и права; не следовать посторонним ссылкам |
| [2ГИС Places API](https://docs.2gis.com/api/search/places/overview) | Организации, адреса, объекты, отдельные поля часов | Не подключён; документация описывает demo key или подписку | Аккаунт/ключ, тариф и field permissions. Demo key не даёт права выгрузить справочник в свою постоянную открытую базу |
| [Tripadvisor](https://tripadvisor-content-api.readme.io/reference/overview) / [Terra](https://docs.terra.tripadvisor.com/docs/overview) | Туристические места и контент | Не подключён; legacy Content API помечен deprecated, рекомендована Terra | Новый договор/доступ/лицензии и покрытие Астаны. Возможности Terra и права на фото в этом проходе не подтверждены |
| [Aviasales Data API](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API) | Кэш цен авиабилетов и направления | Не подключён; это не API городской афиши | Token/партнёрские условия и отдельная задача авиаперелётов. Не выдавать путеводители/статьи за свободный event feed |
| [Threads official API](https://developers.facebook.com/docs/threads/keyword-search/) | Обнаружение публичных анонсов | Не подключён; документация 21 октября ответила 429, повторов не было | Approved scopes/token/app review и права автора. Пост — повод проверить событие, не готовая запись для публикации |
| [Geofabrik / Казахстан](https://download.geofabrik.de/asia/kazakhstan.html) | Открытая OSM-выгрузка без публичного Overpass | После отдельного разрешения скачан датированный PBF 224 644 381 B; локально извлечён только bbox Астаны | Снимок, не live; raw PBF вне Git, сохранены header cutoff/SHA256/лицензия; обновление пока ручное |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) | Дополнительные названия/официальные сайты/координаты отдельных объектов | CC0 structured data; adapter не подключён | Небольшой reviewed export, revision/source dates. CC0 данных не лицензирует внешние фотографии |
| [data.egov.kz](https://data.egov.kz/pages/about) | Государственные наборы учреждений/объектов | Открытый портал подтверждён; конкретный sports dataset сейчас timeout | Проверить конкретную версию, поля, export/API и условия набора; нельзя объявить текущие часы по старой метаинформации |
| Файлы/CSV/API непосредственно организатора | События, переносы, контакты и одобренные афиши | Универсального publisher-upload/feed ещё нет | Подтверждение организатора, field/media grant, модерация и takedown |
| Собственные генеративные иллюстрации проекта | Оформление интересов/категорий | Есть в `public/assets/ideas/`; это не фото конкретного места/события | Видимая маркировка «Иллюстрация»; не генерировать фиктивную официальную афишу |

AI — не самостоятельный донор фактов. Он может объяснить отобранные источниками записи, но не создаёт подтверждённую цену, сеанс, адрес или наличие мест.

Новость/пост и мероприятие — разные сущности: дата публикации не начало события. Материал без подтверждённых даты, места или организатора остаётся discovery lead для проверки, не автоматически появляется на карте как доступная активность. Скидка тоже требует срока, условий и подтверждённого предложения, а не только рекламного заголовка.

Для Google отдельно: текущий adapter field mask не запрашивает цены или средний чек. В [официальном Place reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places) `priceLevel` — категория уровня цен, `priceRange` — диапазон с возможной отсутствующей верхней границей; ни одно поле само по себе не является статистическим средним чеком в ₸. «Неизвестно» нельзя заменить красивым числом. По [Places policy](https://developers.google.com/maps/documentation/places/web-service/policies) нельзя по умолчанию накапливать content вне разрешённых исключений; показ на карте требует Google Map, а отдельные карточки сохраняют Google Maps и сторонние credits. Ни ключ, ни owner permission на адрес не превращают Google/2ГИС content в OSM-данные.

## 1. Sxodim: что подтверждено и чего пока нет

21 октября прочитаны [условия](https://sxodim.com/polzovatelskoe-soglashenie) и [официальные контакты](https://sxodim.com/almaty/contacts). Условия допускают некоммерческое использование материалов при указании автора и ссылок. Это основание текущего узкого пилота, но не подтверждённая цепочка прав на каждую стороннюю афишу, не коммерческий договор и не установленная издателем квота.

Публичный адрес по вопросам материалов — **help@sxodim.kz**. Не используем старый рекламный Gmail из PDF 2018 года или бухгалтерскую почту для запроса лицензии.

Текущий код: фиксированный Astana index → robots/terms guard → до 24 same-origin detail pages → максимум 50 нормализованных occurrences; не больше одного refresh attempt в час через существующий runtime/cache lease. Это **наши лимиты**, а не обещание Sxodim. При 403/429 не менять IP, не ходить в служебные endpoints и не увеличивать параллелизм. Политика может измениться; ранее прочитанный robots не является вечным разрешением.

Адрес, язык, координаты, конец, итоговая цена и доступность могут отсутствовать. Цена «от» не точная; неизвестная цена не бесплатная. `sourceUrl` агрегатора не `organizerUrl`. Для внешней записи использовать только реально опубликованный booking/contact URL.

## 2. Ticketon: нужен партнёрский канал, не обход 403

`https://ticketon.kz/astana` вернул 403 в reader 21 октября. Повторных попыток, альтернативных хостов, private API, авторизации и копирования фотографий не было. Официальные индексированные страницы публикуют **help@ticketon.kz**; это служба поддержки, не подтверждённый менеджер API/лицензий. Примеры первичных страниц: [официальная страница артиста](https://ticketon.kz/pavlodar/star/alekseev/events), [официальная страница мероприятия](https://ticketon.kz/en/concerts/event/tckt2-festival-level-up-v-almaty). Они используются как evidence контакта, **не** как актуальные предложения Астаны.

Контакт подтверждён через индекс официального домена, не текущий direct HTML. Root отдельно проверил и утвердил адрес/получателя; четвёртое письмо отправлено как просьба перенаправить запрос, не как объявление доступа к API. Нельзя заменять латинское `ticketon` визуально похожими кириллическими буквами из snippets.

Нужны provider IDs, occurrences, timezone, язык сеанса/субтитров, price kind/currency/basis, отмены/переносы и source-updated time. Buyer offer не даёт автоматического права на массовое копирование каталога/афиш. Возможный affiliate link — не соглашение на хранение, изменение изображения или передачу описаний AI.

## 3. Официальные площадки: музей и балет

[Главная Национального музея](https://nmrk.kz/ru/) сегодня показывает Вт–Вс 10:00–18:00, понедельник выходной, отдельные датированные объявления и институциональную почту **ulttyk_muzei@nmrk.kz**. Это хорошие поля для небольшого согласованного feed. Часы здания не подтверждают экскурсию, цена входа не цена отдельной выставки, а период выставки не непрерывный сеанс. Фотографии могут принадлежать музею, художнику или фотографу — нужны конкретные полномочия на распространение.

[Контакты Astana Ballet](https://astanaballet.com/ru/pages/nashi-kontakty) показывают **info@astanaballet.kz**, адрес Улы дала, 43 и телефоны администрации/кассы. Footer сохраняет права; общего открытого media grant не обнаружено. [Афиша](https://astanaballet.com/ru/posters) в этом проходе ответила 500. Нельзя угадывать год, длительность, язык представления или считать похожие названия одним сеансом. Запросить лёгкий CSV/JSON/ICS и переносы напрямую практичнее, чем строить нестабильный scraper.

## 4. Visit Astana: отдельное предупреждение

Поисковый индекс показывал старую партнёрскую страницу с почтой `info@astanatourism.kz`. Однако direct reader [того же URL](https://visitastana.kz/ru/partnership-program/) 21 октября вернул несвязанный gambling/SEO-контент и ссылку на посторонний pages.dev. На другом связанном домене search также показывал смешанный контент. **Это наблюдение, а не установленный факт взлома.**

Не переходили по этим ссылкам, не вводили данные и не брали оттуда «новые» контакты или API. Автоматический импорт/изображения/исходящее письмо в эту очередь не включать, пока официальный контакт не будет независимо подтверждён через проверенный государственный канал или известный официальный телефон. Партнёрство/лицензия не получены.

## 5. Открытый путь для POI и часов без обхода Overpass

[Geofabrik Kazakhstan](https://download.geofabrik.de/asia/kazakhstan.html) публично перечисляет `kazakhstan-latest.osm.pbf`, на момент чтения **214 MB**, с данными до **2026-10-19T20:21:11Z**; также перечислены региональные изменения `.osc.gz`. Это timestamp прочитанной страницы, не обещание свежести будущего скачивания. Публичный extract исключает contributor usernames/user IDs/changeset IDs; в приватный metadata server не заходили.

**Фактически выполненный следующий этап.** Найденный `.incomplete` размером 270 B оказался HTML **307 Temporary Redirect** на официальный датированный `kazakhstan-261019.osm.pbf`, а не отказом в доступе. Единственный диагностический HEAD этого точного HTTPS URL вернул 200 и Content-Length 224 644 381. После явного разрешения root выполнена одна загрузка с лимитом 300 000 000 B / 600 секунд, без retry и без альтернативных хостов. Итог: HTTP 200, 224 644 381 B за 202.84 секунды. SHA256: `4c4d1c67224a49ddc94161a0eeccc698e2b5eb899df8dd74a9efb5259700e1cf`.

`osmium fileinfo` подтвердил настоящий PBF и header `osmosis_replication_timestamp=2026-10-19T20:21:11Z`. Получение проверено в `2026-10-20T20:18:57Z` (уже 21 октября по местному времени). Эти даты намеренно различаются. Raw PBF, bbox и промежуточный GeoJSON находятся только в ignored `.sites-runtime/source-cache/`, не в открытой базе/Git. Запросов к Overpass не было.

В уже собранном root offline image `qettyq-poi-extract:20261021` выполнены `extract` bbox `71.30,51.02,71.60,51.22`, `tags-filter` только нужных категорий/addr:street, затем `export` point/polygon. Все Docker-этапы с `--network none`. Первый собственный memory cap 2 GB дал exit 137 и пустой файл; он не импортировался. Повторная **локальная** extraction с cap 5 GB завершилась успешно. Другие контейнеры не останавливались.

Результат `scripts/poi-extract/import.mjs`:

- 31 123 экспортированных features проверены; 5 с отсутствующей/вне bbox геометрией либо неверной идентичностью исключены.
- 749 именованных публичных POI из допустимых категорий; лимит 800 не превышен. Все 80 прежних ID обновлены, старый snapshot сохранён.
- 265 raw opening_hours, 222 cuisine, 118 адресов у POI. Существующий conservative weekly parser поддерживает 223 из 265 строк, остальные 42 остаются unknown; raw tag не означает «сейчас открыто». Отсутствующие значения остаются null/unknown; цены у всех null. Никаких фото или средних чеков не добавлено.
- 613 node-координат observed; 136 геометрических centroid derived. Centroid не вход и не подтверждённая организатором координата.
- 29 517 точных street+house entries (лимит 30 000): 373 observed, 29 144 derived. В индекс попали только улица, номер дома, координаты, source URL и quality; ни имён жильцов/владельцев, ни контактов. Различающиеся точки одного адреса остаются неоднозначными: потребитель обязан отказаться от неточного совпадения.
- `durationMinutes` — существующее детерминированное планировочное допущение, не измеренное время посещения. Raw opening_hours не гарантирует фактическое открытие и не означает сеанс мероприятия. Неподдержанные праздничные/сезонные исключения остаются unknown в существующем weekly parser.

Метаданные: `data/snapshots/osm-astana-geofabrik-2026-10-20.json`. Нормализованные POI: `data/places.json`. Серверный адресный индекс: `data/astana-address-index.json` (~8.1 MB после обогащения aliases, не включать в клиентский bundle). Индекс допускает только точное и единственное совпадение, не fuzzy geocoding. Автоматического расписания загрузок этим этапом не создано.

**Наблюдаемые названия улиц на трёх языках.** По отдельному запросу root из того же локального bbox дополнительно отфильтрованы highway ways. Из 35 358 street features у 4 604 есть наблюдаемое имя; соответствие строго нормализованного addr:street одному из `name/name:kk/name:ru/name:en` дало 25 959 адресов с `streetAliases`. Другие имена берутся только из реальных тегов того же way/согласованных его сегментов, а `streetAliasSources` сохраняет проверяемые OSM way URLs. При противоречии названий одного языка key исключается; никаких переводов LLM, транслитерации, old_name или fuzzy match нет. Геометрия/номер дома не меняются. Примеры: `Қабанбай Батыр даңғылы` → `проспект Кабанбай Батыра` ([way 23190839](https://www.openstreetmap.org/way/23190839)); `Ілияс Есенберлин көшесі` → `улица Ильяса Есенберлина` ([way 25547400](https://www.openstreetmap.org/way/25547400)). У дома 53 на Кабанбай Батыра остаются две разные точки: alias не даёт права выбрать одну наугад.

Воспроизводимые локальные команды после разрешённой загрузки (выходные файлы должны быть новыми; сырой PBF в Git не добавлять):

```sh
docker run --rm --platform linux/amd64 --network none --memory 5g -v "$PWD/.sites-runtime/source-cache:/work" qettyq-poi-extract:20261021 extract --bbox 71.30,51.02,71.60,51.22 --strategy complete_ways --set-bounds /work/kazakhstan-261019.osm.pbf --output /work/astana-261019-bbox-verified.osm.pbf
docker run --rm --platform linux/amd64 --network none --memory 5g -v "$PWD/.sites-runtime/source-cache:/work" qettyq-poi-extract:20261021 tags-filter /work/astana-261019-bbox-verified.osm.pbf 'nwr/amenity=cafe,restaurant,fast_food,food_court,ice_cream,theatre,cinema,arts_centre,library' 'nwr/tourism=museum,gallery,attraction,viewpoint' 'nwr/leisure=park,garden,fitness_centre,sports_centre,swimming_pool,stadium' 'nwr/addr:street' --remove-tags --output /work/astana-261019-selected.osm.pbf
docker run --rm --platform linux/amd64 --network none --memory 2g -v "$PWD/.sites-runtime/source-cache:/work" qettyq-poi-extract:20261021 export /work/astana-261019-selected.osm.pbf --geometry-types point,polygon --attributes type,id --add-unique-id type_id --output-format geojsonseq --output /work/astana-261019-selected.geojsonseq
node scripts/poi-extract/import.mjs --input .sites-runtime/source-cache/astana-261019-selected.geojsonseq --source-as-of 2026-10-19T20:21:11Z --retrieved-at 2026-10-20T20:18:57Z --pbf-sha256 4c4d1c67224a49ddc94161a0eeccc698e2b5eb899df8dd74a9efb5259700e1cf --pbf-bytes 224644381 --write
pnpm data:validate
pnpm exec vitest run tests/unit/address-match.test.ts tests/unit/durable-store.test.ts tests/unit/vps-runtime.test.ts tests/unit/reasoned-assistant.test.ts tests/unit/recommend.test.ts
pnpm exec eslint scripts/poi-extract/import.mjs
```

Отдельный локальный enrichment уже созданного индекса, без повторного получения PBF и без замены POI:

```sh
docker run --rm --platform linux/amd64 --network none --memory 5g -v "$PWD/.sites-runtime/source-cache:/work" qettyq-poi-extract:20261021 tags-filter /work/astana-261019-bbox-verified.osm.pbf 'w/highway' --remove-tags --output /work/astana-261019-streets.osm.pbf
docker run --rm --platform linux/amd64 --network none --memory 2g -v "$PWD/.sites-runtime/source-cache:/work" qettyq-poi-extract:20261021 export /work/astana-261019-streets.osm.pbf --geometry-types linestring --attributes type,id --output-format geojsonseq --output /work/astana-261019-streets.geojsonseq
node scripts/poi-extract/import.mjs --streets-input .sites-runtime/source-cache/astana-261019-streets.geojsonseq --enrich-addresses-only --write
```

Проверки реально пройдены: validate 749 POI; scoped Vitest **42/42**, затем address-match повторно **4/4** после aliases; scoped ESLint PASS; отдельные offline smoke assertions geometry/unknown price/private access/merge PASS, aliases exact match/proof/unchanged coords/no fuzzy/conflict quarantine PASS. Ошибочно набранный `pnpm validate:data` отсутствовал в package.json, после чего запущена правильная существующая команда `pnpm data:validate`; это не скрытый PASS несуществующей команды.

[OSM лицензия](https://www.openstreetmap.org/copyright) — ODbL: допустимы копирование/адаптация при соблюдении атрибуции и соответствующих условий распространения производной базы. Карточка OSM не лицензирует фотографию по `image`/`website`. Правила поставщика extract/tiles/API отдельно обязательны. [opening_hours](https://wiki.openstreetmap.org/wiki/Key:opening_hours) — сложный формат с исключениями; неизвестные или неподдержанные holiday/date rules должны оставаться unknown.

Дополнительно: [Wikidata structured data — CC0](https://www.wikidata.org/wiki/Wikidata:Licensing), но не внешние изображения и не гарантия актуальных часов. [Открытые данные eGov](https://data.egov.kz/pages/about) предназначены для повторного использования в приложениях; [ранее найденный sports dataset](https://data.egov.kz/datasets/view?index=sporttyk_keshender_turaly_dere1) сегодня не загрузился. Новые строки/coords/hours из него не получены.

## 6. Общие вопросы будущему партнёру

Письменный ответ должен различать следующие разрешения; «да, можно брать информацию» слишком неопределённо:

1. Какие факты/описания можно получать, хранить, нормализовать, переводить и публично показывать; можно ли использовать минимальные поля в ответах AI.
2. Какой официальный feed/API/CSV/ICS, ключ/доступ и permitted rate; есть ли source-updated time, incremental updates, отмены и переносы.
3. Предоставляются ли точные координаты; можно ли геокодировать опубликованный адрес разрешённым провайдером. Разрешение владельца адреса не отменяет лицензии самого geocoder.
4. На какие конкретные фото/постеры у партнёра есть право выдавать разрешение; разрешены ли private storage, public web/app display, thumbnails, resize и crop. **Public Git, открытый исходный архив, dataset export и передача картинок AI — отдельные права, не включённые по умолчанию.**
5. Какой credit/ссылка/логотип обязательны, срок/территория/platforms, порядок отзыва и удаления уже закэшированных производных файлов.
6. Допустим ли только текущий пилот; условия возможного коммерческого использования и любые платежи согласуются отдельно владельцем, не принимаются агентом.

Обмен персональной геопозицией/диалогом пользователя с донором афиши для получения общегородских событий не нужен.

## 7. Как можно скачивать настоящую афишу Sxodim — только после прав

**Сейчас скачивание выключено.** `data/media-policy.json`: `posterRights:unknown`, autoDownload/hotlink false, approvedOrganizerMedia пуст. Картинки проекта — собственные маркированные иллюстрации. Отправленное письмо и отсутствие ответа не меняют этот статус.

Что уже умеет `extractSxodimMediaCandidates()`:

- Из уже разрешённого полученного Event HTML читает `schema.org/Event.image`; не исполняет скрипты.
- Проверяет совпадение Event URL с source page, размер HTML и не больше четырёх candidate URLs.
- Допускает только точный `https://sxodim.com/uploads/posts/...` raster path, без credentials/query/hash. Это metadata, **не запрос картинки**.
- Возвращает rights unknown, displayAllowed/downloadAllowed false. Hook административный, по умолчанию кандидаты не публикуются и не сохраняются.

Нельзя включить «скачай всё с сайта» вместо grant review. После письменного разрешения предлагается следующий отдельный workflow; он **не реализован этим документом**:

1. Привязать grant к source event/provider ID и конкретному файлу/серии файлов; проверить правообладателя, scope, credit, дату окончания и отзыв.
2. Однократно получить одобренный URL через HTTPS allowlist с bounded timeout/bytes, manual redirects, без произвольного URL от модели. При отказе/изменении политики остановиться, а не менять хост.
3. Положить оригинал в **приватное** quarantine/object storage, вне `public/`, Git и submission ZIP. MIME по содержимому, raster decode, ограничения pixels/bytes, hash и проверка безопасности файла обязательны. Численные лимиты — будущая конфигурация проекта, не «правила Sxodim».
4. Создавать производные размеры только в разрешённом scope. Для квадратного marker preview и карточки 3:4 безопаснее `contain`/нейтральное поле, чем обрезать логотипы, даты и авторский текст; crop требует отдельного разрешения.
5. Публичный UI получает только одобренный media endpoint, alt, нужный credit и source link. Никакого remote hotlink по умолчанию, служебного grant-документа в API или картинки в AI-контексте.
6. При expiry/revocation прекратить выдачу, удалить соответствующие thumbnails/cache по согласованному сроку, оставить административное подтверждение отзыва без лишних персональных данных. Показать нейтральную заглушку/подписанную иллюстрацию.

**Технический blocker текущего resolver:** он принимает локальные `/assets/event-posters/...` и требует `publicProjectDistribution:true`. Это прежний workflow публичного project bundle. Новое разрешение «private storage + display, но не public Git/archive» не должно насильно превращаться в `publicProjectDistribution:true`. Сначала нужен отдельный private media backend/resolver contract; здесь app/schema не менялись.

## 8. Что и где хранится сейчас

- `data/places.json` — локальный датированный OSM snapshot 749 POI; не обновляется от каждого посетителя.
- `data/astana-address-index.json` — 29 517 точных адресных записей из того же extract, только серверный вспомогательный индекс; это не отдельное подтверждение организатором.
- `data/snapshots/osm-astana-geofabrik-2026-10-20.json` — cutoff/получение/лицензия/хэш/границы/статистика импорта. Предыдущий `osm-astana-2026-10-19.json` оставлен.
- `.sites-runtime/source-cache/` — ignored raw PBF и промежуточные файлы; это не публичный download endpoint. Ошибочный 270 B HTML не использован как данные.
- `data/livedata/sxodim-astana-2026-10-20.json` — bundled fallback: fetchedAt `2026-10-20T11:02:28.509Z`, 7 occurrences. Это не сегодняшняя production-афиша.
- VPS runtime имеет SQLite event/source cache и source-refresh lease; Worker fallback использует module/Cache API. Текущую production DB этой задачей не читали, refresh не запускали. Поэтому нельзя сказать, сколько свежих строк сейчас на сервере.
- `data/media-policy.json` — политика и approvals, не binary storage; approvedOrganizerMedia сейчас 0.
- `public/assets/ideas/` — собственные иллюстрации, не скачанные постеры Sxodim.
- Память пользователя/диалог — отдельный consent-контур, не лицензия на данные доноров и не event cache.

## Границы этого исследования

Прочитан навык Defuddle; CLI отсутствует, глобальные установки не выполнялись, применён встроенный web reader. В исследовательском проходе read-only поиск Sent ограничивался четырьмя указанными адресами, совпадений не было, письма не отправлялись. **В последующем явно разрешённом этапе** root утвердил четыре текста/адресата; профиль и scoped Sent проверены повторно, четыре отдельных письма получили Gmail `SENT`. См. локальный журнал в SOURCE_OUTREACH_20261021.md. Это не полученные grants или партнёрства. Ещё одним отдельно разрешённым этапом получен официальный PBF и выполнен offline importer (§5). Новых аккаунтов, API-ключей, оплат, выгрузок фотографий и автоматических задач нет. После 403/429 обхода и повторов не было; Overpass не вызывался.

App/server/schema/config/data registry этим агентом не менялись. Расширенный root scope разрешил только `scripts/poi-extract/import.mjs`, `data/places.json`, новый адресный индекс и extract metadata snapshot. Dockerfile принадлежит root. Реестр кандидатов и старые отчёты местами содержат прежние статусы; актуальные наблюдения этого прохода изложены выше, сами по себе они не включают runtime approval. Дальнейшую интеграцию/публикацию координирует root.
