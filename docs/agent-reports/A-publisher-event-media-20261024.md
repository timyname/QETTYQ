# A1/A2 · Реальные изображения афиши: рабочий scoped importer

Дата: 24 октября 2026 по времени проекта (проверки/импорт 23 октября около 19:06 UTC). Этот этап **заменяет прежнее решение от 21 октября о всеобщем запрете Sxodim posters**: повторная проверка явного разрешения издателя показала применимый ограниченный публичный noncommercial scope. Это не разрешение «всё из интернета» и не индивидуальное письмо от организатора.

## Условия и границы

Прямые свежие HTTP200: [условия Sxodim](https://sxodim.com/polzovatelskoe-soglashenie), [robots.txt](https://sxodim.com/robots.txt). Первая содержательная строка условий прямо разрешает использовать материалы сайта некоммерчески с указанием издателя и ссылкой. Это именно широкое `материалы`, а не отдельная лицензия только на даты/названия. Robots содержит `User-agent: *` и пустой `Disallow:`. Robots не считается лицензией; разрешение взято из условий. Полный текст условий не копируется в репозиторий.

Root согласовал отдельный контракт `publisher_poster`, чтобы не заявлять ложное «предоставлено организатором с индивидуальным разрешением». Основание сохраняется явно: `publisher_public_noncommercial_permission_with_credit_and_link`. Фото/автор произведения отдельно неизвестны, поле author=null; издатель `Давай Сходим`, исходная страница и terms остаются в DTO. Известные сторонние запреты перекрывают publisher scope. Перед монетизацией этот registry необходимо отключить/пересогласовать; прав коммерческого использования не добавлено. Эти изображения не используются в embeddings/RAG/LLM. Лицензирование текстовых фактов/LLM permissions источников не менялось.

Defuddle skill прочитан. CLI отсутствует; глобальная установка не делалась. Для точной проверки metadata/условий использован публичный HTTP и web reader; scripts страницы не исполнялись.

## Реальный результат

Скачаны и опубликованы **в private server asset storage, не в public/** десять настоящих изображений из точных `schema.org/Event.image` текущих публичных detail страниц. Это publisher banner/poster, не якобы фото заведения. Они не генерировались проектом; сам издатель может использовать иллюстрацию/коллаж, происхождение которых нельзя называть гарантированно «не AI». Каждое изображение просмотрено native viewer, декодировано sips, размер/тип/байты/SHA проверены.

| Событие / источник | Размер | Байты | SHA256 / файл в `data/event-media-cache/` |
|---|---|---|---|
| [«Мама!» спектаклі](https://sxodim.com/astana/event/mama-spektakli) | 1522×570 | 82 124 | `d4a9b4fda7bb69db547d51d2e1c52e28003641d695bccd4c76e3032b58d3f10f.jpg` |
| [«Өліара» спектаклі](https://sxodim.com/astana/event/liara-spektakli) | 1522×570 | 141 327 | `8eb2dda68747e68cfedf04f294ccd3feaca2e7b1cef52029d15a8fa2bdf28b41.jpg` |
| [Шоу «Комики решают проблемы»](https://sxodim.com/astana/event/shou-komiki-reshayut-problemy-v-astane) | 1522×570 | 87 011 | `c44e8efe94de4c1c8fea552f170499ba585768e0e61801e57eef84148fbed984.jpg` |

Дополнительно одобрены текущие upcoming события: Cinema Sketch Club, Эйнштейн Party Quiz, Квиз криминальный #2, Квиз100 вопросов #4, Юрий Приходько (все 24 октября), трибьют «Звери» 25 октября, Cancel culture30 октября. Три строки выше относятся к upcoming29 октября/7 ноября; старое событие Монгол зураг21 октября не использовалось. Все10 точных source URLs, source image URLs, SHA/размеры находятся в registry.

Итог: **1 275 793 B**, **10** точных publisher media records, все1522×570. URL бинарника взят только из того же exact Event.url и same-origin `/uploads/posts/` в публичном HTML. Полноразмерный путь/фотохосты не угадывались. Байты publisher served JPEG не редактировались; настоящая дата события не сдвигалась.

## Реализация

- `data/publisher-event-media.json`: отдельный noncommercial-only registry, enabled=true, monetizationEnabled=false, источник/изображение/авторство unknown/rights basis/размер/SHA/visual review/status/expiry. Отключение enabled или включение monetizationEnabled закрывает весь lane. Reviews действуют до **22 ноября 2026**; конкретная дата у каждой записи. Это техническое ревью, не утверждение, что лицензия юридически истекает через месяц.
- `src/server/media/publisher-event-media.ts`: чистый worker-compatible resolver для exact event → `publisher_poster`, безопасный `/api/media/events/<64hexSHA>`; нет static URL, hotlink или угадывания чужой картинки. Node-only `readPublisherEventImage(id, now?)` отдельно в `src/server/media/publisher-event-files.ts` повторно проверяет разрешение, revocation/expiry, загружает только совпадающий private hash file, сверяет байты/SHA. Возвращает `{bytes,mime,etag}` либо null. Root интегрирует route, privacy/cache headers и source link в UI.
- `src/server/ingestion/sxodim-live.ts`: минимально расширен union и вызов scoped resolver перед fallback. `LiveAstanaEvent.image=null`, source facts и существующий факт `mediaCopied=false` фактологического adapter snapshot не менялись; медиа отдельно в контролируемом registry, не незаметно скопировано fact parser.
- `data/media-policy.json`: у конкретного Sxodim publisher описан явный limited scope и отдельный registry; `autoDownload=false`, remote hotlink=false. Остальные издатели/organizer grants не изменялись.
- `scripts/import-publisher-event-media.ts`: ручной bounded двухфазный процесс. Phase1 `--page EXACT_EVENT_URL`: проверяет robots + точную permission clause, читает одну detail страницу ≤512 KB, один exact Event.image JPEG ≤3 MB с timeout15s/no redirects/no retry bypass; native decode до3000px; пишет ignored review manifest+JPEG. Phase2 `--publish-reviewed JSON --reviewed-sha256 HASH`: вновь проверяет terms/robots, принимает только просмотренные exact bytes, upsert по exact event URL, хранит в private data/event-media-cache. Concurrent import lock предотвращает потерю чужого одобрения. Нет ключей/платных сервисов. Для других событий повторяется тот же проверяемый путь, не бесконтрольный массовый scraper.

Пример воспроизведения:

```sh
pnpm exec tsx scripts/import-publisher-event-media.ts --page https://sxodim.com/astana/event/mama-spektakli
# Открыть выданный private JPEG и сверить banner/источник.
pnpm exec tsx scripts/import-publisher-event-media.ts --publish-reviewed .sites-runtime/publisher-media-review/d4a9b4fda7bb69db547d51d2e1c52e28003641d695bccd4c76e3032b58d3f10f.json --reviewed-sha256 d4a9b4fda7bb69db547d51d2e1c52e28003641d695bccd4c76e3032b58d3f10f
```

Root обязан включить private data/event-media-cache в tracing/runtime image, сделать `/api/media/events/[id]` с no-store и source-credit UI. Пока root не подтвердит production endpoint, этот отчёт не объявляет production картинки уже проверенными.

## Заведения: честная граница

У «Арарат» и Life fitness пока нет точного лицензированного снимка/разрешения в исходном OSM registry. Нельзя подставлять одноимённый другой филиал, Google Photos на2GIS карту или случайную фотографию категории. Два существующих Commons фото botanical/museum сохранены, их attribution/лицензии не ослаблены.

**Добавлен третий POI: Парк влюблённых, OSM way37884583.** Файл [ASTANA love park2005](https://commons.wikimedia.org/wiki/File:ASTANA_love_park_2005.JPG), автор Sofi Kan, CC BY-SA3.0, own work, photographer license/restrictions проверены свежим Commons imageinfo. Исходный GPS51.131054/71.410811 попадает внутрь реального polygon этого OSM way из исходного GeoJSON, filename/description указывают парк между Turan/Kabanbay. Это отдельный честный метод reviewed_geographic_match, не притворный wikimedia_commons тег OSM. Importer сверяет raw observed polygon, имя/переводы места, GPS и описание из свежего file metadata; resolver проверяет actual polygon inclusion, а tests отвергают соседние точки вне парка, отсутствующий GPS и подмену source page.

JPEG `/assets/places/astana-lovers-park-2005.jpg`:1280×960,299573B, SHA256`7aeb7a0609ea39f99371af1660dd30c76179f950093a25961365116d4dc77d4e`. Открыт и просмотрен: зелёные насаждения/дорожки/клумбы, не современное архитектурное здание/скульптура как основной предмет; случайные дальние здания не являются предметом снимка. **Исторический вид25 июля2005 года**, явно указан в ALT/registry; не нынешнее состояние парка. После изменения размера сохраняется credit/ShareAlike и описание изменений. Нельзя продавать его как сегодняшнее фото.

Triathlon Park photo2019 действительно показывает деревья/дорожку, но не содержит observed GPS: **не опубликовано** по строгому geographic-match правилу. У8 Central Park файлов одни и те же координаты; автоматическая exact binding не одобрена. Новое покрытие: **10 event banners +3 POI photos**, не все749 мест. Для ресторанов следующий источник — конкретный владелец/организатор с точным адресом и media scope либо точный Commons файл с проверяемой лицензией. Соцсети/логины/платный Google не использованы.

## Проверки

Выполнены native review10 publisher JPEG + нового Commons JPEG, image size+SHA,10 реальных publisher importer approvals и1 Commons import, повторные terms/robots gates; не делались Google/OpenAI/2GIS API вызовы или письма. Фактически прошли **103/103 unit tests в5файлах**, scoped ESLint и full typecheck. Тесты покрывают exact identity, source path restrictions, scope, hash/path mismatch, malformed metadata, known third-party restriction, expiry/revocation, реальные bytes/read helper, no forever-public paths и отрицательные geographic identity cases. Сравнение реальных файлов в unit проверяет длину и SHA256 вместо дорогого deep-diff буфера; целостность не ослаблена. Исторический Commons fixture clock обновлён с21 на24октября, чтобы включать новый действительно проверенный24октября record; frozen21Oct eventfact tests не менялись.
