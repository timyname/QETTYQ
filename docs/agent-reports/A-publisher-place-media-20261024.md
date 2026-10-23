# A1/A2 · Два настоящих фото ресторанов, точная привязка филиала

24 октября2026 по времени проекта. Это продолжение10 реальных publisher event images и3 Commons POI photographs. Добавлено **2 фотографии2 ресторанов**, не одноимённого филиала/категории. Итоговое покрытие карточек мест **3→5 POI**, афиша10 event banners отдельно.

## Источники и права

Переходы взяты из реально видимых ссылок [списка ресторанов Sxodim](https://sxodim.com/astana/places/restorany), не из угаданных URL. Открыты3 concrete detail pages: Ribambelle, Саксаул, Вечное небо. Последний не найден в текущем OSM каталоге и **не связан** с другой карточкой. Life fitness из предыдущей проверки root имеет конфликт Туркестан2 vs OSM8; не использован. Ararat с другой улицы/филиала не подставлялся.

Применено уже перепроверенное на этом этапе [явное разрешение издателя](https://sxodim.com/polzovatelskoe-soglashenie) на некоммерческое использование материалов с credit/source links. [robots](https://sxodim.com/robots.txt) допускает traversal; сам robots лицензией не считается. Область ограничена некоммерческим пилотом, known third-party restrictions перекрывают её, photographer/author=null, издатель не назван фотографом. Индивидуального grant от ресторатора не выдумано. Publisher source image не означает нынешнее состояние интерьера, меню или часов работы. Изображения не отправляются в LLM/embeddings.

## Точное соответствие объектов

| POI | Издатель и независимое доказательство | Фото |
|---|---|---|
| RIBAMBELLE, OSM node12041597269 | [Точный LocalBusiness](https://sxodim.com/astana/place/ribambelle), Достык16, observed geo51.124742/71.432073. Publisher point **и OSM POI point**51.1249938/71.4326174 находятся внутри фактического building polygon [Talan Towers relation8205731](https://www.openstreetmap.org/relation/8205731), независимо имеющего addr:street Достық көшесі/addr:housenumber16. Polygon экспортирован osmium из уже сохранённого Geofabrik city extract, не нарисован вокруг нужной точки. Точное имя совпадает независимо от регистра | 1522×570,195332B, SHA256`e319dd02b83df8006960243416d579b142a80c12ab3ec559c9ee625232df82f4` |
| Саксаул, OSM node4953253121 | [Точный LocalBusiness](https://sxodim.com/astana/place/restoran-saksaul), Достык5. Сам [OSM restaurant node](https://www.openstreetmap.org/node/4953253121) содержит name Саксаул, addr:street Достық көшесі, addr:housenumber5. Geo издателя51.12789/71.422245 согласуется с этой же адресной карточкой; расстояние используется **только как дополнительный reject gate≤80m**, не как доказательство само по себе. Русский alias улицы наблюдаем в [OSM streetway24418994](https://www.openstreetmap.org/way/24418994) через существующий address index | 1522×570,235791B, SHA256`cf5e42f830ff75d5f4ef09c7af8d2b2540c8b74a4e9f78375f115a02f18d82c1` |

Оба source URLs изображений прочитаны из `LocalBusiness.image` именно этого URL, а не старых Events внутри той же страницы. Same-origin `/uploads/posts/...` JPEG, без redirects, bounded curl≤3MB/20s, контроль file/sips/SHA и native visual review. На снимках реальные интерьеры ресторанов. Публикации2023 года: ALT/changes явно не гарантируют сегодняшний вид. Все исходные координаты/адреса/часы/цены приложения не менялись; это media-only binding.

## Реализация и управление

- `data/publisher-place-media.json`:2 records, enabled=true, monetizationEnabled=false, noncommercial_pilot_only, точные source URLs/name/address/geo и независимая OSM identity evidence, reviewed/expiry/status/SHA/size/dimensions. Review до **22 ноября2026 19:25:54 UTC**. Отмена/expiry/commercial switch прекращают выдачу.
- `src/server/media/publisher-place-media.ts`: worker-compatible pure resolver + identity gates. Exact catalog ID/name/coordinates, observed street/house/OSM alias, максимум80m только после независимого exact identity, либо два points внутри независимого адресного здания. Nearby/same brand alone не проходят. Source address cannot silently change to another street or house. OSM proof freshness≤35d.
- `src/server/media/publisher-place-files.ts`: Node helper `readPublisherPlaceImage`, private files `data/place-media-cache/<sha>.jpg`, повторная проверка всех gates/байтов/SHA на запрос. DTO src `/api/media/places/<sha>`, не вечный static public asset. Root добавляет no-store route, tracing и корректный UI credit.
- `commons-place-media.ts`: узкий PlaceMedia union `publisher_place_photo`, getPlaceMedia сохраняет Commons-first fallback. Для Commons добавлен `photographedAt`, позволяющий root показать видимую подпись2005 для исторического парка.
- `scripts/import-publisher-place-media.ts`: воспроизводимый offline publish только уже проверенных exact curated record+file+explicit reviewed SHA, native decode dimensions, no overwrite другого файла. Новые identity records не создаёт по nearest/name guess. Проверка происхождения/права/визуального соответствия предшествует явному импортированию.

Выполнены оба реальных offline importer вызова, bounded source downloads и viewer. Изменений root config, API handlers, CatalogPhoto, базы places, координат/цен, Google/OpenAI billing/ключей, писем, социальных логинов нет.

## Проверки

Новые7 unit tests проверяют оба реальных соответствия, другой филиал/адрес/улицу, nearby-outside-building, коммерческий/выключенный/просроченный/отозванный scope, произвольный URL/формат, реальные private bytes/SHA/expiry, traversal. Вместе с3 существующими media-файлами **55/55 PASS**; scoped ESLint и full typecheck PASS. Повторный финальный запуск после добавления street-alias negative case передан root отдельно. Browser/live endpoint и native rendering проверяет root; этот отчёт их прохождение не выдумывает.
