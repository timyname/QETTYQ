# A13: готовые подборки, provider APIs и внешние маршруты для Астаны

Дата проверки: 19 октября 2026 года. Исследование основано только на официальной документации, условиях и страницах владельцев данных. Неофициальные API, reverse engineering и scraping не рассматривались. Это инженерная оценка доступности, а не юридическое заключение.

## Короткий вывод

- Для QETTYQ сейчас безопаснее сохранить собственный OSM snapshot и добавлять внешние ссылки на Google Maps, 2GIS и, при необходимости, Яндекс Go.
- Google Places, 2GIS Places/Routing, Tripadvisor Terra, eGov Open Data API и прогноз цены Яндекс Go требуют ключа, аккаунта, тарифа или отдельного одобрения.
- Официального API для импорта Google Saved Lists, коллекций 2GIS, редакционных списков Tripadvisor или подборок Aviasales в собственную базу не найдено.
- Google Places и 2GIS нельзя использовать как источник постоянного локального каталога на обычных API-условиях. У Google постоянно хранится `place_id`, но основной Places-контент ограничен правилами кэширования. У 2GIS обычная WebAPI-оферта прямо говорит, что кэширование продуктов не предусмотрено.
- Visit Astana и gov.kz дают полезные первоисточники для ручной проверки и ссылок, но документированного event feed с правом массового импорта не найдено. Для автоматической загрузки нужно письменное разрешение или официальный договорной feed.

## Статусы

| Статус | Значение для QETTYQ |
|---|---|
| `usable_now` | Можно реализовать без нового ключа и без копирования provider-контента в локальную базу. |
| `needs_key` | Нужны ключ, billing, подписка, партнёрский аккаунт или одобрение владельца. |
| `link_only` | Можно открыть официальный сервис или страницу, но QETTYQ не получает лицензированный dataset. |
| `prohibited_or_unclear` | Обычные условия запрещают действие либо официальные права на импорт, хранение или кэширование не подтверждены. |

## Итоговая матрица

| Провайдер / возможность | Статус | Что разрешено или документировано | Хранение, показ и attribution | Ключ / стоимость | Можно импортировать готовую подборку? |
|---|---|---|---|---|---|
| Google Maps URLs | `usable_now` | Открыть поиск, место, карту или directions во внешнем Google Maps. | Ссылка не возвращает контент, route geometry или ETA в QETTYQ. | Ключ не нужен. | Нет, это только переход. |
| Google Places API (New) | `needs_key` | Text Search, Nearby Search, Place Details и типы `tourist_attraction`, `museum`, `event_venue` и другие POI. Это данные мест, не календарь event occurrences. | Нельзя prefetch/cache/store за пределами исключений. `place_id` можно хранить. При показе без Google map нужен Google attribution, для фото/отзывов также provider/author attribution. | Billing обязателен; API key или OAuth; pay-as-you-go по SKU и field mask. | Нет API Google Saved Lists. Собственный runtime search возможен, постоянный импорт списка нет. |
| Google Saved Lists / My Maps shared link | `link_only` | Пользователь может поделиться списком; My Maps вручную импортирует собственные CSV/KML/Sheets. | Это UI-функции Google, не лицензия на копирование Google-curated content в QETTYQ. | Для открытия общей ссылки ключ не нужен. | Нет, только переход к Google UI. |
| Импорт Google Saved Lists | `prohibited_or_unclear` | Production import endpoint не документирован. | Google Places storage rules не дают общего права скопировать список и его контент. | Не решается обычным API key. | Не импортировать без отдельного письменного права. |
| 2GIS Places API | `needs_key` | Поиск организаций, зданий, landmarks и других объектов. | Каждый показ должен сопровождаться ссылкой/логотипом 2GIS. Обычная оферта запрещает извлечение и сохранение продуктов; кэширование не предусмотрено. | Demo key на ограниченный срок или платная подписка. Тариф зависит от успешных запросов. | Нет. Для локального snapshot нужна отдельно согласованная выборка/лицензия. |
| 2GIS Routing API | `needs_key` | Возвращает маршруты, время, длину, geometry и maneuvers для поддерживаемых типов транспорта. | Те же договорные ограничения и attribution 2GIS. | Ключ и подписка. | Не относится к коллекциям. |
| 2GIS route deep link | `link_only` | HTTPS-ссылка открывает route screen в приложении или вебе. Есть `pedestrian`, `car`, `bus`, `taxi` и другие типы. | QETTYQ не получает route data и не кэширует 2GIS content. | Ключ не нужен для ссылки. | Нет, только переход. |
| 2GIS Favorites / Guides | `link_only` | Избранное и редакционные путеводители доступны пользователям 2GIS. | Публичного Collections API не найдено. | Открытие страницы не требует API key. | Нет, только переход к 2GIS UI. |
| Импорт 2GIS Favorites / Guides | `prohibited_or_unclear` | Официальный import/export API не документирован. | Обычная WebAPI-оферта запрещает сохранение продуктов. | Не решается обычным API key. | Не импортировать без отдельного соглашения. |
| Tripadvisor Terra API | `needs_key` | Locations, POI, reviews, photos и geos. Сервис подходит для показа лицензированного Tripadvisor-контента. Документированного общего event-calendar endpoint не найдено. | Требуется Tripadvisor attribution и использование возвращаемых branding assets. Права на caching/feed зависят от тарифа/контракта; не считать standard tier правом на локальный snapshot. | API key. Discover начинается с pay-as-you-go; текущая витрина указывает цену от $0.009 за entity, enterprise tiers имеют custom pricing. | Не найден API для импорта пользовательских/редакционных lists. Поиск POI через API возможен только в рамках тарифа. |
| Tripadvisor public lists/pages | `link_only` | Можно дать пользователю обычную ссылку на страницу Tripadvisor. | Не копировать reviews, photos, rankings или редакционный список со страницы без Terra license. | Ключ не нужен для внешней ссылки. | Нет подтверждённого import API. |
| Импорт Tripadvisor lists | `prohibited_or_unclear` | Официальный endpoint пользовательских или редакционных lists не найден; Geo `collections` deprecated. | Нужны явно предоставленные content usage rights. | Не решается обычной публичной ссылкой. | Не импортировать без Terra contract, который прямо покрывает use case. |
| Aviasales / Travelpayouts Aviasales APIs | `needs_key` | Aviasales Data API даёт города, аэропорты, популярные направления и цены на авиабилеты. Это не API достопримечательностей или событий Астаны. | Партнёрские правила применяются; data API рекомендует локальный cache на 24 часа. Search API требует user-initiated search и корректный booking flow. | Travelpayouts registration и token; real-time search требует одобрения. | Нет. Редакционные city collections не доступны как документированный Aviasales API. |
| Импорт редакционных подборок Aviasales | `prohibited_or_unclear` | Официального attractions/events collection API не найдено. | Consumer terms не предоставляют права на копирование содержимого сервиса. | Партнёрский flight token не меняет эту границу. | Не импортировать. |
| Travelpayouts day tours | `needs_key` | У отдельных партнёрских брендов есть tours API/feed, например WeGoTrip или Tiqets data. Это отдельные программы, не Aviasales collection. | Права, attribution, deeplink и cache определяются договором конкретного бренда. | Партнёрский аккаунт и условия бренда. | Только если конкретный feed покрывает Астану и договор прямо разрешает использование. |
| Visit Astana event pages | `link_only` | Официальный туристический портал публикует места, площадки и события с web pages. | Можно хранить собственную ссылку и время проверки. | Для страницы ключ не нужен. | Только ручная curated запись с минимальными фактами и ссылкой. |
| Массовый импорт Visit Astana calendar | `prohibited_or_unclear` | Документированного API/RSS/ICS и публичной лицензии на массовое копирование не найдено. | Не копировать тексты/фото и не строить автоматический snapshot без разрешения. | Нужен письменный feed/license agreement. | Только после разрешения владельца источника. |
| gov.kz, Управление культуры Астаны | `link_only` | Официальные новости, календарь и документы подходят как первоисточники конкретных событий. | Сохранять URL, `checked_at` и минимальные проверяемые факты. Автоматический feed с явными правами не подтверждён. | Ключ не нужен для страниц. | Не как готовый непрерывный event dataset. |
| data.egov.kz Open Data API | `needs_key` | Машиночитаемые государственные datasets предназначены для дальнейшего использования и повторной публикации в неизменном виде. Найден набор Акимата Астаны о мероприятиях по развитию языков, но он узкий и обновляется ежегодно. | Указывать государственный орган, dataset URL, дату обновления и не выдавать годовой набор за live афишу. | API требует ключ из кабинета разработчика. Web-download зависит от конкретного набора. | Да, только конкретный опубликованный open dataset и в рамках его паспорта. Это не общая афиша города. |
| Яндекс Go route deeplink | `link_only` | Открывает заданный taxi route в приложении или вебе через официальный AppMetrica redirect URL. | Ссылка не возвращает цену в QETTYQ. Не открывать в iframe; документация также не рекомендует `target="_blank"`. | Для самой ссылки отдельный API key не указан. Партнёрский `ref` и tracking применяются по условиям программы. | Не относится к коллекциям. |
| Яндекс Go fare estimate API / widget | `needs_key` | Beta API/виджет может показывать примерное время и ориентировочную цену. | Обязательны предусмотренные условиями price disclaimers. Данные предназначены для показа через widget/code, не для собственного постоянного price dataset. | Нужно подать заявку и получить API key; сайт должен работать по HTTPS. | Нет. Цена является динамической оценкой на конкретный маршрут. |
| Яндекс Карты / Навигатор external route | `link_only` | Пользователь может открыть сервис и построить маршрут; Navigator URI документирован для передачи точек. | Внешний переход не возвращает маршрут в QETTYQ. | Собственного API response нет. | Нет официального пути импорта пользовательских подборок в QETTYQ. |
| Яндекс Карты JavaScript API | `needs_key` | Встроенная карта, поиск и route UI в рамках лицензии API. | Требуются attribution и соблюдение ограничений хранения. | API key обязателен; коммерческие сценарии и лимиты сверяются с тарифом. | Не является API пользовательских подборок. |

## Google Maps и Places

### Что можно получить

Places API предоставляет runtime search и details для физических мест. Типы включают `tourist_attraction`, `museum`, `historical_place`, `event_venue`, `concert_hall` и другие. `event_venue` означает площадку, а не подтверждённое событие с датой и билетом. Официальная REST surface содержит `searchText`, `searchNearby`, `autocomplete` и `get`; endpoint Google Saved Lists в ней отсутствует.

Источники:

- [Places API REST](https://developers.google.com/maps/documentation/places/web-service/reference/rest)
- [Place types](https://developers.google.com/maps/documentation/places/web-service/place-types)
- [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search)

### Хранение и показ

Google требует не prefetch/cache/store Places content кроме явно разрешённых исключений. `place_id` можно хранить и рекомендуется освежать, если ему больше 12 месяцев. Координаты Places API допускается временно кэшировать до 30 дней по действующим Service Specific Terms. Places content нельзя накладывать на не-Google map. При показе без карты нужен Google Maps attribution; для photo/review content нужно сохранять возвращаемые author/provider attributions.

- [Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Place IDs and storage exception](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Google Maps Platform Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- [Places usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)

### Подборки

Google Maps позволяет пользователю создать, поделиться или подписаться на saved list. Эта consumer-функция не является API для импорта списка в сторонний сервис. Google My Maps может вручную импортировать пользовательский файл, но это также не production ingestion API для чтения Google lists.

- [Create and share a list of places](https://support.google.com/maps/answer/7280933?hl=en)
- [Import map features into My Maps](https://support.google.com/mymaps/answer/3024836?hl=en)

### Без ключа

Maps URLs открывают Google Maps для поиска или directions и не требуют key. Для QETTYQ подходит существующий шаблон:

```text
https://www.google.com/maps/dir/?api=1&destination=LAT,LON&travelmode=walking
```

Это handoff, не интеграция Routes API. QETTYQ не получает geometry, distance или ETA.

- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)

## 2GIS

### Places, pricing и attribution

Places API ищет организации, здания, landmarks и другие объекты. Нужен API key. Платформа предлагает demo key либо подписку; стоимость считается по успешным запросам/units. На дату проверки опубликовано 6 700 ₽ за 10 000 units Places API и 6 700 ₽ за 10 000 routes, но перед подключением цену нужно сверить повторно.

- [2GIS Places API overview](https://docs.2gis.com/en/api/search/places/overview)
- [2GIS pricing](https://docs.2gis.com/en/platform-manager/subscription/pricing)
- [2GIS keys](https://docs.2gis.com/en/platform-manager/subscription/keys)

Оферта разрешает отображать полученный продукт в приложении, но требует подпись «2ГИС» со ссылкой на правообладателя. Пункт 3.1 запрещает извлекать и сохранять продукты для последующей обработки и прямо указывает, что кэширование не предусмотрено. Поэтому обычный API key не даёт QETTYQ права создать постоянный Astana snapshot из ответов 2GIS. Публичная оферта опубликована российским правообладателем; для аккаунта и территории Казахстана владелец проекта должен проверить фактически предложенный договор, но до такого подтверждения безопасно применять более строгую границу без хранения.

- [2GIS WebAPI offer, пункты 2.10 и 3.1](https://law.2gis.ru/offer-license-agreement-webapi)

### Маршрутная ссылка без ключа

Официальная HTTPS-схема предпочтительнее app-only URI, потому что может открыть веб-версию:

```text
https://2gis.ru/astana/directions/tab/pedestrian/points/LON1,LAT1|LON2,LAT2
```

Origin можно опустить, чтобы 2GIS использовал текущее местоположение пользователя. Object ID после координат опционален. Ссылка не возвращает данные маршрута в QETTYQ.

- [2GIS deep links and directions](https://help.2gis.ru/question/razrabotchikam-zapusk-ideystviya-vmobilnom-prilozhenii-cherez-deeplink)
- [2GIS Routing API](https://docs.2gis.com/en/api/navigation/routing/overview)

## Tripadvisor

Terra API документирует Locations, reviews, photos и geos. Текущий Discover tier использует pay-as-you-go, требует API key и standard API terms; higher tiers дают расширенный контент и специальные права. Витрина указывает стартовую цену от $0.009 за entity, но стоимость и free allowance нужно читать в кабинете перед включением billing.

Публичные материалы требуют Tripadvisor attribution и возвращаемые brand assets. Материалы Tripadvisor также указывают caching/feed как договорную возможность более высоких/assisted tiers. Значит, QETTYQ не должен считать базовый API правом на бессрочный локальный snapshot.

Collections в Geo Details уже помечены deprecated. Официального endpoint для импорта пользовательского saved list или редакционной подборки не найдено. Для Астаны Terra можно оценивать как дополнительный runtime POI source после оформления доступа, но не как источник live events.

- [Tripadvisor Developers, plans and pricing](https://www.tripadvisor.com/developers)
- [Terra overview](https://docs.terra.tripadvisor.com/docs/overview)
- [Tripadvisor Content API FAQ and attribution](https://www.tripadvisor.com/business/solutions/hotels/content-api)
- [Geo Details and deprecated collections](https://docs.terra.tripadvisor.com/reference/geoget)

## Aviasales и Travelpayouts

Официальный Aviasales Data API предназначен для авиаданных: cities/airports, popular destinations и flight prices. Он требует Travelpayouts token. Документация рекомендует кэшировать Data API response на 24 часа, а cached flight prices имеют собственную freshness/expiry семантику. Это не источник достопримечательностей или городских событий.

Travelpayouts отдельно перечисляет day-tour feeds/API отдельных брендов. Они могут дать коммерческие экскурсии или билеты, но каждый feed требует отдельной партнёрской программы и условий. Наличие бренда в Travelpayouts нельзя трактовать как разрешение импортировать редакционные подборки Aviasales.

- [Aviasales Data API](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API)
- [Aviasales API requirements](https://support.travelpayouts.com/hc/en-us/articles/203956083-Requirements-for-Aviasales-data-API-access)
- [Aviasales API FAQ and cache guidance](https://support.travelpayouts.com/hc/en-us/articles/204529267-FAQ-about-Aviasales-API)
- [Travelpayouts day tours APIs and data](https://support.travelpayouts.com/hc/en-us/sections/360004561331-Day-tours-API-and-data)
- [Aviasales Terms of Use](https://www.aviasales.com/terms-of-use?market=us)

## Официальные источники Астаны

### Visit Astana

Портал содержит event calendar, attractions, venues и отдельные страницы. Он полезен как первоисточник для ручной curated карточки. В публично доступных официальных материалах не найдено API/RSS/ICS и лицензии на массовое копирование календаря, описаний или изображений.

Допустимая консервативная схема до письменного разрешения:

1. хранить event-specific URL, а не общую страницу;
2. хранить только минимальные проверяемые поля, дату проверки и статус `snapshot`;
3. не копировать изображения и длинные описания;
4. перед показом перепроверять дату, время, площадку и цену;
5. не называть этот процесс live-интеграцией.

- [Visit Astana calendar](https://visitastana.kz/ru/exhibition-areas/)
- [Visit Astana events](https://www.visitastana.kz/en/about-city/where-to-go/)

### gov.kz и data.egov.kz

Управление культуры Астаны публикует календарь, новости и документы. Это официальный web source, но документированного стабильного feed для общей городской афиши не найдено.

Портал Open Data определяет datasets как машиночитаемые данные для дальнейшего использования и повторной публикации в неизменном виде. API требует ключ разработчика. Найденный Astana dataset о мероприятиях по развитию языков имеет ежегодную актуализацию и узкую предметную область, поэтому не заменяет event calendar.

- [Управление культуры города Астаны](https://www.gov.kz/org/astana-madeniet?lang=ru)
- [Astana dataset о мероприятиях по развитию языков](https://data.egov.kz/datasets/view?index=astana_kalasynyn_tilderdi_damy)
- [Open Data API key instructions](https://data.egov.kz/proxy/aisoip?apiKey=yourApiKey)
- [Закон РК «О доступе к информации»: определение открытых данных](https://www.gov.kz/org/vko-bilim/documents/details/28296?lang=ru)

## Яндекс Go и Яндекс Карты

### Deeplink без получения цены

Официальная схема Яндекс Go принимает start/end coordinates, tariff class и ref. Переход открывает маршрут и оформление заказа в Яндекс Go. Сам deeplink не возвращает QETTYQ price estimate.

```text
https://3.redirect.appmetrica.yandex.com/route
  ?start-lat=LAT1&start-lon=LON1
  &end-lat=LAT2&end-lon=LON2
  &tariffClass=econom
  &ref=qettyq
  &appmetrica_tracking_id=25395763362139037
```

Документация не рекомендует iframe или `target="_blank"`. Для production нужно сверить участие в программе, допустимый `ref` и фактическое покрытие Астаны.

- [Yandex Go advanced order links](https://yandex.ru/support/taxi-distr/ru/api/deeplinks)
- [Yandex Go distribution program](https://yandex.ru/support/taxi-distr/ru/)

### Оценка цены

Прогноз цены является отдельным beta API/widget. Нужно подать заявку и получить key. Ответ может содержать `price`, `price_text`, `waiting_time` и `time`. При показе обязательна формулировка, что это примерная стоимость и она может измениться из-за спроса и наличия машин. Это динамический runtime response, не поле для постоянного event/POI snapshot.

- [Yandex Go fare estimate API](https://yandex.ru/dev/taxi/taxiapi)
- [Trip information API](https://yandex.ru/support/taxi-distr/ru/api/trip-info)
- [Yandex Go widget terms](https://yandex.ru/legal/taxi_api/ru)

Для Яндекс Карт ключ нужен при встраивании JavaScript API. Обычный внешний маршрут или Navigator URI можно использовать только как handoff, без заявления, что QETTYQ получил route evidence.

- [Yandex Maps route help](https://www.yandex.ru/support/maps/ru/concept/rout)
- [Yandex Navigator URL format](https://yandex.ru/dev/navigator/doc/ru/concepts/navigator-url-params)
- [Yandex Maps JavaScript API quick start](https://yandex.ru/dev/jsapi-v2-1/doc/ru/)

## Что можно сделать сегодня без новых ключей

1. Оставить Leaflet/OSM как карту и собственный датированный OSM snapshot как каталог POI.
2. Добавить внешнюю Google Maps URL для walking directions.
3. Добавить 2GIS HTTPS deep link для pedestrian route.
4. При продуктовом решении добавить Яндекс Go deeplink только как переход к построенному taxi order, без собственной цены.
5. Для событий использовать event-specific Visit Astana или gov.kz URLs, `checked_at`, timezone, `snapshot` и явные unknown-поля.
6. Не копировать provider photos, reviews, ratings, editorial descriptions или ready-made collections.

## Что требует действий владельца аккаунта

| Действие | Зачем |
|---|---|
| Выбрать Google Cloud project, включить billing и создать ограниченные credentials | Runtime Places search/details или Routes. Не использовать Places data на OSM map. |
| Оформить 2GIS demo/subscription key и письменно согласовать persistent data rights | Places/route API либо локальная licensed selection. Обычная WebAPI подписка не разрешает snapshot. |
| Зарегистрировать Tripadvisor Terra key и выбрать tier/contract | Лицензированный Tripadvisor POI/review/photo content и согласованные caching rights. |
| Зарегистрировать Travelpayouts account и отдельную partner program | Только если коммерческие tours конкретного бренда полезны и покрывают Астану. |
| Получить eGov developer key | Машиночитаемое чтение конкретных Open Data datasets. |
| Запросить Visit Astana feed или письменное разрешение | Автоматический импорт event calendar и право использовать конкретные поля/медиа. |
| Подать заявку на Yandex Go fare estimate API | Показывать ориентировочную цену и время в собственном UI с обязательным disclaimer. |

## Решение для QETTYQ

Ближайшая проверяемая конфигурация:

```text
POI: dated OSM snapshot
events: small manual snapshot + event-specific official URLs + checked_at
map: Leaflet / OSM attribution
walking handoff: Google Maps URL + optional 2GIS deep link
taxi handoff: optional Yandex Go deeplink, no in-app price
provider APIs: disabled until owner keys, billing and license review
```

Готовые collections не следует импортировать из consumer pages. Если продукту нужен поставщик готовой подборки, нужен договорный feed с явно указанными правами на поля, обновление, хранение, кэш, attribution и прекращение использования после расторжения.
