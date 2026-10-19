# Статус QETTYQ

- Версия: локальный рабочий снимок, 19 октября 2026
- Режим работы среды: последовательные роли, без запуска субагентов
- Стек: Next.js 16, React 19, TypeScript, Zod, Motion, Vitest
- Последняя контрольная точка: G1 пройдена локально

## Реальные функции

Onboarding → ограничения → карточки интересов → серверный поиск → до трёх рекомендаций → источник. Реакции текущей сессии влияют на ranking. Unknown-цена не превращается в ноль.

## Данные

- 80 реальных POI Астаны.
- Источник: OpenStreetMap через один ограниченный Overpass-import.
- Режим: `snapshot`, дата получения хранится в каждой записи.
- События: не подключены; команда возвращает явный `EVENT_SOURCE_UNAVAILABLE`.

## Провайдеры

- AI: `deterministic fallback`; генеративный RAG не завершён.
- Маршруты: приблизительное пешее время по прямому расстоянию; строгий ETA не заявляется.
- Карта: не подключена.

## Проверки

- Валидация данных: 80 записей — PASS.
- Unit: 2 теста — PASS.
- Typecheck, unit, build, submission-check и browser smoke — PASS; см. `docs/TEST_REPORT.md`.

## Незакрыто

- P0: LLM/RAG, routing provider, модель событий, persistent sessions/reactions, delete-data endpoint, E2E и презентация.
- Deploy: не опубликован.
- YouTube: `pending_user_upload`.
- Заявка: не отправлена.
