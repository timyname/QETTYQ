# A1 · Реальные фотографии заведений, wave 4 · 24 октября 2026

Локально добавлены **Delish и Меруерт**: покрытие **10 → 12 из 749 мест**, теперь **4 Commons + 8 publisher venue photos**. Изображения событий и Commons registry этим этапом не изменялись. Новых платных Google/OpenAI/2GIS вызовов — **0**, новых зависимостей нет. Генерации изображений, добавления/удаления водяных знаков, выдачи иллюстраций за реальные места не было. Commit/deploy выполняет только оркестратор.

## Импортировано и визуально проверено

| Место | Точная цепочка идентификации | Файл |
|---|---|---|
| **Delish**, `osm:node:10248180510` | [Статья](https://sxodim.com/astana/article/po-faktu-vesna-zavedeniya-s-vesennim-vaybom) содержит отдельный heading **Delish**, конкретное изображение и единственный адрес **Туркестан 28А**. [Canonical venue page](https://sxodim.com/astana/place/delish) независимо даёт `LocalBusiness` с тем же именем/адресом и point **51.101298/71.422883**. OSM POI **51.1010935/71.4227958** и publisher point оба входят в фактический адресный [building way915699478](https://www.openstreetmap.org/way/915699478), `addr:street=Түркістан көшесі`, `addr:housenumber=28А` | JPEG **800×1021, 153867 bytes**. SHA256 `49071fa16c1dc6f2229a68e262ea89048e1da3ec18e0a1261a70a9af5e598146` |
| **Меруерт**, `osm:node:4913160607` | [Статья](https://sxodim.com/astana/article/znamenitye-zavedeniya-pravogo-berega) содержит heading **Меруерт**, конкретное изображение и единственный адрес **пр. Республики, 19**. [Canonical venue page](https://sxodim.com/astana/place/meruert) независимо содержит одноимённый `LocalBusiness`, адрес Республики19 и point **51.162923/71.427474**. OSM POI **51.1629057/71.4275426** и publisher point оба входят в фактический [building way158630902](https://www.openstreetmap.org/way/158630902), `addr:street=Республика даңғылы`, `addr:housenumber=19` | JPEG **800×450, 69809 bytes**. SHA256 `bf220e216e7cafdd59821d4d0d303c7cbc4b1b29b05616bcb45e54e951d90934` |

Наблюдаемые street aliases не выдуманы: Delish — «улица Туркестан» из streetway165625144; Меруерт — «проспект Республики» из streetway23979536 существующего address index. В `articleImageEvidence` сохранены буквальные адреса статьи. Root выполняет только ограниченную нормализацию известного road-prefix/пробелов/запятых, без fuzzy/transliteration или замены номера дома. OSM snapshot checkpoint остался **19 октября 2026**, не изменён на дату нынешней проверки.

Геометрия зданий реально извлечена из ранее разрешённого локального `astana-261019-bbox-verified.osm.pbf` существующим osmium Docker image: `--network none`, `--read-only`, `--cap-drop ALL`, `no-new-privileges`, source directory readonly. Ring не строился вокруг нужных точек. В отличие от простого расстояния, проверено точное имя + адрес + фактическое включение обеих точек; 80m rejection gate сохранён.

Оба исходных JPEG скачаны bounded HTTPS curl **без redirects**, проверены SHA256/длина и `sips` native decoding. Каждый затем действительно открыт через `view_image`:

- Delish: реальный интерьер с голубыми стенами, коралловым диваном и столиками; посетители только incidental background. Не категория, не блюдо, не AI.
- Меруерт: исторический фасад здания с рестораном и соседними бизнесами; не утверждается, что это сегодняшний вид или фото отдельного ресторанного интерьера.

Изображения взяты из материалов **2022** и **2021** годов соответственно. Это даты публикаций/источника, а не independently verified shutter dates. Подписи в registry не обещают сегодняшнего внешнего вида, доступности, цены или режима работы. Исходные пропорции сохранены; унифицированный размер карточки отвечает существующий frontend, перекодирования или обрезки JPEG этим этапом не было.

## Права, узкий image path gate и deploy files

Повторно прочитаны [условия Sxodim](https://sxodim.com/polzovatelskoe-soglashenie): некоммерческий сценарий с credit/link. Bounded robots fetch вернул `User-agent: * / Disallow:`; это не отдельная лицензия. В одобренных секциях не обнаружены отдельный чужой фотокредит, водяной знак или запрет; неизвестный фотограф не приписан издателю. Это сохраняет существующий ограниченный pilot review, не утверждает универсальные права на любые найденные фотографии или коммерческое использование.

Root отдельно разрешил **только** `uploads/images/YYYY/MM/DD/optimized/<32hex>_800xauto-q-85.jpg` при валидном `articleImageEvidence` (singleVenueSection, exact section name, один адрес/дом, проверенный street alias, allowlisted article URL). Остальные host/path/MIME/rights/identity/bytes/SHA gates не ослаблены. `sourceUrl` атрибуции ведёт именно на статью с изображением. Общий OG canonical страницы не был использован как фото.

Review/fetch timestamp обоих новых records: **2026-10-24 11:10:45 UTC**. Review expires: **2026-11-23 11:10:45 UTC**. Existing `noncommercial_pilot_only`, monetization=false, credit/link, expiry/revocation/third-party restrictions и gated `no-store` media response сохранены. Изображения не отправлялись в LLM или embeddings.

Два новых private deploy assets, суммарно **223676 bytes**:

```text
data/place-media-cache/49071fa16c1dc6f2229a68e262ea89048e1da3ec18e0a1261a70a9af5e598146.jpg
data/place-media-cache/bf220e216e7cafdd59821d4d0d303c7cbc4b1b29b05616bcb45e54e951d90934.jpg
```

Оба пути подтверждены `git check-ignore`; не добавлять их в публичный Git. Existing importer действительно выполнен для каждого с exact reviewed SHA, `--write`, native raster и source/rights checks. В deploy они должны попасть только через approved manifest.

## Проверены, но не опубликованы

- **Ямайка**: фактический JPEG из той же right-bank статьи скачан и открыт. На нём явный **kipyat.com** watermark. Общие условия другого издателя не подтверждают эти сторонние права. Картинка не опубликована; watermark не удалён, не замаскирован, не объявлен разрешением.
- **Сладкая Сказка**: есть реальный фасад и точный адрес Республики8, но source/catalog points входят в **разные outer rings** наблюдаемого multipolygon relation8660747. Existing shared-building proof хранит один ring; оба points внутри одного ring не подтверждены. Не склеивали геометрию вручную и не расширяли контракт ради покрытия. Возможный следующий этап — корректный explicit multipolygon proof с outer/inner geometry, review и отрицательными тестами.
- **Porta Fortuna**: обнаружен подписанный single-branch legacy JPEG в старой статье о банкетных залах, но фактический image URL вернул **404**. URL не перебирались и картинка другого заведения не подставлялась. Street-name сокращения также требуют отдельного exact alias proof, не угадываются.
- **Тифлисъ**: section address «ул. Иманова10» сокращён относительно наблюдаемого alias «улица Амангельды Иманова»; разрешённая нормализация не отбрасывает имя человека. Не приписывали OSM несуществующий alias и не расширяли matcher. Старые/общие Rafe, Korean House и другие статьи с несколькими филиалами не дают single-branch image proof.
- Старые социальные embeds не скачивались из аккаунтов, права не выводились из публичности страницы. PNG-конверсия/новые форматы/генерация в этот этап не добавлялись.

Исследование ограничено несколькими конкретными article/venue pages по фактическим кандидатам. Все неодобренные JPEG остаются private quarantine и не повышают coverage. Нового автоматического массового crawler этот этап не создаёт.

## Изменённые файлы и проверки

Агент изменил только `data/publisher-place-media.json`, `tests/unit/publisher-place-media.test.ts`, этот отчёт и два ignored JPEG. Core path gate изменён отдельно root; агент core/config/scripts/зависимости не редактировал. Вспомогательные review snippets лежат в ignored `.sites-runtime`, не часть release.

```sh
pnpm exec tsx scripts/import-publisher-place-media.ts --place-id osm:node:10248180510 --file .sites-runtime/delish-wave4-reviewed.jpg --reviewed-sha256 49071fa16c1dc6f2229a68e262ea89048e1da3ec18e0a1261a70a9af5e598146 --write
pnpm exec tsx scripts/import-publisher-place-media.ts --place-id osm:node:4913160607 --file .sites-runtime/meruert-wave4-reviewed.jpg --reviewed-sha256 bf220e216e7cafdd59821d4d0d303c7cbc4b1b29b05616bcb45e54e951d90934 --write
pnpm exec vitest run tests/unit/publisher-place-media.test.ts tests/unit/commons-place-media.test.ts tests/unit/geographic-media-identity.test.ts tests/unit/place-media-policy.test.ts tests/integration/publisher-media-route.test.ts --maxWorkers=2
pnpm exec eslint tests/unit/publisher-place-media.test.ts
git diff --check -- data/publisher-place-media.json tests/unit/publisher-place-media.test.ts
```

Результат **57/57 PASS, 5 files, 281ms**. Новые positive cases проверяют exact Delish/Меруерт и shared polygon; отрицательные — source outside actual boundary, отсутствие article proof, неправильные image path/host/hash filename/query и PNG. Existing tests проверяют actual bytes/SHA/gated reads/expiry всех **8 publisher JPEG**.

Frozen unit clock осознанно изменён **с 24 октября 00:00 UTC на 12:00 UTC**, чтобы проверять фактический новый review timestamp 11:10 UTC, а не подделывать дату свежей проверки под старую fixture. Это не отключение expiry или future-review guards. Scoped lint/diff/ignore checks выполнены. Полный build/E2E/live/deploy проверяет оркестратор; агент их не заявляет прошедшими.

`defuddle` skill прочитан повторно для page extraction; установленного CLI нет, глобальная установка вне задачи. Использован bounded HTTP/JSON-LD/HTML и web reader fallback.
