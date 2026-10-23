# A1 · Два реальных фото кофеен · 24 октября 2026

Локально реализован media-only этап после v17: покрытие мест **6 → 8 из 749** (3 Commons + 5 publisher photos). Текущие 16 афиш, UI-размеры, каталожные адреса, цены, расписания и координаты не изменялись. Production/publish проверяет оркестратор отдельно.

## Добавлено и осмотрено

| Место | Независимое подтверждение identity | Private JPEG |
|---|---|---|
| Культура Диктует | [Publisher LocalBusiness](https://sxodim.com/astana/place/kultura-diktuet) прямо содержит exact name, «Казахстан, Астана, улица Сыганак, 33», point 51.124866/71.422488, собственный `image`. [OSM node12959449801](https://www.openstreetmap.org/node/12959449801) в сохранённом каталоге/address index имеет то же название и наблюдаемый адрес Сығанақ көшесі, 33. Алиас «улица Сыганак» наблюдён у [streetway165759887](https://www.openstreetmap.org/way/165759887). Это exact name/address, не nearest match | SHA256 `2d43f7fa56a36fd98059239c52b8c7881893238a5c8e2ee297a2da2a3a9bc19d`, 105118 bytes, 1522×570 |
| Chaleur | [Publisher LocalBusiness](https://sxodim.com/astana/place/chaleur) прямо содержит exact name, «Қазақстан, Нұр-Сұлтан (Астана), Сығанақ көшесі, 60/5», point 51.121288/71.427528, собственный `image`; текст отдельно называет Abu Dhabi Plaza. [OSM node10170946745](https://www.openstreetmap.org/node/10170946745) 51.1215961/71.4279892 и source point **оба находятся внутри фактического** [Abu Dhabi Plaza building way762780007](https://www.openstreetmap.org/way/762780007), имеющего addr:street=Сығанақ көшесі, addr:housenumber=60/5 | SHA256 `fb1d94d1254eb55a1abd921c320b5e58253ca3f2a716ca8ab26829eaf74e21db`, 191602 bytes, 1522×570 |

Оба файла скачаны с точного publisher `LocalBusiness.image` bounded HTTPS curl без redirect. У каждого проверены длина, SHA256, JPEG marker и native decode через `sips`. Оба затем действительно открыты через `view_image`: Культура Диктует — светлый интерьер со столиками/сиденьями; Chaleur — белая кирпичная стена, книжные полки и надпись DAY. Это реальная publisher-фотография интерьера, не логотип, сетевой placeholder или сгенерированный кадр. Фотографии относятся к публикациям 2022 года; текущий вид, режим работы или открытость ими не гарантируются.

Геометрия Chaleur взята без сети из ранее разрешённого Geofabrik city extract `astana-261019-bbox-verified.osm.pbf`, не нарисована вокруг точек. Выполнен существующий `qettyq-poi-extract:20261021 getid -r ... w762780007 -f osm` с readonly source mount, `--network none`, readonly rootfs/cap-drop. Первый вызов ошибочно продублировал Entrypoint `osmium`, завершился с unknown command; исправлен аргумент команды, повторный вызов успешно вернул наблюдаемые nodes/way/tags. В manifest сохранён исходный ring из nd-order и provenance snapshot 19 октября, а не сегодняшняя дата для старого OSM источника.

## Права и срок

Повторно прочитаны [публичные условия publisher](https://sxodim.com/polzovatelskoe-soglashenie): допустим некоммерческий сценарий с credit/link. Bounded robots fetch: `User-agent: * / Disallow:`; robots не считается лицензией. В конкретных материалах не наблюдено отдельного стороннего запрета/фотокредита. Не приписываем неизвестного фотографа издателю и не выдаём общую публичность за коммерческую лицензию.

Сохранены существующие gates: `noncommercial_pilot_only`, monetization=false, credit/link, visualVerified, отзыв/third-party restriction/expiry, gated media route с `no-store`. Новые review/fetch timestamps **2026-10-23 23:18:50 UTC** (24 октября по времени проекта); review истекает **2026-11-22 23:18:50 UTC**. Не отправлялись в LLM/embeddings. Без коммерческого разрешения при монетизации media route должен отказать.

Два новых ignored deploy files (в сумме **296720 bytes**):

```text
data/place-media-cache/2d43f7fa56a36fd98059239c52b8c7881893238a5c8e2ee297a2da2a3a9bc19d.jpg
data/place-media-cache/fb1d94d1254eb55a1abd921c320b5e58253ca3f2a716ca8ab26829eaf74e21db.jpg
```

Private bytes не добавлять в публичный Git; deploy-контекст должен включить их по reviewed manifest, как существующие venue assets. Existing offline importer реально выполнен для обоих с явными reviewed SHA и `--write`; исходники не изменены.

## Проверенные кандидаты, которым не подменили фото

- [Leto Cafe](https://sxodim.com/astana/place/leto-cafe): реальный image имеется, но publisher Достык **8А**, catalog Leto Cafe Достық **8Б**, source longitude 71.418571 против catalog 71.4217842 — другой адрес и вне 80m rejection gate. Отказ, не исправляем координаты фото ради совпадения.
- [Cappuccino](https://sxodim.com/astana/place/sappuccino): publisher name **Сappuccino** с кириллической С, catalog **Cappuccino** с Latin C; exact name contract не разрешает автоматический homoglyph merge. Для отдельного alias-proof этапа, не ослабляем общий matcher ради покрытия.
- [Кофе с тобой](https://sxodim.com/astana/place/kofe-s-toboy), [Caffe Latte](https://sxodim.com/astana/place/caffe-latte): конкретные venue photos есть, но соответствующего exact POI в текущем наборе 749 не найдено; не приклеиваем их к созвучным кофейням.
- [Ocean Basket](https://sxodim.com/astana/place/ocean-basket), [Mökki](https://sxodim.com/astana/place/mokki): `LocalBusiness.image` — общий `sxodim_og.png`, не фотография заведения; не используем старые соседние Event images вместо фото ресторана.
- [Ginza](https://sxodim.com/astana/place/ginza) явно содержит third-party фото credit `kipyat.com`, и текущая проверка не дала подходящего LocalBusiness identity. Не включено по общему разрешению Sxodim. Turandot — no LocalBusiness; guessed the-kitchen/portofino/cappuccino и кофейный listing путь вернули 404; обхода нет. Использованы доступные restaurant/tag pages для обнаружения, не массовый crawl.

`defuddle` skill прочитан; установленного CLI нет. Глобальная установка не входит в ограниченную задачу; использованы bounded HTTP/JSON-LD и web reader. Доступа к соцсетям, платным Google/OpenAI и дополнительного биллинга не было. Расходы новых платных вызовов **0**.

## Изменения и выполненные проверки

Только `data/publisher-place-media.json`, `tests/unit/publisher-place-media.test.ts`, этот отчёт и два ignored private JPEG. Общие контракты, core-media modules, rootconfigs, package/lock, UI, events, каталог POI не менялись. Добавлены два строгих unit case с отрицательными изменённым адресом/источником вне фактического здания; existing test проверяет все 5 publisher JPEG по bytes/SHA/gated reader/expiry.

```sh
pnpm exec vitest run tests/unit/publisher-place-media.test.ts tests/unit/commons-place-media.test.ts tests/unit/place-media-policy.test.ts tests/integration/publisher-media-route.test.ts --maxWorkers=2
pnpm exec eslint tests/unit/publisher-place-media.test.ts
git diff --check -- data/publisher-place-media.json tests/unit/publisher-place-media.test.ts
git check-ignore data/place-media-cache/2d43f7fa56a36fd98059239c52b8c7881893238a5c8e2ee297a2da2a3a9bc19d.jpg data/place-media-cache/fb1d94d1254eb55a1abd921c320b5e58253ca3f2a716ca8ab26829eaf74e21db.jpg
```

Focused tests **48/48 PASS, 4 files, 368ms**. Scoped lint/diff checks также выполнены; ignored assets подтверждены. Полная сборка/E2E/browser/live этим отчётом не приписываются. Нового commit/deploy агент не выполнял.
