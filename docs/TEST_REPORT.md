# Отчёт проверки

## Приоритетный проход · VPS + UI38 · 20.10.2026

- `pnpm test`: **300/300 PASS**,28файлов. Ранее выявлен1старый Referer expectation после смены canonical URL; исправлен на фактический новый hostname, проверки не отключались.
- `pnpm test:e2e --workers=2`: **16/16 PASS**,25.5с;6spec. Синтетические event/routing fixtures явно помечены и не считаются live provider proof.
- `pnpm typecheck`, `pnpm data:validate` (80snapshot POI), `pnpm submission:check`: PASS. `pnpm lint`: exit0,0errors,13старых unused-vars warnings в Penpot scripts.
- `pnpm build`: PASS. `docker build --platform linux/amd64 --progress plain -t qettyq:vps-20261020-3 .`: PASS (Next16.4.2, Node24.22.0). Первый install выявил, что Docker не копировал reviewed pnpm-workspace.yaml; файл добавлен, strict build-script policy не отключалась. Dynamic path tracing исправлен поддерживаемыми annotations; финальный образ не содержит `.env.local`, `src` или исходных пользовательских документов.
- Новый public HTTPS health200, HTTP301→HTTPS, Secure/HttpOnly/SameSite cookie; session201 и DELETE200/deleted:true. Certbot certificate18.01.2027; `renew --dry-run --no-random-sleep-on-renew` PASS. `nginx -t` PASS перед graceful reload. Два исходных домена boostseller.kz/anamai.kz остались200.
- Public `/api/events`:200 live/fresh8, fetchedAt2026-10-20T18:12:11.530Z. Старый Sites `/api/assistant/status`: PUBLIC_AI_DISABLED после env5 publish. Полный D1 ledger export0rows verified post-freeze; импорт в SQLite без reset.
- Два реальных public GPT-5.5 вызова:200/openai; второй2real event cards +2Sxodim citations. Первый reserve500000microUSD пережил пересоздание app, итог1000000/10000000 зарезервировано,18calls remaining. Cooldown подтверждён. Это резервы, не измеренный фактический долларовый invoice. Никаких hosted tools или неразрешённых новых API.
- Реальный VPS `/api/routing` POST:200/live/street/fossgis_foot,492м,393.6с,17vertices между публичными POI Арарат/Королевская охота; тестовая сессия удалена. Это не synthetic геометрия и не GPS пользователя.
- SQLite `PRAGMA integrity_check`:ok. Один app-only backup выполнен и проверен тем же integrity check; renewal/backup timers active. Production screenshot390×844: welcome/swipe/conditions/feed/event/map/plan. Физический Safari/iPhone не проверен.
- Финальное read-only чтение ledger:3completed reservations/$1.50; публичный счётчик изменяем, дополнительный запрос не приписываем двум контролируемым smoke. DB содержит93venues (80OSM +event venues),14events/occurrences,0hours,0memory_clients; это накопленная история, не14текущих live карточек.
- SSH cleanup:удалена только одобренная task-key строка; SHA256 остальных authorized_keys совпал с исходным. Повторный BatchMode SSH с временным ключом получил expected255/Permission denied. Чужие ключи и остальные доступы не изменялись.

Исторические результаты ниже не заменяют этот проход.

## Актуальный проход · live evidence, D1, public UI · 20.10.2026

- `pnpm test`: финально **261/261 PASS**, 23 файла; `pnpm test:e2e --workers=1`: **12/12 PASS**, 18.1 с. Production street-routing HTTP 200 после исправления Cloudflare redirect. Подробности в `docs/agent-reports/A-live-release-20261020.md`.
- `pnpm typecheck`: PASS. Ранее в этом проходе `pnpm build`, `pnpm data:validate` (80 snapshot POI) — PASS.
- Root E2E: 12/12 PASS. Built Worker preview: 12/12 PASS после стабилизации ожидания layout при resize (`expect.poll` с тем же условием отсутствия пересечения CTA/dock). Synthetic routing fixture не является доказательством реального внешнего маршрута.
- Sites v6 и v7 build helper: все 5 стадий PASS. D1 таблицы `qettyq_ai_public_reservations` / `qettyq_routing_throttle` подтверждены native overview. Публичные health/events/status endpoints отвечают, афиша live/fresh: 8 карточек и реальные публикации.
- Публичный AI status: `API_KEY_MISSING`; вызов модели публично не проводился, квота прежнего локального теста не сбрасывалась. Проверки бюджета/idempotency/cooldown/нет DB/provider failure — offline unit, не оплаченные запросы.
- Маршрутизатор локально вернул 708.5 м / 567.2 с / 58 вершин для двух публичных тестовых точек. Первый public Worker вызов завершился 503 до HTTP-ответа провайдера; недоказанное предположение об IP-блокировке не принимается за факт. Найдена несовместимость `redirect:'error'` в Cloudflare; финальная повторная проверка отражается в отчёте релиза.
- Проверены реальные Chrome UI: live-афиша со ссылками, полноэкранная карта/маркеры, навигация 4 tabs; 430×932. Ошибка очистки `null.getBoundingClientRect` исправлена. Реальный iPhone и сквозной публичный AI не проверены.

## Финальная интеграция live-афиши и glass · 20.10.2026

Завершающий прогон: Site `PORT=5173 pnpm test:e2e --workers=1`: 8/8 PASS,10.5s. Исходный organizer-тест не ослаблялся; readiness исправил реальную раннюю потерю клика. Новый тест использует явно synthetic events fixture, а не выдаёт mock за live.

Vinext build helper: exit0, все5 стадий. Sites v5 succeeded, production HTTP smoke: health200; events200 live/fresh7 с fetchedAt `2026-10-20T11:50:51.145Z`, cachehit; session201/chat200 с3событиями/delete200. `/api/maps-config` не отдаёт ключ. Production session smoke — одно наблюдение, не гарантия durable storage.

CUA mobile:430×932,390×844,360×800; на390 CTA632.6..680.6 при mainbottom738. На360 CTA601..649 при mainbottom694. Документ не удлиняется за viewport, контент имеет внутренний scroll. Proof: `exports/qettyq-glass-mobile.png`. LAN URL вернул200 с Mac; Safari на физическом iPhone не проверялся.

Имеет приоритет над числами прежних проходов ниже.

- `pnpm test`: PASS, 100 тестов в 12 файлах. Без реальных платных AI-вызовов.
- `pnpm typecheck`: PASS. `pnpm build`: PASS, включая `/api/events` и чат.
- `pnpm lint`: PASS по exit code, 0 ошибок и 13 предупреждений старых design scripts. Generated Playwright trace/report исключены, исходники src/tests продолжают проверяться.
- `pnpm data:validate`: PASS, 80 POI с provenance.
- Реальный сетевой smoke `/api/events`: HTTP200, live/fresh, 7 будущих событий; повтор hit с тем же fetchedAt. Это не mock. Координаты всех 7 unknown, ложные pins отсутствуют.
- Браузер CUA: открыты реальные афиша → детали и чат → «События» → 3 карточки, цены/язык/длительность unknown отображаются явно. Полный финальный E2E и публичный Worker smoke будут записаны после окончания.
- Важно: первый Site E2E дал 6 PASS / 1 FAIL — ранний клик по SSR-кнопке до hydration. Кнопки header теперь disabled до готовности. Не считать этот прогон успешным; требуется повтор.

Не подтверждены: генеративная модель/RAG, дорожный ETA, Google SDK, киносеансы, бронирование, production-аккаунты, реальный iPhone/Safari, совместное редактирование. Презентация v7 проверена отдельно; видео/заявка не выполнялись.

## Актуальный прогон локального web app · 20.10.2026

Ниже этого раздела сохранены старые отчёты; их числа не являются числом тестов текущего прохода.

| Команда / проверка | Фактический результат |
|---|---|
| `pnpm test` | PASS: 69 тестов, 11 файлов; включая ingestion, API, Host/Origin, swipe release/opacity, clustering и localDraftOnly |
| `pnpm test:e2e --workers=2` | PASS: 6 сценариев; 15 свайпов → условия → детали → план, drag/return/undo, 503, строгий бюджет, 4 tab/Leaflet, память/удаление, 360/390/430 и reduced motion |
| `pnpm typecheck` | PASS после интеграции PilotApp и OrganizerFlow |
| `pnpm build` | PASS на основной сборке PilotApp; финальный повтор после последней доводки фиксируется ниже |
| `pnpm data:validate` | PASS: 80 snapshot POI с provenance |
| `pnpm submission:check` | PASS: наличие обязательных документов и проверка env.example; это НЕ проверка полной готовности и не отправка заявки |
| `pnpm lint` | Ошибок приложения не найдено; предупреждения старых design scripts учитываются отдельно, временные vendor executables исключены как generated code |
| Browser QA через CUA | Открыты welcome/swipe/conditions/feed/map/profile. OSM-тайлы реально загружены. При визуальном осмотре найдено и исправлено перекрытие 80 pins через clustering |
| Презентация v7 | 10 слайдов; finalizer PASS, PDF10 страниц; 8 неизменённых слайдов совпали с v6; 7/10 обновлены и перепроверены |

Не проверены как live: OpenAI, дорожная маршрутизация, Google SDK, Ticketon/Kino sessions, live-event imports, booking, совместная сессия. Отдельный iPhone/Safari touch-прогон не проводился. Это не отчёт о полностью готовом production-продукте.

`git diff --check` на всём dirty tree показывает ранее существовавший trailing whitespace в пользовательском `docs/PRODUCT_UI_MASTER_SPEC.md:28`; этот несвязанный текст не исправлялся и не перезаписывался.

## Исторические отчёты

Дата последней проверки: 20 октября 2026. Среда: macOS arm64, bundled Node.js, pnpm.

| Проверка | Статус | Детали |
|---|---|---|
| `pnpm data:validate` | PASS | 80 snapshot POI с provenance |
| `pnpm test` | PASS | 18 unit + integration тестов |
| `pnpm test:e2e` | PASS | 5 mobile Chromium сценариев, 390×844, reduced motion; 15 реакций проходят полный путь |
| `pnpm typecheck` | PASS | TypeScript без ошибок |
| `pnpm lint` | PASS | ESLint без ошибок |
| `pnpm build` | PASS | Next.js production build после подключения 15 локальных 3:4 assets |
| Проверка изображений | PASS | 15 runtime JPEG, каждый 720×960; мастера сохранены отдельно |
| `pnpm submission:check` | PASS | Обязательные файлы доступны, `.env.example` без ключей |
| Presentation QA | PASS | 9-slide PPTX, 9-page PDF, montage и full-size inspection |
| Secret scan | PASS | Финальный submission ZIP без известных ключевых паттернов |
| P0 screen manifest | PASS | `jq`: 28 записей; 28 PNG присутствуют и не пусты |
| Screen master dimensions | PASS | Masters около 853×1844, единая portrait-пропорция; целевой viewport в контракте 430×932 |
| UX flow render | PASS | SVG-карта отрендерена Quick Look без ошибок; четыре ветки и 26 состояний видимы |
| Click-flow P0 | PASS | Пройдено `02→04→05→08→09→10→11→13→14`; dock появился только на `14`; также проверено `14→16→17→24` |
| 44-screen layer contract | PASS | JSON валиден; 44 уникальных ID 01–44; 17 docked screens используют точные 4 labels |
| Asset/icon manifest | PASS | 44 screen maps, 15 interest cards; все указанные Lucide exports существуют |
| Screen 14 production UI | PASS | Hero x=22/w=386, dock x=16/w=398, gear/settings overlay, semantic media/facts/actions; screenshot QA 430×932 |

Провайдерные mocks не выдаются за live smoke. Реальный сетевой вызов выполнен только для одного ограниченного импорта OSM. Детали E2E: `docs/agent-reports/A8-e2e.md`.

Визуальный QA экранов ограничен композицией. Сгенерированный текст не принимается
как финальный UI-copy; map-like фон не принимается как настоящая карта. Перед
релизом каждый экран должен быть воспроизведён кодом и пройти mobile screenshot QA.

## Penpot · 20.10.2026

Проверки относятся к дизайну, не к сервисам приложения.

| Проверка | Результат | Доказательство |
|---|---|---|
| Screen copy и graph spec | PASS | 44 уникальных основных ID; `flow-links.json`: 332 контрактных связи, 45 достижимых основных узлов с settings |
| Реальные native boards | PASS | В Penpot просмотр показывает 59 фреймов: 44 + settings + 14 вариантов колоды |
| Текст вне границ фрейма | PASS | `scripts/qa-penpot.mjs`, `visual-audit.json`: 0 выходов у 59 фреймов |
| Медиаслои | PASS | 15 локальных JPEG импортированы отдельными image fills, не цельными UI-скриншотами |
| Экспорт и осмотр | PASS | Native PNG 02,05,14,16,27,32,33,36,45 в `design/penpot/previews/`; визуально осмотрены 05,14,27,36 и браузерный просмотр карты/профиля/settings |
| Gear overlay | PASS | Открыт 45 из 14, «Готово» вернуло тот же экран14 |
| Dock hit areas | PASS после исправления | У 16 активных dock по 4 tab; в браузере проверены 14→32→27→16. Для tab добавлены явные native hit areas |
| Публичный deployment | NOT RUN | Владелец остановил публикацию до согласования дизайна |

Команды прохода: `node scripts/assemble-penpot.mjs assets`, `node scripts/build-penpot-scenes.mjs`, `node scripts/finish-penpot-design.mjs` (по результатам исправлены совместимость имён/весов шрифта/API), отдельные `assemble-penpot.mjs run design/penpot/*.js`, `node scripts/qa-penpot.mjs`. Выполнялись bundled Node 24.19 и официальный локальный Penpot MCP. Действия браузера проведены через CUA. Статический graph spec не выдаётся за реализацию всех conditional outcomes или API.

## Повторная доводка Penpot · 20.10.2026

| Проверка | Результат | Область доказательства |
|---|---|---|
| `node scripts/audit-penpot-controls.mjs` | PASS |147 native states; missing enabled control actions0, text collisions0, outside text0. Disabled undo первого шага и пустой Send исключены осмысленно |
| Surface audit14/14.dance/14.puppet | PASS | Native clipped parent386×592; photo386×515; CTA ends574 with18px bottom padding; outside descendants0 |
| Map containment | PASS |15 clipped map viewports; в каждом6 roads — непосредственные дети. Настоящий провайдер не проверялся |
| Chat clipping | PASS |7 transcript rails без внутренних drop shadows; composer/dock остаются отдельными |
| Browser chat | PASS |27 suggestion→27.draft Send→28 after-delay→29; «Другое место»→29.followup |
| Browser logo | PASS |27 logo→14 |
| Browser context | PASS |14 time chip→08 row→08.editor preset60→08.selected.short |
| Browser swipe continue | PASS после ремонта anchor |05.ready right circle→видимая плашка, отдельный второй click→08. Manual overlay position раньше уводила плашку вне экрана; заменена bottom-right anchor к кругу |
| Browser feed carousel | PASS |14→14.dance→14.puppet по next, previous→14.dance, Подробнее→21.alt, Назад→та же14.dance. Это click-проверка дизайна, не pointer-drag |
| Реальный drag/form/AI/storage/share | NOT RUN | Native prototype не имеет runtime-интеграций; сценарный click не выдаётся за live выполнение |
| App build/E2E/deploy | NOT RUN в этом проходе | Код приложения не менялся; прежние результаты выше не относятся к новым147 макетам |

Фактически исполнены bundled Node команды `redesign-penpot-swipes.mjs`, `complete-penpot-interactions.mjs`, `run-penpot-list-repairs.mjs`, `run-penpot-editors.mjs`, `finalize-penpot-controls.mjs`, `repair-swipe-overlay.mjs`, `redesign-feed-carousel.mjs`, `clip-map-surfaces.mjs`, `audit-penpot-controls.mjs`, `export-swipe-contract.mjs`, `export-penpot-review.mjs`, а также малые official MCP вызовы по сценарию. Два больших MCP скрипта превысили30s ответного timeout, но фактическое завершение отдельно прочитано через API и затем перепроверено. После этого операции разделены на небольшие batches. Native exports просмотрены для05/08/08.editor/19.selected.culture/14/27/29/29.followup; браузерный clickflow — через CUA.
# Дополнение 20.10.2026: AI и доказательства для презентации

- Единственный разрешённый live-тест серверного `answerSmartAssistant`: GPT-5.5 + `web_search`, HTTP 200, режим `openai`, одна цитата Visit Astana. Личные данные и геопозицию не передавали. Не считать это проверкой публичного AI или браузерного AI-сценария.
- После теста `GET /api/assistant/status`: `available:false`, `reason:TEST_QUOTA_EXHAUSTED`, `remainingTestCalls:0`. Квоту не сбрасывали.
- Chrome, 430×932: фактические скриншоты карты, плана A/B с выбранной вручную публичной точкой, ответа чата по правилам с карточками, афиши, бюджета, свайпов и памяти. Без моков ответов HTTP в этом проходе.
- В dev-логах при переходах карты обнаружена ошибка очистки `MapCanvas`: обращение к `null.getBoundingClientRect`. В этом проходе презентации код карты не менялся. Это открытая ошибка, не статус «без ошибок».
- Презентация v8: финализатор подтвердил 10 слайдов, 0 структурных/геометрических замечаний и повторный импорт PPTX. Все 10 страниц финального PDF просмотрены, наложений и обрезанных блоков не обнаружено. Проверка в нативном PowerPoint не проводилась. Отчёт: `docs/agent-reports/A9-pitch-v8.md`.
