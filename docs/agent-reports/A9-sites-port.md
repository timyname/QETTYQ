# A9: механический перенос локального пилота в Sites

20 октября 2026 года. Sites skill прочитан целиком. Порт выполняется в уже открытом оркестратором checkout `sites/qettyq-app-live`.

## Сделано

- `rsync -a src/ sites/qettyq-app-live/src/`
- `rsync -a data/ sites/qettyq-app-live/data/`
- `rsync -a public/assets/ sites/qettyq-app-live/public/assets/`
- `app/page.tsx` переэкспортирует `@/app/page`, выбранный через первый alias `./src/*`.
- `app/layout.tsx` переэкспортирует layout и metadata из `@/app/layout`. Стили Leaflet и локального пилота импортируются скопированным layout.
- Добавлены 10 wrapper-файлов API: catalog, chat, context, health, plans, reactions, reactions/undo, recommendations, session, session/data. Методы совпадают с root-обработчиками.
- Сохранены starter lib/auth, build-интеграция, hosting identity, .git и прежний maps-config.
- Package, lockfile, TS/Vite/Wrangler/hosting configs не менял. Native Sites, push и deploy не запускал.

## Проверки

Read-only Node проверил 12 целей wrapper-переэкспортов (page, layout и API): все TS/TSX существуют. Это структурная проверка, не сборка.

При rsync dry-run после переноса обнаружено одновременное изменение `src/components/PilotApp.module.css` в root. Оркестратор уведомлён: перед build нужен финальный sync изменённых исходников и нового events-адаптера/endpoint.

## Совместимость

- `src/server/session/store.ts` хранит Map в globalThis. В Cloudflare Workers это недолговечное состояние isolate. Нельзя выдавать за постоянную или общую между isolates базу. Browser-local память остаётся отдельной.
- `src/server/ingestion/fetch.ts` импортирует node:dns, node:net, node:https. Он не входит в текущий API-граф пилота, но будущему live events route нужен отдельный Web Fetch адаптер без этого helper.
- Копирование API не подключает внешнюю AI-модель, точный routing или event-provider автоматически.
- Будущий events endpoint должен получить отдельный app/api wrapper после появления в root.

## Точка передачи

Порт подготовлен к установке, typecheck/build и Worker smoke у оркестратора. Тесты/preview не запускались, поскольку установка зависимостей ещё выполнялась владельцем. Публичная публикация этим агентом не выполнялась.

## Дополнение после установки и live-events

После подтверждения установки оркестратором повторён rsync src/data/public-assets. В Sites попали `LiveEvents.tsx`, `LiveEvents.module.css`, новые sxodim/live-events ingestion-модули и интеграция в PilotApp. Добавлен `app/api/events/route.ts`, переэкспортирующий GET из скопированного src/app/api/events/route. Скопированы README и THIRD_PARTY_NOTICES; более позднее изменение README владельцем потребует повторного копирования.

Команда официального helper из checkout:

`node /Users/phonelab/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/build-site.mjs`

PATH содержал bundled node, override и fallback. Exit0. Vinext прошёл все пять стадий (client refs, server refs, RSC, client, SSR). Таблица маршрутов включает `/api/events` и все прежние API. Предупреждение «Some routes could not be classified» относится к статическому анализу Vinext, сборку не останавливает.

Проверены созданные `dist/server/index.js` и `dist/server/wrangler.json`: Worker main index.js, assets ../client, nodejs_compat. Финальные rsync dry-run для src/data и README/THIRD_PARTY_NOTICES не показали расхождений на момент проверки. Typecheck, Worker runtime smoke, браузер, source packaging/push и native deploy остаются за оркестратором. Конфиги и зависимости агент не редактировал.
