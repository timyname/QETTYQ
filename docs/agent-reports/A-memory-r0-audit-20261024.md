# R0: аудит долговременной памяти — 24 октября 2026

Статус: read-only аудит реализации. Код, схема, конфигурация, ключи и runtime не изменялись. Сеть провайдеров, AI, Google, маршрутизация, деплой и физическое устройство для этого аудита не использовались. Предлагаемое исправление ещё не реализовано; нужен отдельный старт после photo checkpoint владельца.

## Изучено

- Полный `PRD.md`, `AGENTS.md`, `docs/RAG_BASELINE.md`, `docs/RAG_ADVANCEMENT_PLAN.md`.
- `src/server/memory/{contracts,http,service}.ts`, `src/server/datastore/client-memory.ts`.
- `src/server/session/{http,store}.ts`, API session/chat, `src/components/{PilotApp,MemorySettings}.tsx`, `src/components/chat-payload.ts`, `src/client/local-memory.ts`.
- `mobile/src/{native-session,native-api-transport}.ts`, локальный Swift SecureSession и установленная реализация Capacitor HTTP.
- Существующие memory API, local-memory, dialogue API, chat-history и browser-memory тесты.

## Что уже действительно работает

1. SQLite-память независима от гостевой сессии в RAM. Гостевая сессия истекает через 24 часа и не переживает рестарт сервера; клиент умеет получить новую сессию и повторить запрос. При сохранении отдельного memory cookie SQLite-профиль/диалог доступны новой сессии.
2. Только явное согласие создаёт memory identity. GET её не создаёт. Идентификатор — случайный HttpOnly/Secure/SameSite=Strict host-only cookie; в БД хранится хеш, не plaintext token. Произвольный clientId из тела не используется.
3. Согласия независимы: profile, dialogue, ai_transfer, visits; сроки 24 часа или 30 дней. Нет молчаливого RAM fallback при ошибке SQLite.
4. Сервер хранит до 24 сообщений; `readForAI` возвращает до шести только при действующем ai_transfer. Сохранённый текст считается недоверенным личным контекстом, не фактом каталога. Структурные GPS/адресные поля запрещены; текстовая редактировка координат/адресов консервативная, не универсальный PII-классификатор.
5. Отзыв scope удаляет относящиеся к нему строки; отзыв последнего и полное удаление удаляют identity и cookie. Истёкшие строки физически чистятся при старте/раз в минуту и на запросах. Бэкапы — отдельная политика, не доказательство мгновенного удаления из копий.
6. Посещения записываются только явным действием при visits consent и известной сущности. Нет автоматического слежения. Однако chat API сейчас не использует возвращаемые `saved.visits` для персонализации: обещать ранжирование по всей истории посещений нельзя.
7. Browser localStorage — отдельное хранилище предпочтений и 24 сообщений, без автоматического срока 24 часа/30 дней. Серверный TTL не удаляет автоматически локальные копии. Полное UI-удаление отдельно очищает серверную и локальную память; при серверной ошибке показывает отказ, не имитирует успех.

## P1: восстановленная история обходит отдельный AI-transfer consent

Доказанный кодовый путь:

1. `useServerMemory` получает диалог через GET `/api/memory` при dialogue consent, даже если ai_transfer отсутствует — само отображение допустимо.
2. `PilotApp` преобразует эти сообщения в общий `LocalMemory.dialogue` без отметки происхождения и сохраняет в localStorage.
3. `send()` выбирает этот общий transcript; `boundedChatPayload` включает его в AI-запрос.
4. Chat API предпочитает непустой `parsed.data.history` перед `saved.history`. `memory.readForAI` правильно отказывает без ai_transfer, но это уже не исключает скопированные сообщения из клиентской history.

Это относится и к следующему сообщению в текущем UI, и к reload с локально сохранённой копией. Отзыв ai_transfer сейчас не убирает такую копию из исходящего AI-контекста. UI-текст «отдельное разрешение использовать сохранённый контекст в AI» поэтому сильнее фактической защиты.

Offline reproduction реальными функциями `parseLocalMemory` → `boundedChatPayload`, без вызова сервера/провайдера: synthetic server-restored message после JSON round-trip получил `storedOrigin: null`, `containsRestoredServerHistory: true`, `useAI: true`.

## Минимальное полезное исправление, предложенное root

Без новой таблицы, миграции, модели и увеличения бюджета:

- `LocalChatMessage.contextOrigin`: `device | server | legacy_unknown`.
- Новые локально введённые сообщения и полученные ответы помечаются `device` в точке добавления нового turn; восстановленные GET/memory сообщения — всегда `server`.
- Parse/save сохраняют корректный origin. Отсутствующий/невалидный origin становится `legacy_unknown`, **никогда автоматически не повышается до device после reload**. Старую бес provenance историю нельзя достоверно разделить: она остаётся видимой, но её AI-transfer до отдельного согласия закрыт.
- Helper выбирает историю по `{forAI, aiTransferConsent, now}`. Для deterministic всё остаётся доступным. Для AI без действующего ai_transfer исключаются server и legacy_unknown; device-turns сохраняют обычный multi-turn.
- Согласие действительно только при `active === true` и валидном `expiresAt > now`. Неизвестный state, ошибка загрузки, истёкший срок — fail closed. Один active boolean недостаточен: UI state не обновляется каждую секунду при наступлении TTL.
- UI показывает transcript независимо от разрешения внешней передачи; отзыв не означает удаление всей локальной истории. Текущие six-message/14 KiB bounds остаются последним шагом формирования запроса.
- Это защита штатного пути приложения, не криптографическая аттестация localStorage против его владельца/DevTools. Не заявлять противоположное.

Предлагаемое владение после отдельного старта:

- Backend agent: `src/client/local-memory.ts`, новый `src/client/chat-memory-context.ts`, `tests/unit/local-memory.test.ts`, новый `tests/unit/chat-memory-context.test.ts`.
- Root: только точки restore/send в `src/components/PilotApp.tsx`; передать helper реальный ai_transfer consent, а не общий AI toggle. API/schema не меняются.
- MemorySettings остаётся без изменений, если root не запросит дополнительную поясняющую копию.

Регрессии: server → save/reload → AI с consent off; unknown/invalid provenance; expired/invalid consent; revoke после reload; active consent разрешает server-history; deterministic не теряет контекст; два новых локальных turn без server-memory consent сохраняют continuity; общие 24/6 сообщений и byte bounds не ослабляются. Отдельный UI-тест должен перехватывать `/api/chat`, а не вызывать платного провайдера.

## iPhone / Keychain: что подтверждено, что нет

- SecureSession Keychain хранит только гостевой `qettyq_session`, не долговременный memory token. Сохранённый гостевой token сам по себе не восстанавливает RAM session после рестарта сервера.
- Native transport вызывает API через Capacitor HTTP/URLSession и вручную задаёт guest-only Cookie. Установленный HTTP-плагин использует cookie jar и обработку Set-Cookie. Код не даёт доказательства, что отдельный memory cookie надёжно переживает все комбинации app kill/restart/expiry.
- Потеря memory-cookie на iPhone **не объявляется воспроизведённым дефектом**: физический тест не проводился. Не нужно расширять Keychain schema на основании предположения.
- Следующая нативная проверка: explicit grant dialogue/profile → GET подтверждает тот же профиль → kill/relaunch → GET → серверный session restart/новая гостевая session → GET → revoke/delete → relaunch без восстановления удалённого. Проверять наличие/изоляцию identity без печати токенов и без provider calls; session credentials не переносить в JS-readable storage ради удобства.

## Прочие ограничения и наблюдения

- На сервере context priority — explicit request → ephemeral session context → saved preferences. Восстановленный серверный профиль применяется UI, но сам по себе не является полным долговременным preference-aware retriever. UI locale из восстановленного profile не переключает LanguageProvider автоматически.
- Новые/текущие предпочтения и разговор не должны становиться фактом о цене, наличии мест, координатах или источнике. Р0 RAG остаётся constraint-grounded lexical retrieval; embeddings/FTS5, единый retrieval service и R1/R2 gold/trace из плана здесь не добавлялись.
- Продление scope consent не продлевает expiry уже записанных строк; это текущая семантика кода. Не обещать, что выбор нового срока автоматически перенёс все старые записи на дополнительные 30 дней.

## Фактически выполненные проверки

Команда `PATH=/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- tests/unit/memory-api.test.ts tests/unit/local-memory.test.ts tests/unit/leisure-assistant-api.test.ts tests/unit/chat-history.test.ts` у текущего runner запустила **весь** unit/integration набор: **58 файлов, 659 тестов PASS**, 11.53 s. Это не E2E, не новый регрессионный тест найденного P1 и не runtime-доказательство с iPhone/VPS. Никаких изменений проверок ради зелёного результата не сделано.

Отдельная `pnpm exec tsx -e ...` проверка использовала только реальные client parse/payload функции и synthetic строку; подтвердила наличие server-restored текста в AI payload без provenance. Новый фикс и его regression пока ожидают разрешённого checkpoint.
