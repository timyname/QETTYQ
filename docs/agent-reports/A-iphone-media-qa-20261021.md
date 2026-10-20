# A8 — независимый мобильный UX / media QA, 2026-10-21

## Граница проверки

Проверен фактически используемый мобильный entrypoint `mobile/src/main.tsx`: он
монтирует общий `src/components/PilotApp.tsx`. `mobile/src/App.tsx` не является
текущим интерфейсом приложения, поэтому его старые экраны не учитывались.
Первоначально изменены два новых тестовых файла и этот отчёт; в последующих
разрешённых задачах добавлен один API-тест и обновлены шесть существующих E2E-файлов
по дополнительному разрешению orchestrator (актуализация chat selectors и
relocated settings assertions). Mobile/Swift/UI, конфиги,
ключи, деплой и другие проекты не изменялись.

Прочитаны требования PRD, включая §§1, 5, 11, 12, 14, 16, и Playwright skill.
Настоящий тестовый браузер — установленный Chromium через Playwright. Проверены
два entrypoint: актуальный Vite mobile на отдельном `127.0.0.1:4176` и общий
PilotApp в Next.js на `127.0.0.1:3037`. Это разные прогоны, не физическая установка.
Существующий preview `4174`, Xcode и физическое устройство не управлялись.

Это **не** физический прогон iPhone и **не** Safari/WKWebView: установленный
Playwright WebKit отсутствует. Не выполнялась установка браузеров или зависимостей.
Размер 430×932 и native CSS safe-area 58/62 px заданы явно как синтетический fixture;
landscape — 932×430, верх 0, низ 21, боковые поля 59 px. Реальные значения устройства
могут отличаться. Native Dynamic Type, клавиатура iOS, разрешения iOS и системный
share sheet требуют отдельного устройства/WKWebView-прогона.

## Изоляция сетевых и платных действий

Все `/api/*` перехвачены **до** navigation. Любой неизвестный API возвращает fixture
503. Все внешние URL блокируются; исключение — один явно заданный синтетический
Google-image URL, на который тест возвращает локальный однопиксельный PNG. Ни
Google Places/Photos, ни AI, ни routing, ни ingestion не вызываются. Локальные
действия приложения не могли попасть через Vite proxy в production.

Каталог в fixture — существующие реальные OSM-записи приложения; их происхождение
не заменено выдуманными заведениями. Ответы чата — локальный deterministic код.
Google-карточка помечена `SYNTHETIC QA` и существует только в тесте, не в seed/API.
GPS-отказ тоже синтетический. Он не доказывает получение координат на устройстве.

## Результаты

- `tests/e2e/iphone-glass-media.spec.ts`: финальный единый прогон на актуальном
  mobile entrypoint/new chat JSX + CSS — **12/12 PASS (12.4s)**, 02:41 local.
  Более ранние 8-case и отдельные targeted-прогоны не подменяют этот результат.
- Повтор того же 12-case набора на Next.js `3037`: **12/12 PASS (8.9s)** после
  явного ожидания visualViewport layout frame. Проверка размера input ≤560 не
  ослаблялась. Audit touch targets ограничен `[data-screen] button`: dev toolbar
  Next.js находится вне приложения и не является кнопкой QETTYQ.
- `tests/unit/place-media-policy.test.ts`: **20/20 PASS**.
- `tsc --noEmit`: **PASS** после исправления типа нового audit-кода:
  `instanceof HTMLButtonElement` перед `.disabled` (без `any`). Ранний PASS был
  до добавления этого audit; после замечания владельца UI проверка повторена.
- ESLint двух новых и двух разрешённых существующих E2E-файлов: **PASS**.

Проверенные сценарии:

1. Выбор русского языка → welcome → все 15 свайпов → undo → условия → лента.
   Карточка занимает всю ширину 430 px; верхний control находится ниже safe top.
2. GPS denial → понятное сообщение → ручной выбор старта → отмена → прежние условия.
   В фактическом chat payload `origin: null`, выдуманной позиции нет.
3. Лента → карточка → план → карта → чат → отправка → профиль → настройки → логотип
   возвращает на главную. Composer расположен над dock, а не под ним.
4. Native safe top применяется один раз: header начинается на 58 px, не на 116 px.
   Проверенные targets города, фильтров, rail, send и четырёх dock tabs ≥44 px.
   Lime highlight dock имеет высоту ≥44 px, не превращается в линию.
5. Увеличенный текст (fixture 125%, ключевые controls/text 18 px), reduced motion,
   portrait/landscape: нет горизонтального document overflow, настройки достижимы
   внутренней прокруткой. Это не эквивалент настоящему iOS Dynamic Type.
6. Новый согласованный контракт: AI/Google по умолчанию включены в настройках,
   но до первого сообщения показано disclosure запроса/геопозиции/отдельной памяти;
   Google/AI request flags отсутствуют до сообщения. В mock-ответе доступны источник
   и автор фото; `img error` убирает только фото. Settings opt-out очищает Google
   results. Google-фото/заведение не появляются на OSM-карте. Никаких реальных
   provider-запросов. Такой UI-контракт не означает разрешение серверной памяти.
7. План: portrait/landscape, раскрытый/свёрнутый sheet; внешняя навигация достижима
   прокруткой, основной CTA ≥44 px и после исправления расположен выше dock.
   Неизвестные цена, дорожное расстояние и ETA остаются неизвестными.
8. Проверены все видимые включённые кнопки welcome/swipe/conditions/feed/chat/
   profile/settings: ≥44×44 px. Намеренно CSS-clipped screen-reader/keyboard
   альтернативы свайпа не считаются видимыми touch buttons и не удалены из UI.
9. Лента является полноэкранным внутренним scroller. При scroll240 header/dock
   остаются на месте, `window.scrollY=0`, blur включён, city text тёмно-зелёный,
   не синий/белый. При максимальной пользовательской прокрутке последняя кнопка
   достижима над dock. Save-banner расположен ниже header и проходит hit-test.
10. Отдельный synthetic street-route fixture: GPS явно синтетический; до согласия
    provider POST не выполняется; после одного согласия один mock POST. При
    safe58/62 и раскрытом плане обязательная FOSSGIS/fix-map attribution действительно
    не накрыта sheet (проверка `elementFromPoint`). Это не реальная дорожная линия.
11. Disclosure → настройки → явный opt-out AI/Google → два сообщения о свидании.
    В обоих payload flags false, во втором есть предыдущая user/assistant history,
    JSON ≤14 KiB. После reload настройки false и диалог восстановлены. Серверная
    memory не создавалась: ни одного non-GET `/api/memory*`, все четыре scopes false.
    Это проверка UI/transport, не доказательство live AI понимания даты свидания.
12. Composer и dock находятся в едином glass panel. При синтетическом
    `visualViewport.height=560`, resize event и неизменном layout932 dock скрыт,
    input остаётся ≤560 px и доступен для ввода. Скриншот содержит пустую нижнюю
    область, не изображение клавиатуры. Реальная клавиатура WKWebView не проверялась.

## Найденные дефекты и ретест

### Исправлены владельцами кода, независимо перепроверены

- **P1:** раскрытый план при 932×430/низ21 размещал `Начать маршрут` под dock:
  низ CTA 388.5 px при верхе dock 319 px. UI-владелец исправил short-height sheet
  и sticky actions. После исправления CTA до 270 px при dock 319 px; 7-й тест PASS.
- **P2:** broad native selector для `dock` затрагивал `dockHighlight`, превращая
  выделение активной вкладки в тонкую линию. UI-владелец уточнил селектор;
  geometry ≥44 px и скриншоты подтверждают полноценную lime-плашку.
- **P1:** sticky actions в коротком landscape накрывали summary даже после reset
  scrollTop. Усиленный hit-test оставался красным до нового split-layout:
  карта/заголовок слева, sheet справа, static collapsed actions. После исправления
  heading действительно не накрыт, facts/handle/CTA видимы; 8/8 PASS.
- **P1:** Save-banner оказался на y58 поверх header58..130 из-за специфичности
  старого `.app:not(...)>.notice` правила. UI-владелец исключил feed из этого
  generic rule. Повторный screenshot + geometry/hit-test подтверждают banner
  ниже header. Не ослаблялась проверка и не удалялось уведомление.
- Root устранил native `height:100%!important`, которое могло перекрывать inline
  visualViewport height. Синтетическая keyboard-проверка на фактическом mobile
  entrypoint подтверждает удержание input выше границы560. Реальный девайс — отдельно.
- Media resolver: truthy строки вместо boolean permissions; malformed identity
  или license поля вызывали исключения; URL `https://` и loopback proof принимались.
  Media-владелец исправил strict flags/проверки типов/URL. Независимые 20 тестов
  проходят, в том числе неизвестные/отозванные права, чужой OSM identity,
  истёкший review, невалидные proof URL, remote/traversal/SVG paths.

### Фото-fallback: замечание code inspection и последующее уточнение

Root убрал hero-текст «Фото места» и сделал fallback label видимым даже при
`label=false` после image error; у mini тоже единая state-aware подпись.
`CatalogPhotoCredit` остаётся ссылкой/атрибуцией исходной записи, но иллюстрация
теперь явно подписана. Это повторная проверка кода, не отдельный браузерный
regression-тест локального Commons image failure; Google image failure проверен.

## Визуальные доказательства

Все пути относительно репозитория, PNG фактически открыты и проверены глазами:
Снимки с общими именами после финального Next-retake перезаписаны Next.js-версией;
их нельзя выдавать за новые скриншоты Vite/native/WKWebView.

- `output/playwright/iphone-glass-media/welcome-430.png`
- `output/playwright/iphone-glass-media/feed-430.png`
- `output/playwright/iphone-glass-media/chat-430.png`
- `output/playwright/iphone-glass-media/large-text-430.png`
- `output/playwright/iphone-glass-media/landscape-large-text.png`
- `output/playwright/iphone-glass-media/google-photo-mocked-430.png`
- `output/playwright/iphone-glass-media/route-collapsed-430.png`
- `output/playwright/iphone-glass-media/route-expanded-430.png`
- `output/playwright/iphone-glass-media/route-collapsed-landscape.png`
- `output/playwright/iphone-glass-media/route-expanded-landscape.png`
- `output/playwright/iphone-glass-media/feed-under-glass-scroll-430.png`
- `output/playwright/iphone-glass-media/feed-glass-banner-430.png`
- `output/playwright/iphone-glass-media/route-street-credit-native-fixture.png`
- `output/playwright/iphone-glass-media/chat-joined-dock-first-send-430.png`
- `output/playwright/iphone-glass-media/chat-synthetic-keyboard-560.png`

После glass fix на актуальных скриншотах: header не пересекает status-area,
feed `Подробнее` виден над dock, composer не перекрыт, selected dock tab — lime
объёмная плашка, route landscape CTA доступен. Фото Google на скриншоте — белый
тестовый PNG, не реальная фотография и не проверка качества provider media.
Внешние тайлы отключены, поэтому скриншоты не доказывают актуальность Google/OSM
тайлов, live events или правильность дорожной геометрии.

Дополнительно прочитан существующий скриншот другого физического прогона
`exports/screenshots/ios-device/2026-10-21-safe-area-restored-screen.png`:
визуально status bar/header/composer/dock разделены. Это предоставленное
доказательство другого прогона, не новое действие этого QA-агента.

## Воспроизводимые команды

В данном окружении `npx`/`pnpm` не находятся в shell PATH. Использован установленный
Node24 и существующие бинарники проекта; package/config/lock не менялись.

```sh
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin node_modules/.bin/vite --host 127.0.0.1 --port 4176 --strictPort
# Команда выше запускается из mobile/, остальные — из корня QETTYQ.
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin PORT=4176 node_modules/.bin/playwright test tests/e2e/iphone-glass-media.spec.ts --workers=1
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin node_modules/.bin/vitest run tests/unit/place-media-policy.test.ts
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin node_modules/.bin/tsc --noEmit
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin node_modules/.bin/eslint tests/e2e/iphone-glass-media.spec.ts tests/unit/place-media-policy.test.ts tests/e2e/qettyq.spec.ts tests/e2e/ui-review-38.spec.ts
```

Первые отказы E2E были ошибками нового теста (старый accessible name GPS,
неверное имя rail и assert раньше завершения discover). Они исправлены под
фактический UI без удаления покрытий. Реальные product failures оставались
красными до исправления владельцами. После снятия native height override тесты
ориентации дополнены ожиданием асинхронного visualViewport resize через poll с
прежним строгим пределом размера; допуск не увеличен. Полный проектный suite,
build и публикация этим агентом не запускались; финальная проверка после freeze
всех владельцев — у orchestrator.

## Последующий API/legacy-контракт, отдельная разрешённая задача

Добавлен `tests/unit/leisure-assistant-api.test.ts`: **12/12 PASS**, вместе с
`leisure-assistant-dialogue`, `public-chat-api`, `hosted-api` — **68/68 PASS**.
Провайдеры только injected synthetic responses, глобальная сеть запрещена.
Уточнение свидания (не больше двух вопросов) и приветствие на трёх языках
не вызывают events/Google/AI dependencies/quota. Follow-up с `5000 тенге`
сохраняет ограничения и возвращает только ID реального каталога прогулок.
Неподтверждённые ETA остаются null, отрицание кофе не превращает парк в кафе.
API-флаги по умолчанию false, независимо от новых UI-настроек.

Обнаружен и исправлен root реальный P1: противоречащий явной прогулке model plan
`food` запускал Google «кофе» и терял исходную выдачу. Регрессии для model plans
food/events/general теперь подтверждают сохранение прогулки без ненужного
Google/events запроса. Неоднозначное `5000` без валюты **намеренно** остаётся null:
orchestrator явно подтвердил не угадывать бюджет, кроме ответа на budget question.

Память проверена с изолированной настоящей SQLite: без identity — ноль клиентов
и сообщений; profile-only consent — ноль сообщений; dialogue consent — ровно
два сообщения. Dialogue не даёт `ai_transfer`, visits не выводятся автоматически.
Clarification вызывает только существующий consent-enforcing memory service,
не создаёт identity сама. Эти тесты не обращаются к production DB.

По дополнительному разрешению root сохранены чужие hunks и обновлены только
устаревшие expectations в `i18n.spec.ts`, `policy-i18n.spec.ts`,
`qa-language-memory.spec.ts`, `local-chat.spec.ts`, `ui-review-38.spec.ts`:
перенос настроек из чата, default Google=true при disclosure, opt-out/enable,
новый policy copy, восстановленный chat после reload, joined composer ≤ dock top.
Next `127.0.0.1:3037` с выключенными платными флагами: первые четыре specs
(без отдельного многоязычного sweep) **10/10 PASS (12.8s)**. TypeScript и ESLint
всех этих файлов и нового API-теста — PASS. Затем отдельный многоязычный sweep
`qa-language-memory.spec.ts --grep 'localized full flow'` — **8/8 PASS (21.9s)**:
kk/en ×360/390/430/1440, исходные названия/пользовательский текст, организаторский
черновик, серверная память и gate удаления сохранены в проверках.
Итого эти две независимые legacy Next retakes — 18 passed; отдельно новый
iphone-glass-media набор на Next — 12 passed. Это не весь проектный suite.
Полный Next suite запускает root.

```sh
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin node_modules/.bin/vitest run tests/unit/leisure-assistant-api.test.ts tests/unit/leisure-assistant-dialogue.test.ts tests/unit/public-chat-api.test.ts tests/unit/hosted-api.test.ts
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin PORT=3037 node_modules/.bin/playwright test tests/e2e/i18n.spec.ts tests/e2e/policy-i18n.spec.ts tests/e2e/local-chat.spec.ts tests/e2e/ui-review-38.spec.ts --workers=2 --reporter=list --output=output/playwright/legacy-chat-contract-retake
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin PORT=3037 node_modules/.bin/playwright test tests/e2e/qa-language-memory.spec.ts --grep 'localized full flow' --workers=2 --reporter=list --output=output/playwright/localized-default-provider-retake
PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin PORT=3037 node_modules/.bin/playwright test tests/e2e/iphone-glass-media.spec.ts --workers=2 --reporter=list --output=output/playwright/iphone-next-final-retake
```
