# A1 · Дополнение реальных изображений афиши

Дата проекта: 24 октября 2026. Этап после `fbe5923`. Это **локально импортированные и проверенные** изображения; production/deploy проверяет оркестратор отдельно.

## Результат

Реестр publisher event media расширен **10 → 16** exact event records: закрыты все шесть карточек без афиши из фактически полученного production `/api/events` (16 событий, fetchedAt `2026-10-23T21:20:04.065Z`). Это не обещание полного покрытия городской афиши и не автоматическое разрешение на любую новую картинку.

Сохранены **857 683 байта** в ignored `data/event-media-cache/`. Все шесть — оригинальные JPEG издателя **1522×570**, без редактирования или перекодирования QETTYQ. Каждое изображение декодировано `sips`, открыто и осмотрено через native image viewer, затем опубликовано существующим двухфазным importer с явным reviewed SHA256.

| Exact event page | SHA256 | Байты | Визуально наблюдаемое содержание |
|---|---|---:|---|
| [Qargyn](https://sxodim.com/astana/event/qargyn-o-yrmandar-klubyny-kezdesui-1) | `eab0d02def329ef6a8ab8552db22b0e0b6d335c5bbaa7c3017db851f7d96341a` | 109079 | Издательский коллаж с четырьмя портретами на синем фоне |
| [Uly Dala Fest](https://sxodim.com/astana/event/uly-dala-fest) | `d275c5080433f5685bc177547334a637a64bfc91df53e91f1e99e75f1adc1746` | 154426 | Афиша с исполнителями, названием фестиваля и датой 31 октября 2026 |
| [Dizngo carnival](https://sxodim.com/astana/event/vecherinka-dizngo-carnival) | `04cc1c2f6e0112ce696f7b76987d76bfaad74a4120cf040c3078d85b7170e98b` | 235587 | Графический carnival banner, не фотография заведения |
| [Nirvana / The Ronins](https://sxodim.com/astana/event/tribyut-ot-the-ronins-nirvana-unplugged) | `6aa541976fad455ecf6da88916b3eb9cdea3874866cdaeb20ac6579fcbac3f3b` | 135302 | Издательский коллаж с музыкантами; не доказательство присутствия оригинального исполнителя |
| [«Счастливые Поют»](https://sxodim.com/astana/event/muzykalnyy-spektakl-schastlivye-poyut-v-astane) | `827edc8a07216a8fee59b2a2ef4593dcc05006df4826f1ced4122e0664e86d52` | 53072 | Промоизображение двух исполнителей на красном фоне |
| [IntroVert](https://sxodim.com/astana/event/solnyy-koncert-introvert-v-astane) | `79b54785b4b886e43a701d886b2787c9b333d05e013609093cf0f86809116b8c` | 170217 | Издательский banner с названием и архивным детским портретом |

Это **изображения из афиши**, не гарантированные фотографии состоявшихся мероприятий. Авторство отдельных фотографий/коллажей остаётся неизвестным; `author=null`. Изображение не доказывает цену, наличие билетов, возрастной допуск или внешний вид текущей площадки.

## Права и границы

Перепроверены публичные [условия издателя](https://sxodim.com/polzovatelskoe-soglashenie) и robots через существующий importer на каждой фазе. Применено уже реализованное ограниченное основание `publisher_public_noncommercial_permission_with_credit_and_link`: только некоммерческий пилот, source/terms attribution, gated API paths, отзыв/expiry/commercial switch. Нового разрешения организатора или фотографа не выдумано. Не было переноса Google photo, социальных логинов, обхода ограничений или обращения к платным провайдерам. Изображения не отправлялись в LLM/embeddings.

Skill `defuddle` прочитан; CLI отсутствует, глобальная установка не делалась. Для точных публичных metadata использован bounded HTTP existing importer и web-reader. Внешний HTML не исполнялся.

## Проверенные кандидаты заведений — пока не опубликованы

Из реально обнаруженных ссылок в списках ресторанов/кофеен Sxodim рассмотрены следующие кандидаты. Фото не подставляется только потому, что название похоже или точка близко:

- [TLP Flowers & Coffee](https://sxodim.com/astana/place/tlp-flowers-coffee): имя совпадает с `osm:node:11290690869`, source point близок, но издатель указывает **улица Сауран,17**, каталог — **улица Гейдара Алиева,1**. Независимое доказательство переименования/общего адресного здания на этом этапе не получено. Нужна отдельная адресная проверка, близость не считается доказательством.
- [Rafe coffee & food](https://sxodim.com/astana/place/rafe-coffee-food): exact LocalBusiness.image — общий `sxodim_og.png`, не фотография кафе; каталог содержит несколько Rafe без адресов. Не используется.
- [TARY](https://sxodim.com/astana/place/etno-kofeynya-tary): источник указывает Мангилик Ел,41/1, catalog Tary не имеет наблюдаемого адреса; proximity примерно75м недостаточен. Не используется.
- Арарат и Life fitness: прежние неопределённость адреса/конфликт филиала не разрешены; прежние placeholder сохраняются.

Итог POI остаётся **5/749**, из них3 Commons и2 publisher restaurant photos. Реестры мест и правила exact identity не ослаблены ради числа картинок.

## Изменения и проверка

Изменён только `data/publisher-event-media.json` существующим importer; добавлены шесть ignored JPEG/review manifests и этот отчёт. Source code, common schemas, корневые конфиги, tests, Git, deploy и `sxodim-live.ts` не изменены этим агентом.

Фактически выполнено:

```sh
pnpm exec tsx scripts/import-publisher-event-media.ts --page EXACT_EVENT_URL
# Для каждого из6 download: native sips и view_image.
pnpm exec tsx scripts/import-publisher-event-media.ts --publish-reviewed .sites-runtime/publisher-media-review/SHA.json --reviewed-sha256 SHA
pnpm exec vitest run tests/unit/publisher-event-media.test.ts tests/integration/publisher-media-route.test.ts --maxWorkers=2
```

Последняя команда **PASS:16 tests /2 files**, включая обход всех16 реальных registry files с проверкой длины, SHA, resolver и повторной проверки expiry при чтении. Остальные browser/full-suite/deploy проверки не приписываются этому этапу.
