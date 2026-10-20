# A1 · Реальные фотографии мест: права и проверка

Дата проверки: 21 октября 2026 по времени проекта. Прочитаны PRD §1, §7, §11. Навык Defuddle прочитан полностью; CLI отсутствует, глобальная установка не выполнялась, использован встроенный web reader и документированный публичный Wikimedia API. Внешний текст не исполнялся как инструкция.

## Результат

Подготовлены **две настоящие фотографии двух существующих POI**, не картинки «похожего места». Это не обещанные 5–20 объектов: при проверке прав безопасное покрытие получилось меньше. Оба JPEG декодированы через macOS `sips`, открыты и визуально осмотрены; 1280×960, вместе 949 537 B. Нет AI-ретуши, генерации, дорисовывания или изменения сцены. Использованы уменьшенные Commons thumbnails; изменения указаны в registry/DTO.

| POI / точное доказательство | Что именно на фото | Автор / лицензия | Локальный файл |
|---|---|---|---|
| [Ботанический сад, OSM way1196402246](https://www.openstreetmap.org/way/1196402246), исходный `wikimedia_commons=Category:Astana botanical garden` | **Растение Acalypha hispida в оранжерее**, 28.06.2026. Не фасад, не общий вид сада и не обещание текущего состояния коллекции | Nurken · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [страница конкретного файла](https://commons.wikimedia.org/wiki/File:Acalypha_hispida_at_the_Astana_Botanical_Garden_(1).jpg). Страница прямо указывает Botanical Garden Q104866948, file categories — greenhouse/2026 этого сада | `public/assets/places/astana-botanical-garden-acalypha-2026.jpg` · 610 835 B |
| [Национальный музей РК, OSM node4894937300](https://www.openstreetmap.org/node/4894937300), исходный `wikimedia_commons=Category:National Museum of the Republic of Kazakhstan` | **Естественно-исторический экспонат Hipparion**, 07.05.2026. Не фасад и не обзор интерьера; наличие экспоната сегодня не проверено | PlainVector · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), [страница конкретного файла](https://commons.wikimedia.org/wiki/File:Hipparion_de_Christol,_1832.jpg). Документированный imageinfo подтверждает точную музейную категорию, own-work автора и CC0 | `public/assets/places/astana-national-museum-hipparion-2026.jpg` · 338 702 B |

Только эти два проверенных JPEG по отдельному разрешению root скопированы также в `mobile/public/assets/places/`. SHA256 web/native совпадают. `mobile/www`, `mobile/ios` и конфигурация native не менялись.

Хэши:

- Acalypha: `5a7223e40c2633b1aa44128e4915019d45392c4015ed5119635ac498ecf95a1b`.
- Hipparion: `61d336597582b9dbb076bd649955c4f674f2ab1cb8881b9667f0e956f3f5b05f`.

## Почему не «любая фотография из Commons»

В 749 нормализованных POI лишь 11 объектов имеют наблюдаемые OSM `wikidata`/`wikimedia_commons` связи; ещё один ресторан содержит внешний `image` URL без открытой лицензии. Выбор выполнялся только от этих идентификаторов, без случайного поиска похожих фасадов. OSM-связь проверена по исходному локальному GeoJSON extract с cutoff `2026-10-19T20:21:11Z`. ODbL на данные не лицензирует фотографии.

[Commons reuse policy](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) требует смотреть разрешение **конкретного файла**, автора и условия выбранной лицензии. Наличие category/file в Commons не заменяет эту проверку. Для CC BY-SA сохраняются авторство, ссылка на лицензию, описание изменений и применимые ShareAlike-условия для медиа; это не заявление о лицензии всего приложения. Для CC0 credit оставлен добровольно для прозрачности.

Отдельно проверены [территориальная памятка Commons по Казахстану](https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/Kazakhstan#Freedom_of_panorama) и [категория Национального музея](https://commons.wikimedia.org/wiki/Category:National_Museum_of_the_Republic_of_Kazakhstan). Они предупреждают об ограничениях изображений современной архитектуры/искусства. Права фотографа не автоматически означают права архитектора или скульптора. Официальная [страница закона в Әділет](https://adilet.zan.kz/eng/docs/Z960000006_) здесь вернула JS-shell; актуальную правовую квалификацию по ней подтвердить не удалось. Это консервативная инженерная проверка, не юридическое заключение.

Поэтому **не опубликованы** фасады Astana Opera, Arena/современные монументы; не одобрено парковое фото Zhetysu с современными скульптурами и спроектированными объектами. Из нескольких просмотренных thumbnail-кандидатов выбраны растение и естественно-исторический объект без современного архитектурного/художественного произведения как предмета съёмки. У Hipparion случайные посетители видны лишь фоном, не используются для идентификации/рекламы/endorsement. Сомнительные непубликованные кандидаты остаются только в ignored quarantine, не в `public`/Git.

## Сравнение доступов

| Путь | Хранить / распространять | Условия и реальное состояние |
|---|---|---|
| Проверенный Commons-файл | Да, только по лицензии файла и с проверкой дополнительных прав | Реализованы эти два фото; локальные пути, автор/лицензия/source URL/проверка SHA, без runtime hotlink |
| Прямое разрешение организатора/владельца | Только в согласованном scope | Четыре письма ранее SENT, но ни одного grant этим этапом не получено. Владение зданием само по себе не доказывает полномочия на права фотографа/архитектора. Отдельно запросить store/display/resize/crop/public-source-archive и порядок отзыва |
| [Google Place Photos](https://developers.google.com/maps/documentation/places/web-service/place-photos) | **Не переносить в этот постоянный открытый registry/Git** | Документированный API получает photo resource из Places и требует authorAttributions при наличии. Photo name не кэшируется, может истекать. Photos показывать только в отдельном разрешённом Google-контуре с действующими policy/consent/квотой; это не Commons-лицензия. Здесь ни одного платного Google-вызова не делалось; общий разрешённый бюджет Google **$10 не расширен** |

## Модуль и контракт

`src/server/media/commons-place-media.ts` экспортирует:

```ts
getPlaceMedia(placeId: string):
  | { kind: 'real_place_photo'; src: string; alt: string; author: string;
      credit: string; license: string; licenseUrl: string; sourceUrl: string;
      width: number; height: number; changes: string }
  | { kind: 'none'; src: null }
```

Для offline tests есть `resolveCommonsPlaceMedia(placeId, unknownRegistry, now)`. Resolver — чистая функция, без network/fs/ключей. Разрешает только reviewed registry, точный OSM ID/URL и Commons category/file identity, известную лицензию с правильным URL, strict true разрешения, визуальную проверку, неистёкший технический review и локальный JPEG-путь. Unknown/blocked/revoked/expired/неверные поля → `none`; другой объект или иллюстрация не подставляются.

`data/place-media.json` хранит reviewed metadata и условия. `reviewExpiresAt` — техническая политика проекта, не утверждение о сроке Creative Commons: при соблюдении условий CC-лицензия сама по себе не «истекает через месяц». Ручной `revoked/blocked` позволяет прекратить показ при обнаруженной ошибке/претензии; юридические последствия такого отзыва требуют отдельной оценки.

Требования к UI (сам UI меняет root): сохранить честный alt «растение»/«экспонат», не подписывать это фасадом/интерьером. Показать доступную подпись автора, Commons-ссылку, лицензию и изменения; не удалять credit ради чистой карточки. Остальные POI пока `none`, и их fallback не должен называться реальным фото заведения. Историческое фото не доказывает текущие часы, меню, цены, состав коллекции или открытый сеанс.

## Импорт и проверки

`scripts/import-place-media.mjs` публикует **только уже полученный и вручную проверенный** локальный JPEG. Он не делает сетевых запросов и не одобряет права автоматически. Проверяет отдельный imageinfo файл, автора/лицензию/категории, фактический OSM tag, review flags, native JPEG decode, размер ≤1500px/3MB и заранее reviewed SHA256. Существующий другой файл не перезаписывает. Offline import не обновляет source fetchedAt: отдельно записывает importedAt.

Реально выполненные команды (quarantine/raw metadata — ignored source-cache):

```sh
node scripts/import-place-media.mjs --place-id osm:way:1196402246 --metadata .sites-runtime/source-cache/place-media-commons-nature-20261021.json --file .sites-runtime/source-cache/place-botgarden-acalypha-review.jpg --write
node scripts/import-place-media.mjs --place-id osm:node:4894937300 --metadata .sites-runtime/source-cache/place-media-commons-museum-20261021.json --file .sites-runtime/source-cache/place-museum-hipparion-review.jpg --write
pnpm exec vitest run tests/unit/commons-place-media.test.ts tests/unit/place-media-policy.test.ts
pnpm exec eslint src/server/media/commons-place-media.ts scripts/import-place-media.mjs tests/unit/commons-place-media.test.ts
pnpm typecheck
```

На момент отчёта: combined unit **35/35 PASS** (включая независимые A8 policy tests), scoped ESLint PASS, typecheck PASS. Native/web SHA256 совпадают. Root интегрирует API/UI отдельно; этот отчёт не объявляет E2E production/деплой проверенным.

Новых ключей, Google/OpenAI расходов, почтовых отправок, аккаунтов и background-задач нет. Commons API/thumbnail endpoints работали без 403; reader у отдельных страниц возвращал internal unavailable, подмены хоста/IP/auth и обхода ограничений не было. API выбран документированный публичный, не угаданный private endpoint. Бюджетированные запросы были малыми пакетами по связанным объектам, не массовой загрузкой категории/сайта.
