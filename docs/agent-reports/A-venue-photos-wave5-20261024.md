# A1 · Реальные фотографии мест · wave 5 · 24 октября 2026

Локальное покрытие **12 → 13 из 749 мест**: **5 Commons + 8 publisher**. Добавлена одна действительно проверенная фотография парка Жетысу; новых подтверждённых ресторанных фотографий в этом ограниченном этапе нет. Количество не подменялось изображениями похожих заведений. Google/OpenAI/2GIS вызовов и новых расходов — **0**. Генерации, удаления watermark, новых зависимостей, commit/deploy/SSH-изменений нет.

## Импортировано

- Место: `osm:way:69232075`, парк Жетысу.
- [Конкретный Commons файл](https://commons.wikimedia.org/wiki/File:Bakhash_in_Zhetysu_park.jpg): **Ayratayrat**, собственная работа, **CC BY-SA 4.0**, photographedAt **2019-05-17 13:04:36** по metadata источника. Это исторический вид, не подтверждение сегодняшнего состояния или работающего фонтана.
- [Наблюдаемый OSM объект](https://www.openstreetmap.org/way/69232075) в сохранённом снимке имеет `wikidata=Q104866925`. [Текущий Wikidata объект](https://www.wikidata.org/wiki/Q104866925) содержит P373 `Zhetysu park`; actual file category — именно [Zhetysu park](https://commons.wikimedia.org/wiki/Category:Zhetysu_park). Использован существующий `wikidata` identity proof, без новых aliases, fuzzy matching или выдуманных GPS.
- JPEG скачан bounded HTTPS без redirects, действительно декодирован `sips` и открыт через `view_image`; root независимо открыл его и подтвердил scoped subject review. Основной предмет — вода, простой круглый бассейн/струи и деревья. Нет основной скульптуры, современной архитектуры или художественного произведения. Дальние лавки и маленькие фигуры людей incidental, не endorsement. Это ограниченная визуальная оценка, не универсальная юридическая гарантия на все изображения парка.
- Выход: `public/assets/places/astana-zhetysu-water-2019.jpg`, **1280×720**, **366589 bytes**, SHA256 **`fc363812c6791e0c82af02405fe7cfa34fb529a0856e66d5e95bb454ab161564`**. Thumbnail Commons, без дополнительного crop/ретуши/AI. Credit содержит автора, название файла, Commons и лицензию; source/license/ShareAlike сохранены.
- Commons original SHA1 **`ec5d95a70861454de71b1ba75c1a527b7d3b75f2`**. Actual review/fetch checkpoint **2026-10-24T17:52:47Z**, source OSM checkpoint остался **2026-10-19T20:21:11Z**. Лицензионный Commons review без придуманного expiry; registry сохраняет существующую возможность revocation.

Реальный importer успешно выполнен, metadata snapshot `.sites-runtime/venue-wave5-zhetysu.json`. Старая ботаническая фотография и другие assets не удалялись. Publisher registry/изображения событий не изменены.

## Проверено, но не импортировано

| Кандидат | Конкретная причина |
|---|---|
| Дворик | [Sxodim статья](https://sxodim.com/astana/article/gde-stoit-poprobovat-shashlyki-v-astane) содержит реальный интерьер и один адрес Аль-Фараби92. JPEG скачан и открыт: 800×600, 96207 bytes, SHA256 `4fa4c83b39d98f413476d476b102ec00d0f346b7b1d8fa3b4a985a351d9ebbf8`. Но canonical publisher point 51.158783/71.521123 лежит вне actual building way258628225; catalog node2639622505 находится на его границе. Близость не выдана за существующий shared-building proof. Фото осталось quarantine. |
| Турфан | Canonical и статья сокращают адрес до «Мамбетова10», тогда как наблюдаемый street alias — «улица Азербайжана Мамбетова». Контракт не отбрасывает имена людей и не приписывает OSM отсутствующий alias. |
| На крыше | У источника «Кадыргали Жалаири», у наблюдаемого OSM street «Кадыргали Жалайыри». Вариант написания не объявлен exact match без отдельного доказательства. |
| Реал | В старой статье image src повреждён вставкой phone-link HTML. Исходный корректный JPEG URL не подтверждён, не реконструировался угадыванием. Новая статья содержит Instagram embed, не разрешение на копирование. |
| Театр кукол / Жастар | Проверенные canonical/article страницы не дают пригодного publisher JPEG: отсутствующий image/социальные вставки. Постеры соседних спектаклей не использовались как фото театра. |
| Музей Сакена Сейфуллина / театр Горького | Есть конкретные Commons фасады, но нет достаточного существующего OSM linkage/file-GPS identity proof. Название в поиске не заменяет этот proof. |
| Barys Arena / Saryarka Velodrome / Astana Arena | Файлы Commons с проверяемым CC BY-SA и точной OSM-linked категорией действительно скачаны и открыты. Однако современная архитектура и настенная графика заметны; отдельные subject rights не подтверждены. Root согласовал оставить quarantine, не менять enum и не маркировать стадионы «nature» ради count. |
| Альтернативный интерьер Меруерт | Конкретный старый article image URL вернул HTTP404. Существующая одобренная фотография сохранена. |

Стадионные JPEG остаются только в ignored `.sites-runtime`: `barys-wave5-reviewed.jpg` (412965 bytes, SHA256 `37b99a4e92ffb477522a8ddb750b02fe73014483ba77d45f143253db33dbfaad`), `saryarka-wave5-reviewed.jpg` (373493 bytes, `43f377acbdeb805020f1e396dae5bdefde1b60983a388fb0949bb1ac77a14fb7`), `astana-arena-wave5-reviewed.jpg` (370723 bytes, `03f3c9397bb2991b8cad9a9a8c0d729a705bff2bde45022c819b04f63c57a29b`). Наличие локальных файлов не означает rights approval или рост coverage. Массовый scraper/social downloader не запускался.

## Проверки и границы

```sh
node scripts/import-place-media.mjs --place-id osm:way:69232075 --metadata .sites-runtime/venue-wave5-zhetysu.json --file .sites-runtime/zhetysu-wave5-reviewed.jpg --write
pnpm exec vitest run tests/unit/publisher-place-media.test.ts tests/unit/commons-place-media.test.ts tests/unit/geographic-media-identity.test.ts tests/unit/place-media-policy.test.ts tests/integration/publisher-media-route.test.ts --maxWorkers=2
pnpm exec eslint tests/unit/commons-place-media.test.ts
git diff --check -- data/place-media.json tests/unit/commons-place-media.test.ts
```

**58/58 PASS, 5 files, 570ms**; scoped lint и diff check PASS. Новый тест проверяет exact venue identity, credit/historical date и отказы при category verification=false, невалидном Wikidata ID, несовпадающем category URL и unknown subject rights. Existing binary loop проверяет bytes/SHA/actual local JPEG для всех пяти Commons records.

Frozen Commons test time перенесён с 24Oct00:00 на **24Oct23:00 UTC**, чтобы actual review17:52 не был искусственно backdated под старую fixture. Future/expiry guards не отключены. Core media files/config/scripts/dependencies не изменены. Агент изменил только `data/place-media.json`, `tests/unit/commons-place-media.test.ts`, новый public JPEG и этот отчёт. Build/E2E/live/deploy остаются ответственностью root, здесь не заявлены проверенными.

Повторно прочитаны PRD1/7/14 и skill `defuddle`; CLI отсутствует, глобальная установка вне этапа. Для чтения страниц использованы bounded HTTP/JSON-LD/HTML и web discovery. Skill определил extraction approach, но не является основанием для прав на изображения. Следующий проверяемый путь к расширению заведений — согласованные фото владельцев/издателей с точным branch proof, либо отдельно reviewed narrow identity/source contracts; неизвестность не превращать в разрешение.
