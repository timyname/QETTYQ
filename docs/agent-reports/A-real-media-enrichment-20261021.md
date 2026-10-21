# A1/A2 · Фото заведений: повторная проверка и рабочая очередь

21.10.2026, задача после пяти пользовательских iPhone-скриншотов. Прочитаны AGENTS, PRD §1, §7, §13, §14; существующие media policy, resolver/importer, Google Photos adapter, Next local image guide. Изменений общих контрактов/API/конфигурации/бюджетов нет.

## Диагноз

На снимках отсутствие большинства фотографий не является подтверждённым HTTP/image-loader сбоем: в `data/place-media.json` **2** одобренных фото для **749** POI. Прочие объекты возвращают `kind=none`. Отдельный настоящий сбой существующего JPEG по скриншоту исключить нельзя, но у показанного «Арарат» вообще нет одобренного media record. Его исходный OSM node453247457 содержит только name/amenity, без website/image/Commons. «Life fitness» тоже не имеет одобренного media record.

Большой пустой hero с английским `restaurant` — UI-дефект, который root исправляет отдельно: отсутствие фото не должно превращаться в огромный декоративный псевдоснимок. Здесь UI и native safe-area не менялись.

Sxodim: в текущем `media-policy.json` `approvedOrganizerMedia=[]`, poster rights unknown. Общие условия повторного использования фактов не доказывают права на каждый сторонний постер. В подключённом Gmail read-only запросы `"QETTYQ" -in:sent` и `in:inbox (from:sxodim.com OR from:ticketon.kz OR from:astanaballet.kz OR from:visitastana.kz)` вернули **0** писем. Это отсутствие обнаруженного ответа в этих запросах, не утверждение о всей истории почты. Ничего не отправлялось.

## Реальная bounded проверка источников

Выполнен один публичный документированный Wikidata `wbgetentities` batch для 11 существующих точных OSM Q-ID. Выполнен **один** Commons `query/imageinfo` batch для найденных 8 P18 файлов, metadata `url|extmetadata|size`; оба HTTP200. Google/OpenAI/2GIS вызовов, фото-загрузок и новых расходов не было. Внешний restaurant image не скачивался. 12 объектов с исходной media-связью сохранены в отдельной review-only очереди `data/place-media-candidates.json`.

| Связь / P18 файл | Фактически прочитанная лицензия | Почему не опубликован новый POI JPEG |
|---|---|---|
| Q4408858 / Saryarka Velodrome (inside).JPG | CC BY-SA 3.0 | Архитектура/интерьер как предмет; дополнительных прав не установлено. Текущий allowlist также не принимает 3.0 автоматически |
| Q16632800 / Barys Arena 2014-03-15.JPG | CC BY-SA 3.0 | Стройка 2014, не нынешний вид; отдельные subject rights не установлены |
| Q746559 / Astana Arena (inside interior).JPG | CC BY-SA 3.0 | Современный архитектурный интерьер; дополнительных прав не установлено |
| Q1454511 / Этно-мемориальный комплекс «Карта Казахстана Атамекен».JPG | CC BY-SA 3.0 | Художественный/архитектурный комплекс; дополнительных прав не установлено |
| Q21371563 / Inside Astana's New Opera House (8282915665).jpg | CC BY 2.0 | Современный интерьер; дополнительных прав не установлено |
| Q573362 / Казахстан ЦКЗ 2011 02.jpg | CC BY-SA 4.0 | Исходный POI называется Astana Musical, файл описывает ЦКЗ Казахстан. Один Q-ID не доказывает точную актуальную идентичность этой площадки |
| Q104866925 / Improvisation of Charyn Canyon in Jetisy park.jpg | CC BY-SA 4.0 | Спроектированный художественный объект, а не просто природный каньон; дополнительных прав не установлено |
| Q104866948 / A view of Nur-Sultan's Botanical Garden.jpg | CC BY-SA 4.0 | Сад уже покрыт проверенным растительным JPEG; существующий quarantine landscape просмотрен, в фоне здания. Новый файл не расширяет число покрытых POI, не утверждаем новые проверенные subject rights |

Q18405670/Q1072092/Q42422896 в этом ответе не содержали P18. У музея при этом уже есть одобренный отдельный Hipparion JPEG; отсутствие P18 не означает отсутствие всех Commons-фото.

**Новых одобренных фотографий: 0.** Существующие два файла и лицензии не менялись. Не было замены неизвестного фото похожим рестораном, AI-картинкой, недоказанным фасадом или чужим Google/2GIS медиа. Это консервативное инженерное решение в рамках принятой project policy, не юридическое заключение о невозможности любого использования этих файлов.

## Реализованная часть

`src/server/media/place-media-candidates.ts`: чистая deterministic функция строит очередь только по существующему точному OSM ID/URL и наблюдаемому `wikimedia_commons`, `wikidata` или безопасному review-only `image` URL. Не ищет по сходству названия, не склеивает филиалы. Дубли идемпотентны; противоречивые дубли отвергаются. Пустая/невалидная связь не становится изображением. Все записи `allowDownload=false`, `allowDisplay=false`; никакого автоматического разрешения по категории/тегу/OSM ODbL.

`scripts/discover-place-media.ts`: offline CLI читает уже разрешённый локальный GeoJSON extract и каталог, требует явный исходный source-as-of (не заменяет старый cutoff сегодняшним временем), выдаёт JSON в stdout. Нет сети, env/ключей, записи registry и публикации media. Снимок результата на текущем extract сохранён отдельно как `data/place-media-candidates.json`, не подключён к UI-resolver.

Рабочая цепочка остаётся: точная source-связь → проверка конкретного файла/автора/лицензии/subject rights → native visual review и SHA → reviewed registry → существующий fail-closed importer → локальный JPEG с credit. Постоянный browser fetch чужих картинок на каждый свайп не добавлялся. Чтобы реально покрыть рестораны/фитнес, нужны собственные фото либо конкретное разрешение правообладателя на публикацию/хранение/resize/distribution; в источник можно затем добавить соответствующий проверенный файл. Ограничение Google $10 не изменялось.

## Проверки

Фактически выполнено:

```sh
pnpm exec tsx scripts/discover-place-media.ts --source-as-of 2026-10-19T20:21:11Z
pnpm exec vitest run tests/unit/place-media-candidates.test.ts tests/unit/commons-place-media.test.ts tests/unit/place-media-policy.test.ts tests/unit/google-place-photos.test.ts
pnpm exec eslint src/server/media/place-media-candidates.ts scripts/discover-place-media.ts tests/unit/place-media-candidates.test.ts
pnpm typecheck
```

Результат: discovery **749 POI / 12 кандидатов**; **62/62** unit tests PASS, scoped ESLint PASS, full typecheck PASS. Эти тесты offline, не доказывают production визуальную загрузку фото или реальную iPhone-клавиатуру. Публикацией занимается root.

## Первичные источники, проверены повторно

- [Commons reuse](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia): права проверяются для отдельного файла, возможны дополнительные ограничения помимо прав фотографа.
- [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies): ограничения prefetch/cache/store; результаты на карте связаны с Google Map, отдельный mapless показ требует атрибуции. Не переносили Google Photos в постоянный Commons registry или карточку на 2GIS-карте.
- [Wikidata API](https://www.wikidata.org/w/api.php): bounded batch `wbgetentities`, только claims11 ID из существующего OSM extract.
- [Commons API](https://commons.wikimedia.org/w/api.php): один metadata batch8 файлов, только source URL/author/license/description/categories/dimensions. Наличие Commons файла не равно автоматической правовой гарантии.

Следующий проверяемый шаг: получить конкретный grant/собственное фото для показанного «Арарат» и Life fitness, связать с точным OSM ID/адресом, проверить растровый файл и провести существующий offline import. Без этого корректное состояние — компактная карточка без выдуманной фотографии.
