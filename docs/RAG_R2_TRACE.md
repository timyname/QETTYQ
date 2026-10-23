# RAG R2: техническая диагностика · 24.10.2026

Реализована минимальная локальная диагностика текущего pipeline, не скрытые рассуждения модели. Она не является завершением всех R0–R9 и не добавляет embedding-провайдера.

## Границы

- `QETTYQ_RAG_TRACE_ENABLED=true` явно включает запись в Node/VPS SQLite. По умолчанию выключено; production-флаг в этом релизе не включается. Выключенный store не создаёт таймеров и не читает/пишет строки.
- Только случайный request UUID, фиксированные версии алгоритмов, язык, outcome/mode, counts, timings, SHA256 публичных entity IDs. Session credential хранится только как namespace SHA256; raw cookie/token не записывается.
- Строгая схема запрещает query/history/GPS/адреса/URLs/свободные error/reason strings/raw provider output. В production DTO не включается внутренний trace. При успешной записи ответ содержит только `x-qettyq-trace-id`.
- Только собственная активная guest session читает `GET /api/diagnostics/rag/<UUID>`; другая получает404, без сессии401. Нет публичного списка или owner-bypass. Ответ no-store. Для диагностики после истечения гостевой сессии нужен локальный контроль сервера, не старый token.
- TTL24часа, строже предложенных в плане7дней; purge при старте и раз в минуту. Read проверяет expiry независимо от cleanup. Лимит30 записей/сессию,10000 суммарно. Request ID нельзя переписать другим payload/сессией.
- DELETE текущей сессии и успешный full-memory delete удаляют traces этой guest session. Нет постоянной связи с memory identity, поэтому удаление памяти не объявляется удалением технических traces иных guest sessions; они отдельно истекают≤24h. Бэкапы имеют прежнюю отдельную политику7дней, не мгновенное физическое стирание.
- Ошибка optional trace read/write не ломает ответ. Ошибка trace deletion возвращает503, а не ложный `deleted:true`. Additive migration совместима с прежним image; budget ledger/удалённые профили не откатываются.

## Что измерено и что не измерено

`memory` — чтение контекста; `dialogue` — разбор диалога; `retrieval` — первичный локальный поиск/источник; `generation` — последующий этап plan/retrieve/answer, Google-enrichment и запись обмена; `total` — измеренный общий промежуток. Это не отдельная provider SLA и не exhaustive stage profiler. При clarify последующая запись обмена не входит в завершённый trace.

`counts.excluded=null` означает «не наблюдается на этой границе», не0. Полный score breakdown/field-level eligibility reasons/source version hashes ещё не реализованы. Source mode/fallback unavailable различаются, но не заменяют общий source capability/expiry/revoke gate R3/R4.

Реальные tokens/cost в trace **не собираются**: явное `not_collected_use_existing_budget_ledger`, не выдуманный ноль. Существующие $0.50 reservations/idempotency/quota остаются единственным разрешением AI-вызова, tracing не резервирует деньги и не вызывает провайдера.

## Доказательства

-19 SQLite unit cases: schema/PII rejection, hash-only, restart, TTL, isolation, collision, capacity, disabled и deletion failure.
-11 API integration cases: actual handleChat clarify/success/empty/source-unavailable/throw, own/other session diagnostic access, no-store, session/memory deletion, disabled parity, защита confirmed settings и длинный переход dinner→standup без Google enrichment. Источники/AI синтетические, сеть запрещена; SQLite настоящий.
-Публичный tracing остаётся выключенным; эти проверки не выдаются за собранную аналитику пользователей. Перед его включением нужна проверка актуального privacy disclosure и назначение операционного владельца.

Следующий пакет: единый source gate, query/evidence контракт и provenance полей; затем разрешённый lexical/semantic candidate retrieval. Приоритеты — корректность hard constraints и отдельное измерение unknown/полноты поиска.
