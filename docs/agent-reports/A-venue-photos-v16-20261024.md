# A1 · Реальное фото Uno и проверка филиалов · v16

Дата проекта: 24 октября 2026. Это локально подготовленный media-only этап; production проверяет оркестратор отдельно. Покрытие мест **5 → 6 из 749**, включая **3 Commons + 3 publisher venue photos**. Афиша с 16 изображениями этим этапом не изменена.

## Добавлено и осмотрено

[Uno на Кенесары, 13](https://sxodim.com/astana/place/uno): exact `LocalBusiness` содержит имя Uno, адрес «Казахстан, Нур-Султан (Астана), улица Кенесары, 13», координаты 51.163703/71.410558 и конкретный `image` JPEG. Его наблюдаемые байты скачаны ограниченным запросом без redirects, размер проверен `sips`, изображение открыто `view_image`: виден реальный вход и вывеска UNO, не категория или placeholder. Снимок из публикации 2023 года, не гарантия сегодняшнего внешнего вида, расписания или открытости ресторана.

Карточка `osm:node:12973408945` имеет то же имя и точку 51.1635956/71.4106968. Независимое адресное здание [OSM way240949258](https://www.openstreetmap.org/way/240949258) содержит `addr:street=Кенесары көшесі`, `addr:housenumber=13`; обе точки действительно внутри фактического polygon. Это не nearest-name/proximity match. Геометрия получена из уже сохранённого Geofabrik `astana-261019-bbox-verified.osm.pbf` существующим osmium Docker image без сети. Алиас «улица Кенесары» наблюдаем в уже существующем address index с [OSM streetway28522726](https://www.openstreetmap.org/way/28522726). Публичный OSM API для здания ответил 429; повторный обход не выполнялся, использован ранее разрешённый локальный экспорт.

Параметры deploy asset:

```json
{
  "path": "data/place-media-cache/3070d0f30ac8d04ba3d6856413912b98efa63f0a909d33d160d3fbe6de8d9f83.jpg",
  "sha256": "3070d0f30ac8d04ba3d6856413912b98efa63f0a909d33d160d3fbe6de8d9f83",
  "bytes": 166472,
  "width": 1522,
  "height": 570,
  "mime": "image/jpeg"
}
```

Private binary ignored, не добавлять в публичный Git. Source image URL записан в registry; API `/api/media/places/<sha>` повторно проверяет rights/identity/expiry/байты. Вызван existing offline importer с явным reviewed SHA; исходник не перекодирован и не отретуширован.

## Права

Повторно открыты [публичные условия Sxodim](https://sxodim.com/polzovatelskoe-soglashenie): допускают некоммерческое использование с указанием издателя и ссылкой. [robots](https://sxodim.com/robots.txt) получен bounded curl, `User-agent: * / Disallow:`; robots сам по себе лицензией не считается. Сохранено существующее основание только для некоммерческого пилота, credit/link, неизвестный фотограф не приписан издателю, сторонние ограничения приоритетны. Review истекает **22 ноября 2026 22:42:12 UTC**, коммерческий режим/отзыв/expiry отключают выдачу. Изображение не отправлялось в LLM или embeddings. Нового отдельного разрешения владельца ресторана не выдумано.

## Проверенные, но не добавленные кандидаты

- [Алаша](https://sxodim.com/astana/place/alasha), [Багратиони](https://sxodim.com/astana/place/bagrationi), [Korean House](https://sxodim.com/astana/place/korean-house): точные адресные кандидаты, но текущий JSON-LD даёт общий `sxodim_og.png` или не имеет venue image. Картинки соседних рекомендаций/старых Events не использованы.
- [Gasteria](https://sxodim.com/astana/place/gasteria): изображение есть, но source metadata не определяет один филиал (общий адрес «Казахстан, Астана», координата не у catalog Turan22/1, текст описывает два филиала). Не подставлено ко всем четырём одноимённым POI.
- [Пивоварофф](https://sxodim.com/astana/place/restoran-pivovaroff): реальный JPEG и адрес Сарайшык5Г, но OSM POI point находится вне независимого polygon здания243301727; proximity не считается доказательством. Другие Pivovaroff на Туран31 и в других местах тоже исключены.
- Прежние конфликты Life fitness, Арарат, TLP и TARY этим этапом не разрешены; фотографии не подменены.

Поиск ограничен несколькими листингами ресторанов и перечисленными детальными кандидатами. Не выполнялся массовый scrape, социальные логины, paid Google/OpenAI calls или скачивание любых произвольных фото. `defuddle` skill прочитан; CLI отсутствует, глобальная установка запрещена областью задачи, использован bounded HTTP/JSON-LD и web-reader.

## Изменения и проверки

Изменены только `data/publisher-place-media.json`, `tests/unit/publisher-place-media.test.ts`, этот отчёт и один ignored private JPEG. Core media modules, UI, common schema/config/package/lock, места/цены/координаты не менялись.

Новый unit case проверяет exact Uno и отказ при source point вне наблюдаемого здания. Existing registry asset test проверяет все три JPEG по длине/SHA, gated reader и expiry. Выполнены actual importer, native decode и visual review, scoped ESLint, `git diff --check`.

```sh
pnpm exec vitest run tests/unit/publisher-place-media.test.ts tests/unit/commons-place-media.test.ts tests/unit/place-media-policy.test.ts tests/integration/publisher-media-route.test.ts --maxWorkers=2
```

Результат: **46/46 PASS, 4 files** (414 ms). Browser/live full-suite в этот отчёт не приписываются.
