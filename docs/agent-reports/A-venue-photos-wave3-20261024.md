# A1 · Venue media wave 3 · 24 октября 2026

Этап после 8/749 покрытых мест. Добавлены **два новых места (10/749: 4 Commons + 6 publisher)** — Президентский парк и Якитория — и улучшена фотография уже покрытого Ботанического сада. Ниже импортированные файлы отделены от отклонённых кандидатов. Цель 5–10 новых venue не достигнута: неподтверждённые права/филиалы/фото не подменялись ради числа. Новых Google/OpenAI/2GIS вызовов, зависимостей, биллинга, commit или deploy агент не выполнял.

## Реально импортированные Commons JPEG

| Место | Файл, автор и разрешение | Байт-проверка |
|---|---|---|
| Президентский парк, `osm:way:112177946` — новый покрытый POI | [Astana DSC04106 (7709613510)](https://commons.wikimedia.org/wiki/File:Astana_DSC04106_(7709613510).jpg), jtstewart, [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). Дата фото 30 июля 2012, не сегодняшний вид | `public/assets/places/astana-presidential-park-stream-2012.jpg`, 1280×851, 291820 bytes, SHA256 `3e2afd8f1374a4b31172fa8ab1c62e03969ccd5fd9857cb45592bd2ac7a4698e` |
| Ботанический сад, `osm:way:1196402246` — замена plant close-up на реальный вид места, **не новое покрытие** | [Astana Botanical Garden 20260628 (1)](https://commons.wikimedia.org/wiki/File:Astana_Botanical_Garden_20260628_(1).jpg), Nurken, CC BY-SA 4.0. Пруд/закат 28 июня 2026 | `public/assets/places/astana-botanical-garden-pond-2026.jpg`, 1280×960, 241160 bytes, SHA256 `6b57d874f097991f4396c3f59c894df68e4b880ebab8458645beef42b352cb04` |

Metadata получена из актуального Commons API, для конкретных файлов проверены автор, лицензия, Restrictions (пусто), категории, исходный SHA1, дата съёмки, thumbnail URL. Новые download выполнены bounded HTTPS curl без redirect, native JPEG decode через `sips`, файлы реально открыты `view_image`. Offline importer `scripts/import-place-media.mjs --write` выполнен для обоих, сравнил reviewed SHA/metadata/native raster/identity и скопировал точные байты. Старый публичный `astana-botanical-garden-acalypha-2026.jpg` **не удалялся**.

Президентский парк: наблюдаемый Commons GPS 51.127052/71.456255 лежит **внутри фактического 145-node ring** существующего [OSM way112177946](https://www.openstreetmap.org/way/112177946), взятого из сохранённого city extract от 19 октября 2026. Сохранены exact description, category и именованный OSM polygon; это не nearest-distance совпадение. Thumbnail визуально показывает ручей, деревья, ландшафт; небольшой дальний мост/фон не представлен самостоятельным архитектурным произведением. Title сохранён в credit, как требует лицензия до версии 4.0, ShareAlike указан. Root отдельно добавил известную лицензию CC BY-SA 2.0 в allowlist — идентификационные gates не ослаблены.

Ботанический сад: file page прямо связывает фотографию с Botanical Garden Q104866948; pond/Nurken2026 categories относятся к тому же OSM-linked саду. Agent и root независимо открыли фактический кадр: главным предметом являются пруд, природа, небо; небольшие далёкие городские дома и посетители — incidental background. В rights notes прямо сохранено это узкое основание, не универсальная юридическая гарантия. В предыдущем `A-real-media-enrichment-20261021.md` консервативное замечание о фоне относилось к другому filename `A view of Nur-Sultan's Botanical Garden.jpg`, а не к этому pond2026 JPEG. Не выдаём замену фотографии за рост количества мест. Новые review timestamps не подменяют 19-октябрьский checkpoint источника OSM.

## Publisher проход и ограничения реального покрытия

Ограниченно просмотрены restaurant listings pages 2–15 (только названия/ссылки для discovery) и coffee listings 1–6. Детально прочитаны только выбранные exact-name совпадения текущего каталога, не изображения всех карточек. Это не постоянный crawler. Общие условия [Sxodim](https://sxodim.com/polzovatelskoe-soglashenie) ранее подтверждены для некоммерческого credit/link сценария; source-specific чужие права имеют приоритет.

- У большинства старых detail pages фактическое hero `img`, а не только JSON-LD, — `sxodim_og.png`. Body-page выборочно проверен у Mökki/Korean House: оставшиеся изображения принадлежат соседним Events/recommendations. Они не превращены в фотографии заведений.
- Metis: exact address есть и JPEG скачан для review, но на canonical странице явный credit `kipyat.com`. Не одобрено по разрешению другого издателя.
- Тануки: source address Мангилик Ел55А и реальный image, однако source point **вне** фактического адресного здания way933709310; catalog point внутри. Геометрия реально извлечена existing offline osmium Docker, gate не обходился.
- PAUL: publisher branch Кабанбай Батыра62, но source point и catalog point расходятся примерно на 148m; существующий 80m rejection gate не изменён. Другой PAUL на другом берегу не получил это фото.
- Canele: publisher Сауран34 против catalog Гейдара Алиева2, не склеено по близости. Coffeeday/Coffee Boom — без конкретного source address. Другие найденные single-name совпадения имели generic OG либо не дали подходящего фото. Старые статьи с несколькими филиалами не разрешают разнести один кадр на все филиалы.
- Театр кукол/Астана Балет: canonical Place metadata не содержит подходящего venue photo, Article hero — общий OG. Фотографии спектаклей в рекомендациях не считаются фотографиями театра. Современные фасады Commons не опубликованы без проверки отдельных subject rights.
- Commons Seifullin Museum имеет exact file name, но нет GPS/независимого OSM tag proof в текущем importer; Triathlon Park и Linear Park файлы без GPS и без source tag также не заявлены готовыми. Modern Zhetysu sculptures остаются неразрешёнными, не прикрыты CC лицензией фотографа.

## Конкретные article-body кандидаты, не массовое одобрение

Нахождение общего OG не означает отсутствия real venue image в других **подписанных** материалах. Проверены публичные старые статьи:

- [Террасы до конца лета](https://sxodim.com/astana/article/terrasy-na-kotoryh-nuzhno-uspet-pobyvat-do-kontsa-leta): section «Якитория», actual JPEG с alt «Якитория», явный single-venue address «Место:Туран 21». Скачан/декодирован/открыт: интерьер террасы, не блюдо или логотип. Exact catalog «Якитория», way237347726, адрес Тұран даңғылы21. Source article старый venue link `yakitoriya-2` сейчас 404, но canonical [yakitoriya](https://sxodim.com/astana/place/yakitoriya) живой и даёт тот же адрес и наблюдаемую geo51.143082/71.409858. На первом checkpoint потребовался узкий articleImageEvidence/legacy-JPEG gate root с честной нормализацией bare «Туран 21» к наблюдаемому OSM alias «проспект Туран»; выполненный итог описан ниже.
- Article JPEG для [Багратиони](https://sxodim.com/astana/article/7-gruzinskih-restoranov-astany) скачан/осмотрен: изображён пирог. Не одобрен как фото интерьера/места; для отдельного `real_dish_photo` нужен иной контракт.
- [Итальянская кухня](https://sxodim.com/astana/article/italyanskaya-kuhnya-v-zavedeniyah-astany): конкретный Portofino/Turan27 inline image есть, но формат legacy PNG, не проходит текущий JPEG importer. [9 летников](https://sxodim.com/astana/article/9-letnikov-v-astane) La Belle/Pobedy3 также PNG и неоднозначное catalog naming; не конвертировали и не скрывали несовпадения. DelPapa в одной секции перечисляет три филиала — не branch-specific proof.

Все неподтверждённые фото остались private quarantine, не в `public` или approved registry. Большая найденная страница не означает большую правомерную фотобазу. Следующий проверяемый шаг — принимать заявленные владельцами venue фотографии/branch-specific licensed feeds и расширять безопасный article-body JPEG импорт конкретными проверенными секциями; не снимать ограничения ради численного KPI.

### Якитория: финальный импорт после root JPEG-proof расширения

Описанный выше кандидат **теперь импортирован**, после узкого root изменения resolver: legacy JPEG разрешён только вместе с `articleImageEvidence`, exact normalized caption/одним адресом, флагом singleVenueSection=true, allowlisted article URL, unchanged canonical identity/80m rejection. Root нормализует только NFKC/case/пробелы/запятые и известные RU road-prefixes, не transliteration/fuzzy-match.

Происхождение полей разделено: `sourceName=Якитория` буквально из heading статьи (canonical название написано латиницей Yakitoriya — мы не объявляем его кириллическим); sourceAddress/geo взяты из canonical LocalBusiness; независимый catalog name/address/alias — существующий OSM way237347726 и streetway23984063. В proof сохранён literal `sourceArticleAddress="Туран 21"`, а `sourceStreetAlias="проспект Туран"` является реально наблюдаемым OSM alias. Bare «Туран» **не** внесён как якобы наблюдаемый OSM alias.

Source JPEG: `https://sxodim.com/uploads/astana/2018/07/a2019632-79fb-4ebb-849e-34a2516d1359-745x497.jpg`.

Private deploy file: `data/place-media-cache/51798fc98fa8f03eafc369c73ea02871090ca63521cf78fdda58a0a668cc6ec1.jpg`, **745×497, 98605 bytes**, SHA256 `51798fc98fa8f03eafc369c73ea02871090ca63521cf78fdda58a0a668cc6ec1`. Binary ignored, не добавлять в публичный Git. Existing offline publisher importer выполнен и проверил bytes/SHA/native decode. Исходник не конвертирован/обрезан/ретуширован.

Права: существующее Sxodim noncommercial/credit/link основание, отдельный чужой credit/запрет в этой article section не обнаружен; неизвестный фотограф не приписан publisher. Историческая статья **31 июля 2018**, не сегодняшний интерьер. Review/fetch **2026-10-23 23:53:46 UTC**, expiry **2026-11-22 23:53:46 UTC**. No-store/expiry/revoke/commercial gates сохранены. Resolver credit sourceUrl ведёт именно в article, которая содержит фотографию, а не только в canonical venue page.

## Проверки

```sh
node scripts/import-place-media.mjs --place-id osm:way:112177946 --metadata .sites-runtime/venue-wave3-presidential.json --file .sites-runtime/presidential-stream-2012-review.jpg --write
node scripts/import-place-media.mjs --place-id osm:way:1196402246 --metadata .sites-runtime/venue-wave3-botanical-pond.json --file .sites-runtime/botanical-pond-wave3-reviewed.jpg --write
pnpm exec vitest run tests/unit/commons-place-media.test.ts tests/unit/geographic-media-identity.test.ts tests/unit/publisher-place-media.test.ts tests/unit/place-media-policy.test.ts tests/integration/publisher-media-route.test.ts --maxWorkers=2
pnpm exec eslint tests/unit/commons-place-media.test.ts
git diff --check -- data/place-media.json tests/unit/commons-place-media.test.ts
pnpm exec tsx scripts/import-publisher-place-media.ts --place-id osm:way:237347726 --file .sites-runtime/yakitoriya-terrace-review.jpg --reviewed-sha256 51798fc98fa8f03eafc369c73ea02871090ca63521cf78fdda58a0a668cc6ec1 --write
pnpm exec eslint tests/unit/commons-place-media.test.ts tests/unit/publisher-place-media.test.ts
```

Предыдущий Commons checkpoint **52/52 PASS, 5 files, 576ms**; финальный focused набор после Yakitoriya **54/54 PASS, 5 files, 530ms**, scoped lint и diff-check PASS. Добавлен regression test PresidentialPark source GPS outside actual polygon → none, strict CC2/title attribution; botanical exact pond/date проверяется вместо прежнего plant close-up. Yakitoriya tests отказывают без article proof, с чужим доменом/местом вместо article URL, неверными street/house/caption, несколькими адресами, singleVenue=false и PNG. Полные E2E/live/deploy выполняет root, агент не приписывает их этому отчёту.

`defuddle` skill прочитан повторно: CLI отсутствует, глобальная установка вне задачи; fallback — bounded HTTP/JSON-LD/HTML source и web reader. Секреты, OAuth, платные API, remote SSH этим этапом не использовались.
