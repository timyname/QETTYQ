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
