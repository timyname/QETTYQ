# A8 · 2ГИС MapGL adapter QA · 21 октября 2026

## Область и ограничения

Изменён только `tests/e2e/dgis-map.spec.ts` и этот отчёт. Проверен настоящий
`PilotApp → MapCanvas → DgisMapCanvas`, но SDK, конфигурация и API — явно
синтетические browser fixtures. Все внешние HTTP-запросы заблокированы, все
локальные `/api/` запросы перехвачены до навигации. Не читались секреты, не
выполнялись запросы к провайдерам, платные вызовы и проверки реальной квоты.

Playwright skill прочитан; использован существующий `@playwright/test` workflow
по прямому заданию оркестратора создать regression spec. PRD и ограничения
источников/атрибуции прочитаны. Используется Chromium 430×932, reduced motion,
не физический iPhone/Safari и не проверка реальных тайлов 2ГИС.

## Проверенные сценарии

1. Одобренная синтетическая конфигурация монтирует 2ГИС адаптер, готовность и
   тема обозначены; SDK attribution остаётся в DOM/видимым; ключ не появляется
   в видимом тексте приложения. Zoom и выбор маркера работают.
2. Click карты выбирает ручную точку старта и возвращает к прежним условиям;
   координаты доходят до запроса подборки без их выдумывания.
3. Недоступный SDK переключается на явно подписанный резервный OSM режим,
   без оставшегося ложного `data-map-engine="2gis"`.
4. Ошибка загрузки стиля делает тот же честный fallback.
5. Потеря WebGL-контекста уничтожает SDK карту и показывает fallback.
6. Без валидной дорожной геометрии нет street quality. После проверенного
   синтетического routing ответа — jade line 5px + pearl halo 9px, исходная
   стартовая координата сохранена, attribution дорожного провайдера видима.

## Выполненные команды

Локальный Next запущен на 127.0.0.1:3037 с `AI_ENABLED=false`,
`GOOGLE_PLACES_ENABLED=false`, `QETTYQ_DEPLOYMENT=local`; существующий foreign
preview 4174 не изменялся. Использован bundled Node/pnpm runtime.

```text
PORT=3037 node node_modules/@playwright/test/cli.js test tests/e2e/dgis-map.spec.ts --workers=1 --output=output/playwright/dgis-map-clean-results
6 passed (9.9s), exit 0

node node_modules/typescript/bin/tsc --noEmit
exit 0

PORT=3037 node node_modules/@playwright/test/cli.js test tests/e2e/dgis-map.spec.ts --workers=1 --output=output/playwright/dgis-map-final-results
6 passed (9.9s), exit 0 — после добавления ready/theme assertions
```

Первый дополнительный route test выявил неполный fixture routing status
(`reason:null` отсутствовал); production валидатор правильно отклонил его.
Исправлен fixture, не валидатор. Один перекрывающийся повтор использовал тот же
output directory и получил artifact ENOENT при закрытии контекста. Чистый
последовательный запуск в отдельный каталог прошёл все шесть сценариев.

Скриншот `output/playwright/dgis-map/synthetic-map-ready.png` открыт и осмотрен:
маркер, выделение, карточка, dock и контроль карты доступны. Позиция attribution
синтетического SDK не имитирует настоящее размещение copyright. Оркестратору
передано требование отдельно проверить реальную SDK attribution на live карте,
без её перекрытия карточками и без удаления обязательных логотипов.

## Не подтверждено этим отчётом

Реальная активация демоключа, права ключа/доменные ограничения, расход/срок
демоквоты, загрузка CDN/тайлов, внешний базовый стиль и физическое устройство.
Браузерный ключ технически доступен посетителю по сети — отсутствие значения
в тексте UI не является защитой секрета. Всё это в scope оркестратора/live canary.
