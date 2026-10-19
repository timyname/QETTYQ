# Статус QETTYQ

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
- Unit + integration: 13 тестов — PASS.
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
