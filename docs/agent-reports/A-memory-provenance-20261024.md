# Memory provenance: реализация 24 октября 2026

Основание: read-only аудит `A-memory-r0-audit-20261024.md`, после отдельного разрешённого photo checkpoint. Без сети, платных провайдеров, схемы БД, ключей и деплоя. PilotApp принадлежит root; здесь только изолированный client-контракт и unit-регрессии.

## Реализовано

- `LocalChatMessage.contextOrigin`: `device | server | legacy_unknown`. Поле optional в TS для совместимости существующих call sites/fixtures; после parse оно всегда заполнено допустимым значением.
- Новые turns через `appendLocalMessage` по умолчанию `device`. Явный server/legacy origin сохраняется. Parse/save не используют device default: неизвестный, отсутствующий или повреждённый origin становится `legacy_unknown` и остаётся таким при JSON round-trip/reload.
- `isAiTransferConsentActive(consent, now?)`: только строго `active === true`, валидный expiresAt и expiresAt строго позже конечного now. Истечение TTL срабатывает без ожидания следующего обновления UI state.
- `selectChatHistory(messages, { forAI, aiTransferConsent?, now? })`: deterministic сохраняет transcript; AI без действующего отдельного ai_transfer получает только device-origin. Transcript не мутируется и не скрывается из UI. После revoke/expiry сохранённая server/legacy история не становится device.
- `inferReplyContextOrigin(selectedHistory)`: сохраняет происхождение производного ответа. Ответ локального deterministic поиска, использовавшего защищённую историю, нельзя ошибочно объявлять новым device-only контекстом и переслать позже. Для чисто device conversation возвращает device.
- Ограничения 24 сообщений на устройстве, шесть в outbound payload и 14 KiB остаются прежними. Provenance не отправляется в существующий wire DTO.

## Точное подключение root

1. В restore GET/memory `.map(...)` поставить `contextOrigin: 'server' as const`.
2. В send сначала вычислить useAI. Затем вызвать `selectChatHistory(memory.dialogue, {forAI: useAI, aiTransferConsent: serverMemory.state?.consents.ai_transfer})` **до** преобразования в role/text wire DTO.
3. Сохранить `inferReplyContextOrigin(selectedHistory)` для assistant turn; передать его в appendLocalMessage после ответа. User turn остаётся новым device.
4. Передавать выбранную history существующему boundedChatPayload, не менять ни API default, ни provider budget. Новые локальные turn продолжают multi-turn без server-memory opt-in.

Отсутствующая provenance старой версии недостоверна. Поэтому старая история остаётся видимой, но для её передачи в AI требуется отдельное согласие. Это намеренный privacy fallback, не удаление сообщений.

## Проверки

`pnpm exec vitest run tests/unit/local-memory.test.ts tests/unit/chat-memory-context.test.ts tests/unit/chat-history.test.ts tests/unit/memory-api.test.ts tests/unit/leisure-assistant-api.test.ts`: **5 файлов / 53 теста PASS**.

Регрессии включают actual JSON stringify/parse/save/load, отзыв после reload, отсутствующее/невалидное/истёкшее согласие, границу TTL, invalid clock, legacy origin, сохранение видимого transcript, два новых device-turn, производную цитату и прежние byte/message limits. Все проверки synthetic/offline; не имитируют физический iPhone или действующий VPS.

`pnpm typecheck`: **PASS**. Targeted ESLint для четырёх изменённых/new TS-файлов: **PASS**. Полный Next/E2E не запускался, интерфейс root здесь не изменялся.

## Граница гарантии

Provenance — защита штатного пути приложения, не подписанная аттестация owner-editable localStorage. Серверный ai_transfer gate остаётся обязательным для прямого чтения SQLite-контекста. Нативное сохранение cookie при kill/relaunch, cross-tab изменение согласия и серверная семантика восстановленного profile требуют отдельных проверок; этот патч их не объявляет решёнными.
