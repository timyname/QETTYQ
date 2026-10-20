# Event media: права, выдача и хранение

Проверено 20 октября 2026. Scope: ingestion media policy, server resolver, `/api/events`, unit tests. Frontend и публичный deployment выполняет оркестратор.

## Почему настоящие афиши не показывались

`LiveAstanaEvent.image` намеренно равен `null`: адаптер импортирует факты о событиях, но не копирует фотографии. Это не ошибка загрузки браузера. На странице [лекции Дархана Жагипарова](https://sxodim.com/astana/event/lekciya-darhana-zhagiparova-v-nergy-creative-hub-cherez-toi-k-apple) найден URL в `schema.org/Event.image`. Наличие URL не подтверждает право копировать, хранить или показывать изображение.

[Условия Sxodim](https://sxodim.com/polzovatelskoe-soglashenie) разрешают некоммерческое использование материалов с указанием автора и ссылкой. Однако при текущей проверке не установлено отдельное авторство/разрешение для каждой сторонней фотографии или афиши. Статус конкретных poster rights поэтому `unknown`, а не `licensed`. Это консервативное решение проекта, не заключение о том, что использование всех изображений сайта юридически запрещено. Для коммерческого запуска нужна отдельная проверка условий и согласований.

В рамках этой задачи изображения источника не скачивались и не хотлинковались. Текстовый credit «Давай Сходим» с ссылкой на страницу события сохраняется. API не отдаёт приватные evidence references и candidate image URLs.

## Что реализовано

- `data/media-policy.json`: отдельно от фактов событий хранит publisher policy, требования к подтверждению прав организатора и allowlist собственных иллюстраций. Сейчас `approvedOrganizerMedia` пуст; разрешённых афиш организаторов ещё нет.
- `extractSxodimMediaCandidates()`: извлекает максимум четыре URL-кандидата из уже полученного HTML совпадающей страницы Event. Только ограниченный same-origin raster path; `rights:unknown`, `displayAllowed:false`, `downloadAllowed:false`. Это административные метаданные, не команда скачать файл.
- Необязательный `onMediaCandidates` в refresh-адаптере: можно подключить административное сохранение метаданных без нового сетевого запроса. По умолчанию hook отсутствует: кандидаты нигде не сохраняются и не входят в публичный DTO/cache. Ошибка административного hook не удаляет корректные факты события.
- `resolveEventMedia()`: детерминированно предлагает одобренную локальную афишу организатора, иначе подходящую собственную иллюстрацию категории, иначе `none`. Прямые remote URL не выдаются.
- `/api/events`: добавляет `media` только в копию каждого response item. `image:null`, факты, provenance, freshness и raw event cache остаются без изменений. Неизвестные или несопоставленные категории не получают случайную картинку.
- Allowlist собственных изображений сверяется с существующим `public/assets/ideas/manifest.json`, не только с формой имени файла. Это генеративные иллюстрации предпочтений, не реальные афиши, места или свидетельство фактов.

## Публичный контракт для UI

Все варианты `items[].media` включают `kind`, `src`, `alt`, `label`, `notice`, `credit`, `fit`:

```ts
type EventMediaPlan =
  | { kind: 'organizer_poster'; src: string; alt: string;
      label: string; notice: string | null; credit: string | null; fit: 'contain' }
  | { kind: 'category_illustration'; src: string; alt: string;
      label: string; notice: string; credit: null; fit: 'cover' }
  | { kind: 'none'; src: null; alt: string;
      label: string; notice: string; credit: null; fit: null;
      reason: 'no_approved_media' };
```

Афиша: label «Афиша организатора», `contain`, credit если требуется. Иллюстрация: label «Иллюстрация категории», notice «Иллюстрация категории, не афиша мероприятия», `cover`. UI должен показать эту маркировку, не представлять картинку как фотографию события. `none`: label «Без афиши»; используйте типографику/нейтральную заглушку, без ложного poster image. Публичный DTO не содержит grantReference/rightsHolder record/candidate URL. Серверный resolver не импортируется в клиент.

Для текущего snapshot театральные постановки, вечеринка и концерт получают подходящие маркированные иллюстрации; бизнес, образование и standup остаются без афиши. Это не обещание, что все будущие категории автоматически сопоставятся.

## Будущая афиша организатора

Подготовлен policy gate, но binary upload endpoint, права-проверяющий сервис и объектное хранилище **не реализованы**. Добавлять запись в registry можно только после независимой проверки:

1. Точное событие/страница источника привязаны к файлу.
2. Проверен правообладатель; ссылка на согласие хранится административно, не в публичном ответе.
3. Есть разрешения хранить, публично показывать и распространять файл текущим workflow публичного проекта. Если разрешение не включает открытый repository/archive, нужен приватный media storage с отдельным контрактом, а не коммит файла в Git.
4. Файл реально загружен, MIME/размеры/SHA-256 проверены вне resolver. Resolver доверяет проверенной записи, не заявляет, что сам сканирует файл. Разрешены только локальные raster paths `/assets/event-posters/...`, без SVG и remote URL.
5. Review state approved, срок не истёк, отзыв отсутствует. Pending/revoked/expired/missing permission/невалидный file record дают безопасный fallback.

## Где на самом деле находятся данные

- Реальные факты приходят по HTTPS из разрешённых публичных HTML/JSON-LD. Runtime не пишет полные страницы на диск.
- Module cache — временная память одного Worker isolate/process. Не постоянная база и не общий межрегиональный rate limiter.
- Если доступен Cloudflare Cache API, last-good payload сохраняется в edge-local cache до 24 часов, но свежесть фактов ограничена одним часом. Проверка/refresh происходят по запросу. Кэш не гарантированно долговечен и не глобально синхронен. См. [официальную документацию Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).
- `data/livedata/sxodim-astana-2026-10-20.json` — датированный snapshot в локальном проекте и bundled read-only fallback после сборки, не автоматически растущая база. Provider failure сохраняет `snapshot/stale`; policy change блокирует повторную выдачу fallback.
- `data/media-policy.json` — реестр политики/одобренных записей. Не хранилище binary files.
- `public/assets/ideas/*.jpg` — существующие project-generated изображения, поставляемые asset bundle. Здесь не лежат скачанные афиши Sxodim.
- Долговременный DB/object storage и media upload service этой задачей не создавались. Память предпочтений пользователя в браузере — отдельный контур и не event cache.

## Выполненные проверки

```sh
env PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run tests/unit/live-events.test.ts tests/unit/ingestion-pilot.test.ts
env PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/tsc --noEmit --pretty false
env PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/eslint src/server/ingestion/sxodim-live.ts src/server/ingestion/live-events.ts src/app/api/events/route.ts tests/unit/live-events.test.ts
```

Результат: **66 tests PASS** (46 live/media, 20 generic ingestion), TypeScript PASS, targeted ESLint PASS. Медиа-тесты используют явно synthetic fixtures, внешние изображения не запрашивают. Покрыты unknown rights, отказ remote/SVG/query/credentials, лимиты discovery, отсутствие public leakage, approved/pending/revoked/expired/missing permission, несуществующая illustration запись, сохранение null image/raw cache, безопасный API response, недоступный источник и stale fallback.

Следующий проверяемый шаг оркестратора: синхронизировать server adapter, API route, registry и manifest в Site; показать маркировку media в UI; проверить итоговый публичный API/asset URLs. Деплой этим отчётом не подтверждается.
