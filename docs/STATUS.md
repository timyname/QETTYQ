# Статус QETTYQ

## GLM, две фотографии и междневная память · v18 · 24.10.2026

- Сервис/deploy: `qettyq:vps-20261024-18` опубликован, healthy,176.2MiB/640MiB. Immutable build input tree `8683af6ad622ed15d27274bed17acfc9d8743381`; image manifest-list `82b709b95d7e3600a80ef2a8fc50393b44d7be8e35714b6cafd009b77a64cb4f`. Проверена SQLite backup; SSH authorized_keys hash не изменился; другие проекты не менялись. Первая немедленная health-проверка после recreate получила reset, последующие internal/public HTTPS дали200/healthy.
- GLM: завершённый ZCode report извлечён в A-glm-zcode-audit-extracted. B4 подтверждён/исправлен: видимые44px like/skip. B5 — подпись категорий, не лишние likes. B6 — безопасные публичные hash URLs, Back/Forward, reload и отложенная event-навигация. B1 low-res286px не подтверждён: реальный JPEG720×960/master1086×1448; остальные опровергнутые visual claims не «исправлялись». Недоступность AI/2ГИС не обходилась новым ключом/лимитом.
- Данные: ещё2 publisher фото (Культура Диктует, Chaleur), POI8/749; афиша16 изображений.21 private JPEG/3027791B; SHA256 sorted JSON path/sha256/bytes manifest `9d4d389d03cc9e9cca2fb91c33581c28d292d4e314c486224e5b9313c6853370`. Branch/address identity, rights/credit/expiry/no-store сохранены; placeholders/неоднозначные филиалы исключены.
- Память/RAG: server-write clocks закрепляют относительные даты RU/KK/EN за исходным днём. Прошедшая дата/старые выходные → уточнение; текущая дата/confirmed деньги и время имеют приоритет. Exact full role/text replay может получить только соответствующие серверные часы; divergence не заимствует их. Local-only производный запрос блокируется для Google.20turns/6KiB, consent/TTL/delete без изменений. Embeddings/hybrid не включались.
- Проверки: изолированный release864/864 unit/integration75files, typecheck/scopedESLint/build PASS;36/36 targeted E2E PASS1.0min; production canary восстановил память в новой guest session, сохранил7000/90, подтвердил MEMORY_LOCAL_ONLY,8photo/16posters/21JPEG hashes/no-store и удаление собственной тестовой памяти. Browser live Chaleur decoded/photo+public deep link подтверждены; screenshot output/playwright/qettyq-v18-chaleur-live.png.
- AI/бюджеты: read-only production preflight0provider calls, USD10alreadyreserved, remainingCalls0/PUBLIC_ACCOUNTING_BLOCKED; это accounting reservation, не invoice. No paid simulation/provider calls. Маршруты — регрессия multistop, алгоритм не менялся. Physical iPhone/native reinstall не проверялись. Презентация, видео и заявка не менялись.

## Лента, локальная память и shared cap · v17 · 24.10.2026

- Web опубликован: `qettyq:vps-20261024-17`, healthy,186.9MiB/640MiB. Immutable build input tree `824563eec08b48ed7f34e1c853d6a41349fe3655`; image manifest `a87580a98e2a988d2abc7941ff700cbb8e436d1bd3943334b9f120f945500983`. v16 был только build candidate, на live не переключался; до v17 работал v15. Backup verified, SSH сохранён, другие проекты не менялись.
- Фото: реальный Uno/Кенесары13 добавлен по exact name+shared addressed OSM building. POI6/749, афиша16/16.19 private publisher JPEG/2731071B, sorted SHA manifest148519d80030e8899f8cb1a2648c08aa1820f76a31e2ce00682a0d1583e17f82. Rights/credit/expiry/no-store gates сохранены; остальные проверенные venue placeholders/неоднозначные филиалы не добавлены.
- UI: афиша — единая snap-ширина и16:10 media frame для loading/real/404/missing, contain без обрезки текста источника, равные края/высота карточек. Не новый дизайн всех venue/detail экранов.
- Память: серверный local-only read по profile/dialogue scopes, без AI-transfer/visits.20turns/6KiB; replay только текущего дня Астаны, полная история UI не удаляется. Fresh nondefault request settings + money tuple и session confirmations предшествуют старой истории. Когда public AI unavailable, даже useAItrue фиксируется в локальный путь, модель не вызывается. Local-derived запрос не передаётся Google.
- Production canary PASS: новый guest без client history, useAItrue/blocked budget → deterministic memory restore, fresh7000/nonstrict/90min, local food+Google consent → MEMORY_LOCAL_ONLY,6/749photo,16posters,19JPEG exacthash/no-store. Собственная память удалена/проверена; платных Google/OpenAI вызовов0.
- AI/Sybil: общий gateway использует прежний approval/table/atomic reservation. Production read-only preflight: USD10reserved (19completed+1blocked),0remaining, PUBLIC_ACCOUNTING_BLOCKED; это не invoice. Upstream Sybil не подключён к gateway, ключи не передавались и платная simulation не запускалась. В ZCode действительно отправлено отдельное read-only задание GLM-5.3 Max; это не API и не запуск Sybil. Статус/ограничения в A-zcode-review.
- Проверки:829/829 unit/integration72files, typecheck/scopedlint, immutable Next build58s, final targeted13/13 E2E49.4s PASS. Physical iPhone/native reinstall не выполнялись. Маршруты — regression only. Презентация/видео/заявка не менялись.


## Контекст, lexical RAG v2 и афиша v15 · 24.10.2026

- Сервис: опубликован `qettyq:vps-20261024-15`, healthy,189.9MiB/640MiB; immutable build input tree `a256261c976841449fc272a13ead6155e2da66f6`, image manifest `66295b4270cdb948023a3a2b6d712fdb1f35561aae245e4eb33daee6e62e0fb4`. SQLite backup verified; SSH сохранён, другие проекты не менялись.
- AI/поиск: улучшены bounded lexical RU/KK/EN категории/отрицания/точные имена, последняя положительная дата и смена цели. Frozen A/B против fbe5923: nDCG@3 all0.7023→0.8528(n29), holdout0.3366→0.5732(n10), full assertions29→32/40. Embeddings/hybrid gate не пройден; semantic index не включён. Pure source-denied fixture остаётся gap R3/R4, не заявляется public API leak.
- Память:20 сообщений для deterministic replay при прежних6KiB; provider по-прежнему6/input/output caps прежние. SQLite24 сообщения/independent consents/TTL/delete сохранены. Confirmed settings защищены от старой истории; текущий текст может предложить изменения, не записывая настройки молча.
- Production HTTP: память восстановлена в новой guest session,18-turn date/dinner→standup сохранил бюджет12000/party2/120min/activity; новый confirmed5000 не повышен историей; exact museum first match. Тестовая память удалена/проверена. Paid Google/OpenAI calls0.
- Данные/фото: live16 событий,16 publisher posters (было10),749 snapshot POI/5 фото.18 private JPEG total2564599B, aggregate SHA `b1d900d30f935bb620153a65db46e9c7c5b3fa4f922bb9abd474274595e85b62`; HTTP18/18 hashes/no-store PASS. Это afisha artwork, не доказательство фотографии фактического события. Ararat/LifeFitness/TLP/TARY/Rafe без нового approved снимка, несовпадения адресов не обходились.
- R2: минимальный технический trace с TTL24h/isolation/session deletion, без query/GPS/rawoutput; public flag default OFF и HTTP подтвердил OFF. Полный profiler/source facts/accounting в trace ещё не реализованы; см.RAG_R2_TRACE.
- Проверки:788/788 unit/integration, typecheck/scoped lint/immutable Next PASS; E2E full95/96 (30s boundingBox timeout), isolated routing2/2 PASS без ослабления, финальные chat/privacy8/8 PASS. Native Vite compile PASS24.17s до backend-only canary fix, не новая установка iPhone.
- Маршруты регрессированы без изменения алгоритма. Презентация/видео/заявка не менялись. Sybil Swarm подтверждён владельцем; отдельная no-key isolated установка/проверка, не часть production или полноценный browser QA; статус в agent reports.


## Реальные фото, память и RAG R1 · 24.10.2026

- Web: опубликован `qettyq:vps-20261024-13`, healthy, 184.9MiB/640MiB. Immutable build tree `63e6da95d288d165f71b4f3eaf25a58a89516ce5`, image manifest `0b14db0db909ff26d75d132268ef137aa2e5bc607fd1be96b98b5a046fa8dedb`. Проверенная SQLite backup, другие проекты не менялись, SSH сохранён.
- Production:16 live-событий,10 изображений афиши;749 snapshot POI,5 фото (3 Commons,2 publisher). RIBAMBELLE и Саксаул сопоставлены по точному заведению/адресу; новый снимок Lovers Park явно исторический2005. Не обещаем фото всех заведений или современность архивных интерьеров.
-12 publisher JPEG хранятся вне Git, отдаются gated no-store endpoints с SHA/size/expiry/revoke проверками. Разрешение Sxodim ограничено некоммерческим использованием с упоминанием/ссылкой; не распространяется автоматически на коммерческий сервис или соцсети. В ленте краткая атрибуция, полная — в деталях.
- Память: устранён обход ai_transfer через восстановленный transcript. Серверные/legacy и производные ответы сохраняют происхождение; свежая проверка согласия перед AI, отказ не стирает видимый диалог/текущий вопрос. SQLite, TTL и удаление существовали до этого релиза; native-cookie persistence после физического перезапуска не доказана.
- R1:40 проверенных RU/KK/EN cases, воспроизводимый offline baseline:34/40 outcomes,29/40 full assertions,2 нарушения на прямой synthetic retriever boundary. Это не улучшенный matcher и не доказательство public API leak. R2 trace и hybrid RAG пока не реализованы.
-706/706 unit/integration,96/96 E2E, typecheck/scoped lint, immutable Next build и private native Vite compile PASS. Production HTTP12/12 exact JPEG+404/no-store и Chrome venue photo PASS. Google/OpenAI paid calls0, бюджеты прежние. Маршруты регрессированы, алгоритм не менялся; презентация/видео/заявка не менялись. iPhone bundle не установлен.


## Исправление плана из нескольких точек · 21.10.2026

- Опубликован `qettyq:vps-20261021-12`, healthy; immutable build tree `f37cb450e835102733652b18ce3334fd64e98e8f`, manifest `0b88e0c71d96c192df78c60359a215a3de686d2958e148d62756595c022cdb5e`. Проверенная SQLite backup перед обновлением; другие проекты не менялись, SSH сохранён.
- Причина потери точек: одиночный `buildPlan([id])` при «Оценить путь». Теперь map/detail/event сохраняют упорядоченный черновик до5 мест; перестановка/удаление передают точный новый список.
- При готовом старте дорога считается автоматически один раз на порядок точек/провайдера, без повторов при сбое. Старый путь сбрасывается при изменении порядка. Стрелки вверх/вниз видны в основном списке, hold-drag сохранён; отдельно переход, прибытие, посещение/ожидание. Неизвестная длительность не подменяется оценкой.
- Предупреждение о времени и share используют новый расчёт; превышение бюджета учитывается независимо.646 unit/integration +83 E2E PASS, typecheck/lint/immutable Next/private native compile PASS. Production Chrome:3музея→Evaluateтретьего→все3→перестановка→новая street line PASS. Два бесплатных FOSSGIS запроса; Google/OpenAI0.
- AI и данные этим исправлением не расширены. R0-аудит источников записан в `RAG_BASELINE.md`; R1/R2, универсальный revoke/index gate и массовые реальные фото остаются незавершёнными. Native compilation не означает новую установку на iPhone. Презентация, видео и заявка этим релизом не менялись.

## iPhone UI / поиск карты / запуск маршрута · 21.10.2026

- UI checkpoint: общие React/CSS изменения заморожены. Web опубликован отдельным `qettyq:vps-20261021-11`, source tree `87f62e3b482eb7ba1d51b1e0e2c55a68b3677874`, manifest SHA256 `ae27b47e3df44d2fb11a4fda54555b9825ead1c5119107ac5af317ce74654c11`, healthy. Чужие native/PWA/root config изменения исключены из web image. Native Vite bundle собран в private temp PASS, не выдаётся за установленный на iPhone.
- Карта/feed/chat/plan рисуются под safe area; прозрачная внешняя шапка и пространство вокруг dock, сами кнопки остаются стеклянными. Chat-scroller больше не обрывается над dock. Поля≥16px, map-search получает visualViewport anchoring, search keyboard hint и отдельную кнопку-лупу; при software keyboard dock скрывается.
- Добавлен session-protected no-store `POST /api/maps/search`: offline749POI + датированный OSM address index, максимум8 совпадений, поиск не сохраняется и не отправляется Google/2ГИС/LLM. RU/KK tolerant spelling — только поиск, не identity join. Числа14/142/10/1 не смешиваются. UI центрирует новую карту, показывает список для выбора адреса; building/address point не обещает вход.
- Маршрут: сначала явный расчёт по улицам, затем «Начать маршрут». Сбой провайдера даёт явно подписанный внешний переход без расчёта. Длительность202мин→3ч22мин на RU/KK/EN. Круг «На карту» рядом со свёрнутым планом возвращает все места/события. Drag к скрытой строке прокручивает список; landscape credits не перекрываются.
- Invalid-key screenshot: подтверждён web-only Origin при bundled Capacitor app. Владелец отдельно разрешил `capacitor://localhost`; консоль приняла/save/reload подтвердили оба origin,1000/month/Блокировка не менялись (наблюдалось202тайла). Runtime native approval включён. Клиент проверяет origin до SDK, включая точный Capacitor scheme/host, произвольный opaque/null запрещён. Сохранение настроек не доказывает физический native tile-load.
- Проверки641/641 unit/integration,81/81 E2E полного набора, typecheck/scopedlint/immutable Docker build PASS. Live HTTP поиска:Арарат1,Мангиликел10/1 два sourced совпадения,negative0; no-store/searchStoredfalse, своя сессия удалена. Первый HTTPS search1315мс включает cold start/network, это не измеренная CPU latency. App232.2MiB/640MiB, SSH digest прежний, backupverified.
- Фото: публичное покрытие по-прежнему2Commons POI; новых approved0. Добавлена воспроизводимая очередь12кандидатов. По последнему прямому запросу владельца скачан1 точный JPEG события Sxodim в закрытый ignored review (1522×570,202466B), не published/DB/Git. Автоимпорт/публичные фото всех карточек остаются открытой задачей, а не заменены компактными заглушками.
- AI/бюджеты/память не менялись, платных Google/OpenAI вызовов0. Routing фактическая линия проверялась в предыдущем MapGL checkpoint; текущие81 E2E проверяют также mock/failure и реальные локальные API, не физический iOS keyboard. Презентация/видео/заявка не обновлялись. Следующий backend-пакет — актуализировать RAG R0–R2 относительно этого checkpoint, не повторять UI.

## Карта 2ГИС включена · 21.10.2026

- Основной web runtime — 2GIS MapGL1.78.0 с реальным опубликованным стилем `QETTYQ · Pearl & Jade` (`12d28735-c7be-4e24-9b69-6c57afc51eae`). Сохранены фирменные маркеры, кластеры, стеклянные controls и зелёная дорожная линия. Подпись SDK не скрыта: live v10 hit-test подтвердил видимость под шапкой (82.5–101.5px), без перекрытия dock/toolbar.
- Owner разрешил временное браузерное использование именно текущего demo key: нет в видимом UI/Git/image, доступен в network по назначению MapGL. В консоли подтверждены Origin `https://qettyqapp.anamai.kz` после reload и Map Tiles1000/месяц/Блокировка. Это тайлы, не число посетителей. Application expiry `2026-11-20T19:00:00Z`; demo blocking21ноября. Google/OpenAI закрыты и их cap/ledger не менялись.
- VPS `qettyq:vps-20261021-10`, immutable source tree `4f70da76ed07e514084e5bc0affcb050b6e5d31a`, Next build/tsc PASS. Обновлялся только QETTYQ app; SQLite backup verified, SSH ключ сохранён с прежним digest. Чужие native/PWA/presentation изменения в образ не включены.
- QA:590/590 unit/integration,10/10 synthetic MapGL E2E, typecheck/scopedlint PASS. Live browser: MapGL ready/published style, реальная карточка места, ручной старт и возврат на карту PASS. Один реальный FOSSGIS пеший расчёт:2.8км,≈38мин дороги,35мин проектного посещения+18мин buffer=≈91мин; street geometry действительно нарисована поверх2GIS. Это не 2GIS Routing API и не подтверждение посещения.
- Данные прежние:749sourced POI,16events,8geocoded; production mixed event plan/reorder3/remove2/unknown-duration smoke PASS, собственная disposable session удалена. Источники фото/права не расширились автоматически от смены карты. Новых платных Google/OpenAI probes0.
- Сервис/карта/деплой готовы на HTTPS; AI и данные без функциональных изменений. Native physical iPhone+multi-stop external app остаются непроверенными; web Origin не разрешает native. Презентация/видео/заявка этим обновлением не изменялись.
- Proof: `exports/screenshots/dgis-release/live-map-v10.png`, реальная линия `live-street-route-v9.png`; style publication `style-published.png`. Не synthetic evidence и не физический iPhone.

## Клавиатура, афиша и компактный маршрут · 21.10.2026

Опубликован `qettyq:vps-20261021-8`, healthy. Приёмка: 572/572 unit/integration PASS, TypeScript PASS; независимый E2E61/61PASS +landscapeattributionhit-test1/1PASS. Immutable production build PASS; public16events/8coordinates, mixedevent3stopreorder/remove2, memoryrestore/deletePASS. Подробности TEST_REPORT. Физический iPhone/WKWebView пока не проверен.

- Keyboard viewport: offsetTop+height, focus-aware baseline WKWebView, без двойного safe-area. Toast Астаны overlay/close/2sec+fade; общая подложка header убрана, текст о провайдерах перенесён в настройки.
- План: круглый control справа, компактный bottom sheet/X, 2–5 stops, удержание/перетаскивание и доступные reorder controls, серверный пересчёт. Events с проверенными координатами теперь принимаются тем же API, unknown duration остаётся null. Ожидание начала/опоздание рассчитывает код; данные фильма не выдумываются.
- Афиша: точное сопоставление площадки/адреса с OSM provenance добавляет две точки Жастар театры. Publicпослепубликации16событий/8координат. HAS SANAT14-Д и неоднозначный Garage не подменяются ближайшим адресом. Публичная афиша и карточки больше не используют generated category photos.
- Фото: локальные Commons2POI и Google mapless Photos сохраняются; индивидуальных grants на Sxodim posters пока0. Картинка на доступной странице не является разрешением на копирование.
- 2ГИС: один demo Search probe200/1point. Отдельный MapGL adapter реализован, но отключён до отдельного browser-key+approval/domain restrictions. Серверный ключ не раскрыт; Google/OpenAI бюджеты не меняются. Внешний start route теперь HTTPS2GIS, multi-stop iOS требует физической проверки.
- Посещения: новый необязательный foreground return prompt с отдельным выключенным opt-in, разрешённой GPS+visits memory и подтверждением человека. Близость не записывается как доказанный визит; фонового слежения нет.

## Фото, стеклянный интерфейс и диалог · 21.10.2026

Опубликован `qettyq:vps-20261021-7`, healthy/HTTPS200. Финальная приёмка и публичные проверки записаны в TEST_REPORT. Существующие ключи и прикладные бюджеты OpenAI $10 / Google $10 сохраняются; сбросов ledger и нового биллинга нет. Live assistant: OpenAI plan→retrieve→answer PASS,3места/3источника, без Google и скрытой памяти; public memory restore/delete PASS.

- Общие web/iPhone-компоненты: safe-area/Dynamic Island, стеклянная лента под header/dock, единая нижняя панель ввода, читаемое уведомление города без перехода в настройки. Сохранена работа соседнего iOS-чата по восстановлению экранов/свайпов; PWA/config/package и native signing не переписываются этим релизом.
- Чат: до двух уточнений, replay явных условий/отрицаний, общий бюджет и словесное время. Модель не может подменить согласованную прогулку кафе/Google-поиском. Это ограниченный помощник, не полный аналог ChatGPT; контекст модели/детерминированного replay — шесть последних сообщений, локально хранится до 24.
- AI/Google включены в UI по прямому решению владельца, с уведомлением до первого сообщения и отдельными выключателями в настройках. Серверные API по-прежнему default-false при отсутствии полей. Долговременная память остаётся opt-in по прежним четырём scopes, TTL/delete без изменений.
- Фото: два проверенных Commons-снимка двух POI (растение Ботсада, экспонат Нацмузея), с авторством/лицензией/точным источником; остальные POI не притворяются фото. Google Photos только в отдельной mapless-выдаче, без переноса на OSM/в БД/LLM. Один прежний резерв $0.10 покрывает search + до пяти photos; cap $10 прежний.
- Приёмка: 493/493 unit/integration PASS; 56/56 E2E PASS, TypeScript и immutable Next production build PASS. Google: один live probe, 5 мест / 5 фото / 5 author credits / 4 расписания. Public memory opt-in/restore/delete PASS. Предрелизный SQLite backup проверен. Первые два AI probe вернули безопасный fallback; второй выявил ошибочный sentence-style gate, который удалён без снятия фактологических проверок. Финальный live результат — в TEST_REPORT.
- Презентация, видео и конкурсная заявка этим изменением не обновляются. Новый физический iPhone/WKWebView прогон ещё не выполнен; браузерные safe-area/клавиатура — явно synthetic fixtures.

## Data Hub, реальные места и компактный маршрут · 21.10.2026

Опубликован `qettyq:vps-20261021-4`, code commit `f550e6b`; build source tree `6265e8fe` имеет те же build-input файлы. Docker image `sha256:0dd09b60148380c1370fcb3baf3570357f09229c7b9b3c21391daeed0821a0f5`,107216202bytes. HTTPS/health200, контейнер healthy. Чужие iOS/PWA изменения не включены; boostseller.kz/anamai.kz200, соседние контейнеры не перезапускались. Предрелизный SQLite backup проверен, SSH ключ сохранён и authorized_keys digest не изменился.

- Данные: 749 OSM POI вместо80;265 raw opening_hours,223 поддерживает conservative parser,42 остаются unknown;222 cuisine,118 адресов. Snapshot OSM на19.10.2026 20:21UTC, не live.
- Афиша: реальный серверный refresh вернул16 будущих событий20.10 20:18UTC. Часовой systemd timer и пользовательские запросы используют общий durable source lease. Это не полное покрытие города.
- Адреса:29517 OSM records, observed multilingual street aliases. Строгое офлайн-сопоставление полного адреса, с отказом на корпусах/неоднозначности/устаревании;6 из16 событий получили derived building/address point. Сырой publisher snapshot не переписывается, вход не обещается.
- Data Hub: отдельный hash-only producer Threads, bounded M2M batches, dedup/revisions/quarantine/TTL. Без прав Threads payload не сохраняется; принятые разрешённые события соединены с афишей карты/чата. Новые hub places доступны в rich `/api/data-hub/catalog`, ещё не объединены со статическим POI pool планировщика.
- UI: компактный collapsed route sheet; GPS не уводит в conditions; ручной picker возвращает на invoking screen; дата сохраняется, stale geometry/consent сбрасываются.
- Google403 устранён21октября: браузерная сверка SHA256 выбрала правильный ключ/проект; Places API(New) там был disabled, включён. Существующий Pay as you go оставлен без изменений; key restrictions сужены None→IPсервера и32API→толькоPlaces(New), значение ключа не менялось. Один реальный post-fix probe:HTTP200/live,5заведений,5расписаний. Автоповторов/смены ключа/новой подписки/переустановки приложения нет.
- Public smoke: `/api/catalog`749/265часов; `/api/events`16/6derived; Hub401безключа/400приправильномключе+невернойschema, пустой publichub200. Искусственных записей в production не создавали. Memory opt-in/SecureHttpOnly cookie/write/newsessionrestore/deletePASS; свои тестовые identity/session удалены.
- Ledger после Google fix: OpenAI9×$0.50=$4.50 без изменений; Google2×$0.10=$0.20 консервативных резервов, включая прежний403 (не подтверждённый расход Google). Прикладной cap$10 не сброшен, остаток резервирования$9.80. Server key SHA256 совпал с выбранным владельцем, значение не выведено. Hub1enabled producer,0inbox records. Ключ producer локально только в ignored0600 `.sites-runtime/threads-analyzer.env`.
- Права:4 письма Gmail SENT — Sxodim, Нацмузей, Astana Ballet, Ticketon. Разрешений на фото пока0; чужие изображения не скачаны. Отчёты: `DATA_SOURCE_ACCESS_20261021.md`, `SOURCE_OUTREACH_20261021.md`, интеграция `DATA_HUB.md`.
- AI/долговременная память/пеший routing: существующая реализация сохранена, новый платный OpenAI вызов в этом проходе не нужен. Презентация/видео/заявка этим релизом не обновлялись.

## Приоритетный релиз · RU/KK/EN, память и контекстный поиск · 21.10.2026

Сервис опубликован на https://qettyqapp.anamai.kz/ : `qettyq:vps-20261021-3`, Git `703d893`, immutable source tree `c3ba9306`. Параллельные незавершённые iOS/PWA изменения не включены в образ. Существующие данные, секреты, OpenAI approval и резервы сохранены. HTTPS работает; boostseller.kz и anamai.kz проверяются отдельно.

- UI: первый экран — только выбор Қазақша/Русский/English на Астане с телефоном. Три языка основных сценариев, организатора и policy pages; оригинальные названия/адреса не маскируются под переведённые факты. Авто/такси/автобус удалены. Credits остаются компактно видимыми; исправлены перекрытия, подписи иллюстраций, видимый запас времени и казахские месяцы.
- Память: работающие opt-in API/UI, HttpOnly identity, независимые profile/dialogue/visits/ai_transfer, TTL24h/30d, восстановление, отзыв scope и полное удаление. На публичном HTTPS профиль пережил реальный restart контейнера и новый guest session; затем удалена только тестовая identity. SQLite backup retention7days остаётся.
- AI: bounded GPT-5.5 intent-plan → source retrieval → answer, одна старая budget reservation на два вызова, original constraints и source permissions проверяет код. Последний реальный публичный HTTP smoke подтвердил `openai`, `plan_retrieve_answer`,2события и1source citation. Ранее один ответ безопасно отклонён валидатором; это не обещание генерации без fallback. Hosted tools выключены.
- Данные: сейчас80 OSM POI,8 будущих live-афиша событий; у событий нет подтверждённых координат, у POI нет подтверждённых часов. Не выдаём их за готовые новые event pins. Код Sxodim расширен до24страниц/50occurrences; текущий свежий8-event cache и часовой lease не сбрасывались ради нового числа. Включён отдельный почасовой systemd timer через тот же endpoint/lease. Overpass502/406 сохранён как блокер расширения, без обхода.
- Google: adapter, consent UI, mapless credits и отдельный durable cap до$10 готовы; реальный поиск выключен (`GOOGLE_SERVER_KEY_REQUIRED`). Попавший в чат ключ не использовался и требует замены владельцем в защищённом локальном env. Контент Google не сохраняется и не рисуется поверх OSM.
- Маршруты: только пешие внутренние оценки/реальная FOSSGIS-геометрия после согласия. Изменение условий сбрасывает старую линию; неизвестный ETA не заявляется гарантией.
- QA:356 unit/integration PASS,38 E2E PASS,TypeScript/targeted ESLint PASS;237 screenshot states. Synthetic routing/UI fixtures отделены от actual HTTP+SQLite и production checks. Физический iPhone не проверен этим проходом.
- Доступ: по явному новому указанию владельца SSH-ключ сохранён для последующей работы, mode0600 и ignored local storage; не в Git/образе. Доступ к остальным проектам не расширяет scope работ.

Презентацию и видео этот релиз не пересобирает; текущие пользовательские материалы сохранены. Конкурсная заявка не отправлялась. Подробности: `agent-reports/A-qa-locales-memory-20261020.md`, `A-source-expansion-20261020.md`, `deploy/README.md`. Этот раздел имеет приоритет над историческими статусами ниже.

## Приоритетный статус · Hetzner + HTTPS · 20.10.2026

Рабочий публичный адрес: https://qettyqapp.anamai.kz/ . Изолированный `qettyq-app` на существующем Hetzner: UID10001, read-only image, отдельные `/opt/qettyq` данные/секреты/backup, лимиты ресурсов. Добавлена только A-запись нового поддомена (TTL300), отдельный proxy host и сертификат до18.01.2027. Автопродление dry-run PASS; ежедневный проверенный SQLite backup с хранением7дней включён. boostseller.kz и anamai.kz после изменений отвечают200; другие приложения/почта/доступы не перенастраивались.

AI: публичный GPT-5.5 evidence-RAG реально отвечает. Два контролируемых проверочных вызова; второй вернул2 реальных события и2 ссылки Sxodim. Сразу после них ledger резервировал $1; при итоговом чтении публичного сервиса —3completed/$1.50 из прежних $10 (17 резервов осталось на момент чтения). Дополнительный публичный запрос не приписывается контролируемому smoke. Это резервы, не фактический счёт OpenAI. Предыдущий Sites writer отключён (env revision5, PUBLIC_AI_DISABLED), пустой D1 export проверен после freeze. Прежний approval ID сохранён, первый резерв пережил пересоздание контейнера. Hosted web search выключен; неизвестный учёт расходов закрывает дальнейшие вызовы.

Данные: live Sxodim8 событий при проверке18:12UTC, отдельные80OSM snapshot POI. SQLite хранит сеансы, provenance, source permissions, кэш, hourly refresh lease и AI/routing limits. Это не полная городская афиша. События без подтверждённых координат не превращаются в маркеры. Исследованы10доноров; новые permissions/feed/media ещё не подключены. Есть evaluator интервалов работы, но текущие80POI не имеют проверенных часов. Серверная модель consent/profile/dialogue/visits готова **как фундамент**, публичная долговременная память не активирована. Гостевые сессии остаются ephemeral, история/предпочтения — локально.

UI:35/38правок выполнены, №32 частично, №15/35 зависят от прав на афиши/реальных provider-данных. Обязательные map credits оставлены. Все16E2E и300unit/integration PASS; typecheck/build/data validation PASS. Реальные production390×844: свайп, условия, персональная лента, детали события, карта и добавление в план проверены в Chrome. Физический iPhone не проверен.

Маршруты: VPS реальный FOSSGIS Foot HTTP200,492м/393.6с/17вершин между двумя публичными OSM POI; это дорожная оценка, не гарантия прохода/посещения. Другие способы не выдают фиктивные ETA.

Презентация: прежняя v8; текущий перенос не пересобирал её. Этот проход видео/YouTube/заявку не менял; параллельные пользовательские материалы сохранены без включения в deployment commit. Детали и безопасный runbook: `deploy/README.md`; отчёты источников/архитектуры/UI: `docs/agent-reports/A-{sources,rag,ui}-*20261020.md`.

Ниже — исторические статусы, не текущие блокеры.

Временный SSH-ключ после проверки удалён из root authorized_keys; digest остальных ключей совпал с исходным. Повторный вход именно этим ключом отклонён. Постоянный административный доступ агенту не оставлен.

## Актуальный контур · 20.10.2026, поздний релиз

Этот раздел заменяет устаревшие статусы ниже. Последний UI опубликован на https://qettyq-app.ablecorgi64.chatgpt.site/ . MapLibre/OpenFreeMap работает как полноэкранный фон; бюджет, дата/время и маршрутный timeline перенесены в приложение. Проверка мобильной ширины 430×932 выполнена в Chrome, не на физическом iPhone.

Живая афиша: Sxodim, до 8 ближайших подтверждённых публикаций, кэш до часа и обновление по запросу. Это не все события города. У карточек есть фактические ссылки, неизвестные цены/контакты остаются неизвестными. Без подтверждённых координат событие показывается только в афише. Сторонние постеры не копируются без прав: текущие изображения явно обозначены иллюстрациями.

D1 подключена с разрешения владельца; таблицы общего AI-бюджета и routing throttle созданы. Публичный генеративный AI НЕ активен: `OPENAI_API_KEY` отсутствует в runtime Secrets Sites (`API_KEY_MISSING`), хотя локальный ключ настроен. Выбор повторного использования ключа уже подтверждён; безопасного документированного переноса local file → Sites Secret доступные инструменты не дают. Ключ нигде не выводился. Требуется защищённый ввод владельцем в runtime Secrets, не в чат. Публичных платных вызовов в этом проходе: 0.

Подготовлен RAG по фактическим событиям, а не свободный поиск всего интернета. Дата, цена и допустимость проверяются кодом; модель получает ограниченный набор evidence и не может добавить произвольную ссылку. Общий резерв приложения — до $10, 20 невозвратных резервов по $0.50, без сброса при деплое; это не лимит всего аккаунта OpenAI. Hosted web search публично не включён.

Финальный Sites v8 опубликован, реальный public street-routing HTTP 200: 708.5 м / 567.2 с / 58 вершин. Исправлена несовместимость Cloudflare `redirect:'error'`; manual-режим не следует 3xx. Unit 261/261 и E2E 12/12 PASS. Подробности: `docs/agent-reports/A-live-release-20261020.md`.

Презентация v8 PDF/PowerPoint сохранена в `exports/`; текущий проход её не пересобирает. Видео и отправка заявки не выполнялись.

## Текущий релиз · 20.10.2026 · live-афиша и единый glass

Финал: GitHub main обновлён (`73a501c`, затем документационный follow-up). Публичный Sites v5 успешно опубликован: https://qettyq-app.ablecorgi64.chatgpt.site . Source SHA `4cbe17236ac8405852d158effb9e1f213b02624d`. Native deployment `appgdep_6ad755703754819194535ff3f5acb22b` succeeded. Production smoke: health200; events200 live/fresh,7,cachehit; новая test-session201 → chat200 с3 event cards → удаление test-session200. Старый maps-config больше не отдаёт ключ.

Site E2E 8/8 PASS. Визуально проверены 430×932,390×844,360×800: CTA/дата/цена/credit над dock. Proof: `exports/qettyq-glass-mobile.png`. LAN preview включён: `http://192.168.0.106:3000`, пока Mac и dev-процесс работают. Реальный iPhone ещё не проверен владельцем.

Этот раздел имеет приоритет над историческими контрольными точками ниже.

- Сервис: работающий Astana web pilot, 15 свайпов → условия → лента/чат/карта/профиль. Шапка и dock закреплены; прокрутка контента внутри. Общие glass tokens и лимонные активные состояния; long-form поверхности мягче для читаемости.
- Данные: 80 OSM snapshot POI плюс live `/api/events` Sxodim. Сетевой smoke вернул 7 будущих событий; почасовой кэш обновляется по запросу, без фонового cron. У всех 7 geo неизвестно: не рисуем неподтверждённые маркеры. Цена/язык/места остаются unknown, если источник не подтвердил. Некоммерческое переиспользование с обязательным credit; чужие фото не скачивались.
- AI: чат ищет реальные события через тот же кэш и места из POI; deterministic, не GPT/RAG. Локальные история/профиль; GPS не сохраняется. Durable backend-профили ещё не реализованы.
- Маршруты: оценка по прямой и внешние Google/2ГИС/Apple; дорожный routing и такси не подключены.
- Презентация: v7 PPTX/PDF, 10 слайдов. Видео не снималось, заявка не отправлялась.
- Проверки: 100 unit/integration PASS, Site E2E8/8 PASS; production smoke описан выше.
- Отчёты: `agent-reports/A1-live-afisha.md`, `A3-backend-pilot.md`, `A9-sites-port.md`, `TEST_REPORT.md`.

## Актуально · локальный web app, 20.10.2026

Этот раздел новее исторических дизайн-проходов ниже. По последнему запросу начат перенос проверенных взаимодействий в локальное приложение. Публичный Site не заменён.

- Сервис: Next.js запущен на `http://127.0.0.1:3000/`; 15 полноэкранных свайпов → условия → карусель → детали → план; четыре раздела, сохранённое, настройки и удаление с подтверждением. Карта работает на настоящих OSM-тайлах, с группировкой точек и ручным выбором старта.
- Жест: plain heart без рамки, прозрачность следует за пальцем; возврат и отпускание не ставят like. Commit только за порогом, затем индикатор обнуляется. Undo и двухшаговый ранний выход; reduced motion и клавиатура.
- AI: deterministic parsing/retrieval/explanation, не GPT и не генеративный RAG. История диалога и профиль локальные, точная геопозиция в localStorage не сохраняется.
- Данные: 80 реальных POI snapshot, не 80 событий. Live-афиша/кино не подключены. Модуль разрешённого JSON-LD импорта и исследование доноров готовы; скачивание чужих фото и обход ограничений не выполнялись.
- Маршруты: план до 5 остановок, приблизительный расчёт по прямой; дорожного routing-provider и цены такси нет. Google/Apple/2ГИС — внешняя навигация, а не встроенная Google-карта.
- Организатор: только локальный черновик, без fake eligibility, публикации и модерации.
- Презентация: новая v7, 10 слайдов PPTX/PDF; будущий RAG явно отделён от текущего поиска по правилам. Предыдущие версии сохранены.
- Видео: в этом проходе не снималось. Deploy/push: не выполнялись. Заявка: не отправлялась. Для полного обновления нужен full-stack hosting и отдельная проверка production-провайдеров.
- Проверки и ограничения: `WEBAPP_PILOT_V6.md`, `TEST_REPORT.md`; отчёты API/ингеста/презентации — `agent-reports/A3-backend-pilot.md`, `A1-event-ingestion.md`, `A9-pitch-v7.md`.

## Исторические контрольные точки

- Версия: локальный рабочий снимок, 20 октября 2026
- Режим работы среды: основной агент + изолированные рабочие роли для API, E2E и конкурсных документов
- Стек: Next.js 16, React 19, TypeScript, Zod, Motion, Vitest
- Последняя контрольная точка: G1 пройдена локально

## Реальные функции

Onboarding → ограничения → 15 визуальных карточек интересов → серверный поиск → до трёх рекомендаций → источник → выбранный план. Все 15 category illustrations созданы в единой 3:4-системе, подключены к кнопкам и горизонтальному drag-жесту. Реакции гостевой сессии идемпотентны; undo и удаление данных реализованы. Unknown-цена не превращается в ноль.

## Данные

- 80 реальных POI Астаны.
- Источник: OpenStreetMap через один ограниченный Overpass-import.
- Режим: `snapshot`, дата получения хранится в каждой записи.
- События: не подключены; команда возвращает явный `EVENT_SOURCE_UNAVAILABLE`.

## Провайдеры

- AI: OpenAI Responses adapter со строгой схемой готов, без ключа используется честный `deterministic fallback`.
- Маршруты: приблизительное пешее время по прямому расстоянию; строгий ETA не заявляется.
- Карта: не подключена.

## Проверки

- Валидация данных: 80 записей — PASS.
- Unit + integration: 18 тестов — PASS.
- Mobile E2E: 5 сценариев — PASS.
- Typecheck, lint, build, submission-check, presentation QA и secret scan — PASS; см. `docs/TEST_REPORT.md`.

## Незакрыто

- P0: разрешённый live LLM smoke, routing provider, модель событий и подключение UI к reactions API.
- Deploy: не опубликован.
- YouTube: `pending_user_upload`.
- Заявка: не отправлена.

## Материалы подачи

- `exports/QETTYQ_APP_pitch.pptx` — редактируемая презентация, 9 слайдов.
- `exports/QETTYQ_APP_pitch.pdf` — проверенный PDF, 9 страниц.
- `exports/QETTYQ_APP_submission.zip` — исходники и материалы без секретов и build-кешей.

## Визуальные экраны

- Зафиксирована инструкция генерации production UI: `design/QETTYQ_APP_SCREEN_GENERATION_INSTRUCTION.md`.
- Создан P0 prompt set: `design/QETTYQ_APP_SCREEN_PROMPTS_P0.md`.
- Сгенерировано 28 визуальных эталонов экранов в `design/generated/app-screens/`:
  первый контакт, контекст, лента, карта, детали, маршруты, помощник, память,
  источники, приватность и degraded states.
- Bootstrap, swipe-like/skip и uncertain-feed остаются code-native/derived states,
  поэтому отдельные растровые макеты им не нужны.
- PNG не являются source of truth для текста, карт или фактов; точный слой
  воспроизводится компонентами React по 44-artboard specification.
- Собрана карта переходов `design/flows/QETTYQ_UX_FLOW.svg` и локальный
  кликабельный click-flow `design/prototype/` для проверки сценариев до вёрстки.
- Локально поднят Penpot 2.18: файл `QETTYQ · Product UX Map` содержит библиотеку
  из 28 экранов и отдельную страницу `00 · UX Flow Map`.
- Все 44 artboard разложены на production-слои в
  `design/QETTYQ_44_SCREEN_LAYER_BLUEPRINT.md`; JSON-близнец содержит 44 уникальных
  экрана и точный контракт текста, иконок, media, controls и provider-слоёв.
- Зафиксирован единый Lucide icon/asset system и machine-readable manifest.
- Screen 14 пересобран кодом: 3:4 media используется только внутри hero, а header,
  context, факты, unknown, source, CTA, четыре tab и gear являются semantic DOM/SVG.

## Текущий проход · дизайн до переноса в приложение

20.10.2026 владелец остановил вёрстку и публичное обновление до согласования Penpot.

- `02 · App assembly · editable`: 44 основных native artboard + 45 «Настройки», а также 14 дополнительных вариантов колоды 05 (15 изображений вместе с основным 05). Всего 59 фреймов в просмотре.
- Все фреймы 430×932. Текст, SVG-иконки Lucide, кнопки, поверхности и иллюстрации разделены на редактируемые слои.
- `03 · UI kit · layers & states`: палитра, Manrope, состояния кнопок, размеры и порядок слоёв.
- `04 · Interest assets · 15`: отдельные изображения колоды; `05 · UX flow · four tabs`: новая карта основных сценариев.
- Созданы `design/penpot/screen-content.json`, `flow-links.json`, `board-index.json`, `UX_REVIEW.md` и экспортные previews.
- Проверка выходов текста за 59 фреймов: 0. В браузере проверены dock-переходы и gear overlay с возвратом.
- Это кликабельный дизайн-прототип. Подключение сервисов карты, AI, кино, публикации и совместного маршрута здесь не подтверждается.
- Публичный Site не обновлялся; новая версия и deployment не создавались. Презентация, видео и заявка в этом проходе не менялись.

## Актуальное уточнение · свайпы, контролы, чат и границы

- Penpot содержит147 native фреймов:45 основных схем +102 вариантов и состояний. Все15 изображений интересов — full-bleed; только undo и раскрываемый переход к условиям. Настоящий drag в Penpot отсутствует.
- Полноценный фиксированный пример чата: пустой composer →черновик →обработка →ответ с источником/карточкой →другое место; также остановка, ошибка и подтверждение нового разговора. Живой AI не запускался.
- «Для тебя» — горизонтальная карусель трёх реальных snapshot POI с собственными деталями. Это просмотр, не like/skip. Кнопка карточки больше не выступает за её contour.
- Логотипы связаны с14. Добавлены редакторы-примеры времени/бюджета/фильтров/языка/черновика, корректные списки мест, возвраты по роли карты, подтверждение удаления и предпросмотр приглашения.
- Исправлено наложение row/value на14 макетах. У15 схем карты появился настоящий clipped viewport; внутри7 областей переписки убраны обрезаемые тени;58 строк форм имеют видимые зазоры.
- Повторный native audit147:0 enabled кнопок без назначенного действия среди проверяемых control families,0 пересечений текстовых блоков,0 выходов текста. Это не тест произвольного ввода, памяти, настоящего swipe или backend.
- Отчёты и правила: `design/penpot/CONTROL_AUDIT.md`, `SURFACE_BOUNDS_AUDIT.md`, `SWIPE_BEHAVIOR.md`, `CHAT_UI_SPEC.md`, `FEED_CAROUSEL.md`. Экспорты и актуальные ссылки лежат рядом.
- Код сервиса, AI, данные и runtime-маршруты не менялись. Презентация/видео/deploy/заявка — без изменений; публичное обновление по-прежнему остановлено до согласования дизайна.
# Обновление 20.10.2026: проверка AI и презентация v8

Последующее решение владельца: разрешён публичный AI с общим бюджетом до $10. Это новое разрешение, не факт активации. Фактически публичный AI ещё выключен. Для защищённой настройки ключа по правилам Sites требуется OpenAI Developers / `openai-platform-api-key`; плагин найден, предложен, установка не подтверждена. Также нужен постоянный атомарный учёт общего бюджета: в актуальном Site `d1:null`, хранение ещё не подключено. Повторять старую локальную тестовую попытку нельзя.

Презентация v8 завершена: `exports/QETTYQ_APP_pitch_v8.pdf` и `.pptx`, 10 слайдов. Все 10 итоговых PDF-страниц просмотрены. Файлы отправлены на открытие через Codex, ответ интерфейса `queued`. Новое разрешение бюджета не выдано в презентации за уже работающий публичный AI.

Успешен один разрешённый реальный серверный тест GPT-5.5 с веб-поиском: HTTP 200, ответ с цитатой Visit Astana. На момент теста действовал запрет публичных AI-вызовов. Квота локального теста использована, повторные вызовы не разрешены автоматически. Подробности: `docs/agent-reports/A-ai-live-test-20261020.md`.

Для презентации v8 сняты фактические экраны локального приложения: карта MapLibre/OpenFreeMap, план с датой/временем и внешней навигацией, чат по каталогу, бюджет, свайпы, афиша и настройки. Скриншот чата не является доказательством AI-генерации. Файлы находятся в `exports/screenshots/v8/`. Публичный сайт этим проходом не обновлялся.
